import { getDB } from '@/database/database';
import { TLanguage } from '@/types/TLanguage';

export class LanguageModel {
  static async all(): Promise<TLanguage[]> {
    const db = getDB();
    const rows = await db.getAllAsync<TLanguage>('SELECT id, name, code, icon, created_at FROM languages ORDER BY name ASC');
    return rows ?? [];
  }

  static async findById(id: number): Promise<TLanguage | null> {
    const db = getDB();
    const row = await db.getFirstAsync<TLanguage>('SELECT id, name, code, icon, created_at FROM languages WHERE id = ?', [id]);
    return row ?? null;
  }

  static async create(name: string, code?: string | null, icon?: string | null): Promise<number> {
    const db = getDB();
    const res = await db.runAsync('INSERT INTO languages (name, code, icon) VALUES (?, ?, ?)', [name, code ?? null, icon ?? null]);
    return res.lastInsertRowId as number;
  }

  static async update(id: number, name: string, code?: string | null, icon?: string | null): Promise<void> {
    const db = getDB();
    await db.runAsync('UPDATE languages SET name = ?, code = ?, icon = ? WHERE id = ?', [name, code ?? null, icon ?? null, id]);
  }

  static async delete(id: number): Promise<void> {
    const db = getDB();
    await db.runAsync('DELETE FROM languages WHERE id = ?', [id]);
  }

  static async firstOrCreateDefault(): Promise<number> {
    const db = getDB();
    const existing = await db.getFirstAsync<{ id: number }>('SELECT id FROM languages WHERE name = ? OR code = ? LIMIT 1', ['English', 'en']);
    if (existing?.id) return existing.id;
    const res = await db.runAsync('INSERT INTO languages (name, code) VALUES (?, ?)', ['English', 'en']);
    return res.lastInsertRowId as number;
  }
}

