import { getDB } from '@/database/database';
import { TCard, TExample } from '@/types/TCard';

export class CardModel {

  /**
   * Возвращает карточки с примерами, с учётом пагинации.
   * @param limit  сколько записей вернуть
   * @param offset с какого смещения
   */
  static async all(limit: number = 20, offset: number = 0, dictionaryId?: number): Promise<TCard[]> {
    const db = getDB(); // теперь синхронно

    // Получаем сами карточки
    const baseSql = dictionaryId
      ? 'SELECT * FROM cards WHERE dictionary_id = ? LIMIT ? OFFSET ?;'
      : 'SELECT * FROM cards LIMIT ? OFFSET ?;'

    const cardsRaw = dictionaryId
      ? await db.getAllAsync<any>(baseSql, [dictionaryId, limit, offset])
      : await db.getAllAsync<any>(baseSql, [limit, offset]);

    // Для каждой карточки находим её примеры
    // const cardsWithExamples = await Promise.all(
    //   cardsRaw.map(async (card) => {
    //     const examples = await db.getAllAsync<TExample>(
    //       'SELECT id, sentence FROM examples WHERE card_id = ?;',
    //       [card.id],
    //     );
    //     return {
    //       ...card,
    //       examples,
    //     };
    //   })
    // );

    return cardsRaw;
  }

  static async find(text: string, dictionaryId?: number): Promise<TCard[] | []> {
    const db = getDB();

    // Используем маску и поиск по word/translation без учета регистра
    const mask = `%${text}%`;
    const cardsRaw = dictionaryId
      ? await db.getAllAsync<any>(
          'SELECT * FROM cards WHERE dictionary_id = ? AND (word LIKE ? COLLATE NOCASE OR translation LIKE ? COLLATE NOCASE)',
          [dictionaryId, mask, mask]
        )
      : await db.getAllAsync<any>(
          'SELECT * FROM cards WHERE word LIKE ? COLLATE NOCASE OR translation LIKE ? COLLATE NOCASE',
          [mask, mask]
        );

    if (!cardsRaw) return [];

    return cardsRaw;
  }

  static async findByWord(text: string, dictionaryId?: number): Promise<TCard | null> {
    const db = getDB();

    const mask = `%${text}%`
    const result = dictionaryId
      ? await db.getFirstAsync<any>('SELECT * FROM cards WHERE dictionary_id = ? AND (word LIKE ? COLLATE NOCASE OR translation LIKE ? COLLATE NOCASE)', [dictionaryId, mask, mask])
      : await db.getFirstAsync<any>('SELECT * FROM cards WHERE word LIKE ? COLLATE NOCASE OR translation LIKE ? COLLATE NOCASE', [mask, mask]);
    if (!result) return null;

    const examples = await db.getAllAsync<TExample>(
      'SELECT * FROM examples WHERE card_id = ?',
      [result.id]
    );
  
    return {
      ...result,
      dictionaryId: (result as any).dictionary_id,
      examples,
      show: false
    };
  }

  static async findById(id: number): Promise<TCard | null> {
    const db = getDB();

    const result = await db.getFirstAsync<TCard>('SELECT * FROM cards WHERE id = ?', [id]);
    if (!result) return null;
  
    const examples = await db.getAllAsync<TExample>(
      'SELECT * FROM examples WHERE card_id = ?',
      [id]
    );
  
    return {
      ...result,
      dictionaryId: (result as any).dictionary_id,
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
    await db.withTransactionAsync(async () => {
      const result = await db.runAsync(
        'INSERT INTO cards (word, translation, transcription, rating, dictionary_id) VALUES (?, ?, ?, ?, ?)',
        [word, translation, transcription, rating, dictionaryId]
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
    await db.withTransactionAsync(async () => {
      await db.runAsync('UPDATE cards SET word = ?, translation = ?, transcription = ?, rating = ? WHERE id = ?', [word, translation, transcription, rating, id]);
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
    const cards = await db.getAllAsync<any>('SELECT * FROM cards WHERE dictionary_id = ? ORDER BY id ASC', [dictionaryId]);
    const result: TCard[] = [];
    for (const c of cards) {
      const examples = await db.getAllAsync<any>('SELECT id, sentence FROM examples WHERE card_id = ?', [c.id]);
      result.push({ ...c, dictionaryId: c.dictionary_id, examples, show: false });
    }
    return result;
  }

  static async nextCard(currentID: number, dictionaryId?: number): Promise<TCard | null> {
    const db = getDB();
    const result = dictionaryId
      ? await db.getFirstAsync<any>('SELECT * FROM cards WHERE id > ? AND dictionary_id = ? ORDER BY id ASC LIMIT 1', [currentID, dictionaryId])
      : await db.getFirstAsync<any>('SELECT * FROM cards WHERE id > ? ORDER BY id ASC LIMIT 1', [currentID])
    if (!result) return null
  
    const examples = await db.getAllAsync<TExample>(
      'SELECT * FROM examples WHERE card_id = ?',
      [result.id]
    )
  
    return {
      ...result,
      dictionaryId: (result as any).dictionary_id,
      examples,
      show: false
    }
  }

  static async prevCard(currentID: number, dictionaryId?: number): Promise<TCard | null> {
    const db = getDB()
    const result = dictionaryId
      ? await db.getFirstAsync<any>('SELECT * FROM cards WHERE id < ? AND dictionary_id = ? ORDER BY id DESC LIMIT 1', [currentID, dictionaryId])
      : await db.getFirstAsync<any>('SELECT * FROM cards WHERE id < ? ORDER BY id DESC LIMIT 1', [currentID])
    if (!result) return null
  
    const examples = await db.getAllAsync<TExample>(
      'SELECT * FROM examples WHERE card_id = ?',
      [result.id]
    )
  
    return {
      ...result,
      dictionaryId: (result as any).dictionary_id,
      examples,
      show: false
    }
  }

  static async firstCard(dictionaryId?: number): Promise<TCard | null> {
    const db = getDB();
    const result = dictionaryId
      ? await db.getFirstAsync<any>('SELECT * FROM cards WHERE dictionary_id = ? ORDER BY id ASC LIMIT 1', [dictionaryId])
      : await db.getFirstAsync<any>('SELECT * FROM cards ORDER BY id ASC LIMIT 1');
    if (!result) return null;

    const examples = await db.getAllAsync<TExample>(
      'SELECT * FROM examples WHERE card_id = ?',
      [result.id]
    );

    return {
      ...result,
      dictionaryId: (result as any).dictionary_id,
      examples,
      show: false,
    };
  }

  static async lastCard(dictionaryId?: number): Promise<TCard | null> {
    const db = getDB();
    const result = dictionaryId
      ? await db.getFirstAsync<any>('SELECT * FROM cards WHERE dictionary_id = ? ORDER BY id DESC LIMIT 1', [dictionaryId])
      : await db.getFirstAsync<any>('SELECT * FROM cards ORDER BY id DESC LIMIT 1');
    if (!result) return null;

    const examples = await db.getAllAsync<TExample>(
      'SELECT * FROM examples WHERE card_id = ?',
      [result.id]
    );

    return {
      ...result,
      dictionaryId: (result as any).dictionary_id,
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
