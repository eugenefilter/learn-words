import { getDB } from '@/database/database';
import { TCard, TExample, CardRow } from '@/types/TCard';

export class CardModel {
  static readonly RATING_MIN = 0;
  static readonly RATING_MAX = 2;

  static clampRating(value: number): number {
    const safe = Number.isFinite(value) ? Math.trunc(value) : CardModel.RATING_MIN;
    return Math.min(CardModel.RATING_MAX, Math.max(CardModel.RATING_MIN, safe));
  }

  static nextRatingByAnswer(currentRating: number, isCorrect: boolean): number {
    const current = CardModel.clampRating(currentRating);
    return isCorrect
      ? CardModel.clampRating(current + 1)
      : CardModel.clampRating(current - 1);
  }

  /**
   * Возвращает карточки с примерами, с учётом пагинации.
   * @param limit  сколько записей вернуть
   * @param offset с какого смещения
   */
  static async all(limit: number = 20, offset: number = 0, dictionaryId?: number): Promise<TCard[]> {
    const db = getDB();

    const baseSql = dictionaryId
      ? 'SELECT * FROM cards WHERE dictionary_id = ? LIMIT ? OFFSET ?;'
      : 'SELECT * FROM cards LIMIT ? OFFSET ?;'

    const cardsRaw = dictionaryId
      ? await db.getAllAsync<CardRow>(baseSql, [dictionaryId, limit, offset])
      : await db.getAllAsync<CardRow>(baseSql, [limit, offset]);

    return cardsRaw.map((row) => ({ ...row, dictionaryId: row.dictionary_id, examples: [], show: false }));
  }

  static async find(text: string, dictionaryId?: number, limit: number = 20, offset: number = 0): Promise<TCard[]> {
    const db = getDB();

    const mask = `%${text}%`;
    const cardsRaw = dictionaryId
      ? await db.getAllAsync<CardRow>(
          'SELECT * FROM cards WHERE dictionary_id = ? AND (word LIKE ? COLLATE NOCASE OR translation LIKE ? COLLATE NOCASE) LIMIT ? OFFSET ?',
          [dictionaryId, mask, mask, limit, offset]
        )
      : await db.getAllAsync<CardRow>(
          'SELECT * FROM cards WHERE word LIKE ? COLLATE NOCASE OR translation LIKE ? COLLATE NOCASE LIMIT ? OFFSET ?',
          [mask, mask, limit, offset]
        );

    return (cardsRaw ?? []).map((row) => ({ ...row, dictionaryId: row.dictionary_id, examples: [], show: false }));
  }

  static async findByWord(text: string, dictionaryId?: number): Promise<TCard | null> {
    const db = getDB();

    const mask = `%${text}%`
    const result = dictionaryId
      ? await db.getFirstAsync<CardRow>('SELECT * FROM cards WHERE dictionary_id = ? AND (word LIKE ? COLLATE NOCASE OR translation LIKE ? COLLATE NOCASE)', [dictionaryId, mask, mask])
      : await db.getFirstAsync<CardRow>('SELECT * FROM cards WHERE word LIKE ? COLLATE NOCASE OR translation LIKE ? COLLATE NOCASE', [mask, mask]);
    if (!result) return null;

    const examples = await db.getAllAsync<TExample>(
      'SELECT * FROM examples WHERE card_id = ?',
      [result.id]
    );

    return {
      ...result,
      dictionaryId: result.dictionary_id,
      examples,
      show: false
    };
  }

  static async findById(id: number): Promise<TCard | null> {
    const db = getDB();

    const result = await db.getFirstAsync<CardRow>('SELECT * FROM cards WHERE id = ?', [id]);
    if (!result) return null;

    const examples = await db.getAllAsync<TExample>(
      'SELECT * FROM examples WHERE card_id = ?',
      [id]
    );

    return {
      ...result,
      dictionaryId: result.dictionary_id,
      examples,
      show: false
    };
  }

  static async delete(id: number) {
    const db = getDB();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM examples WHERE card_id = ?', [id]);
      await db.runAsync('DELETE FROM cards WHERE id = ?', [id]);
    });
  }

  static async create(word: string, translation: string, transcription: string | null, examples: string[] = [], rating: number = 0, dictionaryId: number) {
    const db = getDB();
    const normalizedRating = CardModel.clampRating(rating);
    await db.withTransactionAsync(async () => {
      const result = await db.runAsync(
        'INSERT INTO cards (word, translation, transcription, rating, dictionary_id) VALUES (?, ?, ?, ?, ?)',
        [word, translation, transcription, normalizedRating, dictionaryId]
      );
      const cardId = result.lastInsertRowId;

      for (const sentence of (examples || [])) {
        await db.runAsync(
          'INSERT INTO examples (card_id, sentence) VALUES (?, ?)',
          [cardId, sentence]
        );
      }
    });
  }

  static async update(id: number, word: string, translation: string, transcription: string | null, examples: string[] = [], rating: number = 0) {
    const db = getDB();
    const normalizedRating = CardModel.clampRating(rating);
    await db.withTransactionAsync(async () => {
      await db.runAsync('UPDATE cards SET word = ?, translation = ?, transcription = ?, rating = ? WHERE id = ?', [word, translation, transcription, normalizedRating, id]);
      await db.runAsync('DELETE FROM examples WHERE card_id = ?', [id]);
      for (const sentence of (examples || [])) {
        await db.runAsync('INSERT INTO examples (card_id, sentence) VALUES (?, ?)', [id, sentence]);
      }
    });
  }

  static async moveToDictionary(id: number, newDictionaryId: number) {
    const db = getDB();
    await db.runAsync('UPDATE cards SET dictionary_id = ? WHERE id = ?', [newDictionaryId, id]);
  }

  static async allWithExamplesByDictionary(dictionaryId: number): Promise<TCard[]> {
    const db = getDB();
    const cards = await db.getAllAsync<CardRow>('SELECT * FROM cards WHERE dictionary_id = ? ORDER BY id ASC', [dictionaryId]);
    if (cards.length === 0) return [];

    const exRows = await db.getAllAsync<TExample & { card_id: number }>(
      'SELECT id, card_id, sentence FROM examples WHERE card_id IN (SELECT id FROM cards WHERE dictionary_id = ?)',
      [dictionaryId]
    );

    const byCardId = new Map<number, TExample[]>();
    for (const ex of exRows) {
      const list = byCardId.get(ex.card_id) ?? [];
      list.push({ id: ex.id, sentence: ex.sentence });
      byCardId.set(ex.card_id, list);
    }

    return cards.map((c) => ({
      ...c,
      dictionaryId: c.dictionary_id,
      examples: byCardId.get(c.id) ?? [],
      show: false,
    }));
  }

  static async getQuizPool(dictionaryId: number): Promise<TCard[]> {
    const db = getDB();
    const rows = await db.getAllAsync<CardRow>(
      'SELECT * FROM cards WHERE dictionary_id = ? ORDER BY RANDOM()',
      [dictionaryId]
    );

    if (!rows || rows.length < 3) return [];

    return rows.map((row) => ({
      ...row,
      dictionaryId: row.dictionary_id,
      examples: [],
      show: false,
    }));
  }

  static async getWrongOptions(dictionaryId: number, excludeCardId: number, count: number = 2): Promise<string[]> {
    const db = getDB();
    const safeCount = Math.max(0, Math.trunc(count));
    if (safeCount === 0) return [];

    const rows = await db.getAllAsync<{ translation: string }>(
      `SELECT DISTINCT translation
       FROM cards
       WHERE dictionary_id = ?
         AND id <> ?
         AND translation IS NOT NULL
         AND TRIM(translation) <> ''
       ORDER BY RANDOM()
       LIMIT ?`,
      [dictionaryId, excludeCardId, safeCount]
    );

    return (rows ?? [])
      .map((r) => r.translation?.trim())
      .filter((v): v is string => !!v);
  }

  static async updateRatingAfterAnswer(cardId: number, isCorrect: boolean): Promise<number | null> {
    const db = getDB();
    let nextRating: number | null = null;

    await db.withTransactionAsync(async () => {
      const row = await db.getFirstAsync<{ rating: number | null }>(
        'SELECT rating FROM cards WHERE id = ? LIMIT 1',
        [cardId]
      );
      if (!row) {
        nextRating = null;
        return;
      }

      const currentRating = CardModel.clampRating(row.rating ?? CardModel.RATING_MIN);
      nextRating = CardModel.nextRatingByAnswer(currentRating, isCorrect);
      await db.runAsync('UPDATE cards SET rating = ? WHERE id = ?', [nextRating, cardId]);
    });

    return nextRating;
  }

  static async nextCard(currentID: number, dictionaryId?: number): Promise<TCard | null> {
    const db = getDB();
    const result = dictionaryId
      ? await db.getFirstAsync<CardRow>('SELECT * FROM cards WHERE id > ? AND dictionary_id = ? ORDER BY id ASC LIMIT 1', [currentID, dictionaryId])
      : await db.getFirstAsync<CardRow>('SELECT * FROM cards WHERE id > ? ORDER BY id ASC LIMIT 1', [currentID])
    if (!result) return null

    const examples = await db.getAllAsync<TExample>(
      'SELECT * FROM examples WHERE card_id = ?',
      [result.id]
    )

    return {
      ...result,
      dictionaryId: result.dictionary_id,
      examples,
      show: false
    }
  }

  static async prevCard(currentID: number, dictionaryId?: number): Promise<TCard | null> {
    const db = getDB()
    const result = dictionaryId
      ? await db.getFirstAsync<CardRow>('SELECT * FROM cards WHERE id < ? AND dictionary_id = ? ORDER BY id DESC LIMIT 1', [currentID, dictionaryId])
      : await db.getFirstAsync<CardRow>('SELECT * FROM cards WHERE id < ? ORDER BY id DESC LIMIT 1', [currentID])
    if (!result) return null

    const examples = await db.getAllAsync<TExample>(
      'SELECT * FROM examples WHERE card_id = ?',
      [result.id]
    )

    return {
      ...result,
      dictionaryId: result.dictionary_id,
      examples,
      show: false
    }
  }

  static async firstCard(dictionaryId?: number): Promise<TCard | null> {
    const db = getDB();
    const result = dictionaryId
      ? await db.getFirstAsync<CardRow>('SELECT * FROM cards WHERE dictionary_id = ? ORDER BY id ASC LIMIT 1', [dictionaryId])
      : await db.getFirstAsync<CardRow>('SELECT * FROM cards ORDER BY id ASC LIMIT 1');
    if (!result) return null;

    const examples = await db.getAllAsync<TExample>(
      'SELECT * FROM examples WHERE card_id = ?',
      [result.id]
    );

    return {
      ...result,
      dictionaryId: result.dictionary_id,
      examples,
      show: false,
    };
  }

  static async lastCard(dictionaryId?: number): Promise<TCard | null> {
    const db = getDB();
    const result = dictionaryId
      ? await db.getFirstAsync<CardRow>('SELECT * FROM cards WHERE dictionary_id = ? ORDER BY id DESC LIMIT 1', [dictionaryId])
      : await db.getFirstAsync<CardRow>('SELECT * FROM cards ORDER BY id DESC LIMIT 1');
    if (!result) return null;

    const examples = await db.getAllAsync<TExample>(
      'SELECT * FROM examples WHERE card_id = ?',
      [result.id]
    );

    return {
      ...result,
      dictionaryId: result.dictionary_id,
      examples,
      show: false,
    };
  }

  static async existsInDictionary(word: string, dictionaryId: number): Promise<boolean> {
    const db = getDB();
    const row = await db.getFirstAsync<{ id: number }>('SELECT id FROM cards WHERE dictionary_id = ? AND word = ? COLLATE NOCASE LIMIT 1', [dictionaryId, word]);
    return !!row;
  }

  static async existsByWordAndTranslation(word: string, translation: string, dictionaryId: number): Promise<boolean> {
    const db = getDB();
    const row = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM cards WHERE dictionary_id = ? AND word = ? COLLATE NOCASE AND translation = ? COLLATE NOCASE LIMIT 1',
      [dictionaryId, word, translation]
    );
    return !!row;
  }
}
