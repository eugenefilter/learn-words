import { getDB } from '@/database/database';
import { TDictionary } from '@/types/TDictionary';

export class DictionaryModel {
  static async allByLanguage(languageId: number): Promise<TDictionary[]> {
    const db = getDB();
    const rows = await db.getAllAsync<{
      id: number; language_id: number; name: string; color?: string | null; sort_order?: number | null; created_at?: string;
      cards_count?: number;
    }>(
      `SELECT d.*, (
        SELECT COUNT(*) FROM cards c WHERE c.dictionary_id = d.id
      ) AS cards_count
       FROM dictionaries d WHERE d.language_id = ? ORDER BY d.sort_order ASC, d.name ASC`,
      [languageId]
    );
    return (rows ?? []).map(r => ({
      id: r.id,
      languageId: r.language_id,
      name: r.name,
      color: r.color ?? null,
      sortOrder: r.sort_order ?? 0,
      created_at: r.created_at,
      cardsCount: (r as any).cards_count ?? 0,
    }));
  }

  static async findById(id: number): Promise<TDictionary | null> {
    const db = getDB();
    const row = await db.getFirstAsync<{ id: number; language_id: number; name: string; color?: string | null; sort_order?: number | null; created_at?: string }>('SELECT * FROM dictionaries WHERE id = ?', [id]);
    if (!row) return null;
    return {
      id: row.id,
      languageId: row.language_id,
      name: row.name,
      color: row.color ?? null,
      sortOrder: row.sort_order ?? 0,
      created_at: row.created_at,
    };
  }

  static async create(languageId: number, name: string, color?: string | null, sortOrder: number = 0): Promise<number> {
    const db = getDB();
    const res = await db.runAsync('INSERT INTO dictionaries (language_id, name, color, sort_order) VALUES (?, ?, ?, ?)', [languageId, name, color ?? null, sortOrder]);
    return res.lastInsertRowId as number;
  }

  static async update(id: number, name: string, color?: string | null, sortOrder?: number | null): Promise<void> {
    const db = getDB();
    await db.runAsync('UPDATE dictionaries SET name = ?, color = ?, sort_order = COALESCE(?, sort_order) WHERE id = ?', [name, color ?? null, sortOrder, id]);
  }

  static async delete(id: number): Promise<void> {
    const db = getDB();
    await db.runAsync('DELETE FROM dictionaries WHERE id = ?', [id]);
  }

  static async firstOrCreateDefaultForLanguage(languageId: number): Promise<number> {
    const db = getDB();
    const existing = await db.getFirstAsync<{ id: number }>('SELECT id FROM dictionaries WHERE language_id = ? AND name = ? LIMIT 1', [languageId, 'Default']);
    if (existing?.id) return existing.id;
    const res = await db.runAsync('INSERT INTO dictionaries (language_id, name, sort_order) VALUES (?, ?, ?)', [languageId, 'Default', 0]);
    return res.lastInsertRowId as number;
  }

  static async moveAllCards(sourceDictionaryId: number, targetDictionaryId: number): Promise<void> {
    const db = getDB();
    await db.runAsync('UPDATE cards SET dictionary_id = ? WHERE dictionary_id = ?', [targetDictionaryId, sourceDictionaryId]);
  }

  static async deleteWithCards(dictionaryId: number): Promise<void> {
    const db = getDB();
    // Удалим карточки явно, чтобы примеры каскадно удалились
    await db.runAsync('DELETE FROM cards WHERE dictionary_id = ?', [dictionaryId]);
    await db.runAsync('DELETE FROM dictionaries WHERE id = ?', [dictionaryId]);
  }
}
