import { getDB } from '@/database/database';
import { TCard, TExample } from '@/types/TCard';

export class CardModel {
  static async all(): Promise<TCard[]> {
    const db = getDB();
    const cardsRaw = await db.getAllAsync<TCard>('SELECT * FROM cards');

    const cards = await Promise.all(
      cardsRaw.map(async (card) => {
        const examples = await db.getAllAsync<TExample>(
          'SELECT id, sentence FROM examples WHERE card_id = ?',
          [card.id]
        );
        return {
          ...card,
          examples
        };
      })
    );

    return cards;
  }

  static async find(id: number): Promise<TCard | null> {
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
}