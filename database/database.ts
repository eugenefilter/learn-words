import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase;

export const initDatabase = async (): Promise<void> => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('vocabcards.db');

    await db.withTransactionAsync(async () => {
      // Core tables
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS cards (
          id INTEGER PRIMARY KEY AUTOINCREMENT, 
          word TEXT NOT NULL, 
          translation TEXT NOT NULL, 
          explanation TEXT, 
          transcription TEXT,
          rating INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`
      );

      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS examples (
          id INTEGER PRIMARY KEY AUTOINCREMENT, 
          card_id INTEGER NOT NULL, 
          sentence TEXT NOT NULL, 
          FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE);`
      );

      // Мягкая миграция: если таблица cards создана по старой схеме,
      // пытаемся добавить недостающие колонки. Ошибки игнорируем.
      try { await db.execAsync('ALTER TABLE cards ADD COLUMN explanation TEXT;'); } catch {}
      try { await db.execAsync('ALTER TABLE cards ADD COLUMN transcription TEXT;'); } catch {}
      try { await db.execAsync('ALTER TABLE cards ADD COLUMN rating INTEGER DEFAULT 0;'); } catch {}
      // Инициализация рейтинга для существующих записей
      try { await db.execAsync('UPDATE cards SET rating = 0 WHERE rating IS NULL;'); } catch {}

      // New: multi-language and dictionaries
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS languages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          code TEXT,
          icon TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`
      );

      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS dictionaries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          language_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          color TEXT,
          sort_order INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(language_id) REFERENCES languages(id) ON DELETE CASCADE
        );`
      );

      // Add dictionary_id to cards if missing
      try { await db.execAsync('ALTER TABLE cards ADD COLUMN dictionary_id INTEGER;'); } catch {}

      // Ensure default language and dictionary exist
      // 1) Find or create default language (English, code 'en')
      const defaultLang = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM languages WHERE name = ? OR code = ? LIMIT 1',
        ['English', 'en']
      );
      let langId = defaultLang?.id;
      if (!langId) {
        const res = await db.runAsync('INSERT INTO languages (name, code) VALUES (?, ?)', ['English', 'en']);
        langId = res.lastInsertRowId as number;
      }

      // 2) Find or create default dictionary for that language
      const defaultDict = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM dictionaries WHERE language_id = ? AND name = ? LIMIT 1',
        [langId, 'Default']
      );
      let dictId = defaultDict?.id;
      if (!dictId) {
        const res = await db.runAsync('INSERT INTO dictionaries (language_id, name, sort_order) VALUES (?, ?, ?)', [langId, 'Default', 0]);
        dictId = res.lastInsertRowId as number;
      }

      // 3) Backfill existing cards to default dictionary
      try { await db.execAsync(`UPDATE cards SET dictionary_id = ${dictId} WHERE dictionary_id IS NULL;`); } catch {}

      // Indices to improve lookup
      try { await db.execAsync('CREATE INDEX IF NOT EXISTS idx_cards_dictionary ON cards(dictionary_id);'); } catch {}
      try { await db.execAsync('CREATE INDEX IF NOT EXISTS idx_cards_word ON cards(dictionary_id, word COLLATE NOCASE);'); } catch {}
      try { await db.execAsync('CREATE INDEX IF NOT EXISTS idx_examples_card_id ON examples(card_id);'); } catch {}
    });
  }
};

/**
 * Возвращает уже открытое соединение.
 * Если initDatabase не вызывали — кидает ошибку.
 */
export const getDB = (): SQLite.SQLiteDatabase => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}
