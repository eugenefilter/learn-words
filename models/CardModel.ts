import { getDB } from '@/database/database';
import { TCard, TExample } from '@/types/TCard';

export class CardModel {

  /**
   * Возвращает карточки с примерами, с учётом пагинации.
   * @param limit  сколько записей вернуть
   * @param offset с какого смещения
   */
  static async all(limit: number = 20, offset: number = 0): Promise<TCard[]> {
    const db = getDB(); // теперь синхронно

    // Получаем сами карточки
    const cardsRaw = await db.getAllAsync<TCard>(
      'SELECT * FROM cards LIMIT ? OFFSET ?;',
      [limit, offset],
    );

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

  static async find(text: string): Promise<TCard[] | []> {
    const db = getDB();

    // Используем маску и поиск по word/translation без учета регистра
    const mask = `%${text}%`;
    const cardsRaw = await db.getAllAsync<TCard>(
      'SELECT * FROM cards WHERE word LIKE ? COLLATE NOCASE OR translation LIKE ? COLLATE NOCASE',
      [mask, mask]
    );

    if (!cardsRaw) return [];

    return cardsRaw;
  }

  static async findByWord(text: string): Promise<TCard | null> {
    const db = getDB();

    const mask = `%${text}%`
    const result = await db.getFirstAsync<TCard>('SELECT * FROM cards WHERE word LIKE ? COLLATE NOCASE OR translation LIKE ? COLLATE NOCASE', [mask, mask]);
    if (!result) return null;

    const examples = await db.getAllAsync<TExample>(
      'SELECT * FROM examples WHERE card_id = ?',
      [result.id]
    );
  
    return {
      ...result,
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

  static async create(word: string, translation: string, examples: string[]) {
    const db = getDB();
    await db.withTransactionAsync(async () => {
      const result = await db.runAsync(
        'INSERT INTO cards (word, translation) VALUES (?, ?)',
        [word, translation]
      );
      const cardId = result.lastInsertRowId;

      for (const sentence of examples) {
        await db.runAsync(
          'INSERT INTO examples (card_id, sentence) VALUES (?, ?)',
          [cardId, sentence]
        );
      }
    });
  }

  static async update(id: number, word: string, translation: string, examples: string[]) {
    const db = getDB();
    await db.withTransactionAsync(async () => {
      await db.runAsync('UPDATE cards SET word = ?, translation = ? WHERE id = ?', [word, translation, id]);
      await db.runAsync('DELETE FROM examples WHERE card_id = ?', [id]);
      for (const sentence of examples) {
        await db.runAsync('INSERT INTO examples (card_id, sentence) VALUES (?, ?)', [id, sentence]);
      }
    });
  }

  static async nextCard(currentID: number): Promise<TCard | null> {
    const db = getDB();

    const result = await db.getFirstAsync<TCard>('SELECT * FROM cards WHERE id > ? ORDER BY id ASC LIMIT 1', [currentID])
    if (!result) return null
  
    const examples = await db.getAllAsync<TExample>(
      'SELECT * FROM examples WHERE card_id = ?',
      [result.id]
    )
  
    return {
      ...result,
      examples,
      show: false
    }
  }

  static async prevCard(currentID: number): Promise<TCard | null> {
    const db = getDB()

    const result = await db.getFirstAsync<TCard>('SELECT * FROM cards WHERE id < ? ORDER BY id DESC LIMIT 1', [currentID])
    if (!result) return null
  
    const examples = await db.getAllAsync<TExample>(
      'SELECT * FROM examples WHERE card_id = ?',
      [result.id]
    )
  
    return {
      ...result,
      examples,
      show: false
    }
  }

  static async firstCard(): Promise<TCard | null> {
    const db = getDB();
    const result = await db.getFirstAsync<TCard>('SELECT * FROM cards ORDER BY id ASC LIMIT 1');
    if (!result) return null;

    const examples = await db.getAllAsync<TExample>(
      'SELECT * FROM examples WHERE card_id = ?',
      [result.id]
    );

    return {
      ...result,
      examples,
      show: false,
    };
  }

  static async lastCard(): Promise<TCard | null> {
    const db = getDB();
    const result = await db.getFirstAsync<TCard>('SELECT * FROM cards ORDER BY id DESC LIMIT 1');
    if (!result) return null;

    const examples = await db.getAllAsync<TExample>(
      'SELECT * FROM examples WHERE card_id = ?',
      [result.id]
    );

    return {
      ...result,
      examples,
      show: false,
    };
  }
}
