import * as SQLite from 'expo-sqlite';

const DB_NAME = 'vocabcards.db';
let db: SQLite.SQLiteDatabase | null = null;

const isReleasedObjectError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('already released') || msg.includes('nativestatement');
};

const getOrOpenDb = (): SQLite.SQLiteDatabase => {
  if (!db) {
    db = SQLite.openDatabaseSync(DB_NAME);
  }
  return db;
};

const runMigrations = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  await database.withTransactionAsync(async () => {
    // Core tables
    await database.execAsync(
      `CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        word TEXT NOT NULL, 
        translation TEXT NOT NULL, 
        explanation TEXT, 
        transcription TEXT,
        rating INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`
    );

    await database.execAsync(
      `CREATE TABLE IF NOT EXISTS examples (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        card_id INTEGER NOT NULL, 
        sentence TEXT NOT NULL, 
        FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE);`
    );

    // Мягкая миграция: если таблица cards создана по старой схеме,
    // пытаемся добавить недостающие колонки. Ошибки игнорируем.
    try { await database.execAsync('ALTER TABLE cards ADD COLUMN explanation TEXT;'); } catch {}
    try { await database.execAsync('ALTER TABLE cards ADD COLUMN transcription TEXT;'); } catch {}
    try { await database.execAsync('ALTER TABLE cards ADD COLUMN rating INTEGER DEFAULT 0;'); } catch {}
    // Инициализация рейтинга для существующих записей
    try { await database.execAsync('UPDATE cards SET rating = 0 WHERE rating IS NULL;'); } catch {}

    // New: multi-language and dictionaries
    await database.execAsync(
      `CREATE TABLE IF NOT EXISTS languages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        code TEXT,
        icon TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`
    );

    await database.execAsync(
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
    try { await database.execAsync('ALTER TABLE cards ADD COLUMN dictionary_id INTEGER;'); } catch {}

    // Ensure default language and dictionary exist
    // 1) Find or create default language (English, code 'en')
    const defaultLang = await database.getFirstAsync<{ id: number }>(
      'SELECT id FROM languages WHERE name = ? OR code = ? LIMIT 1',
      ['English', 'en']
    );
    let langId = defaultLang?.id;
    if (!langId) {
      const res = await database.runAsync('INSERT INTO languages (name, code) VALUES (?, ?)', ['English', 'en']);
      langId = res.lastInsertRowId as number;
    }

    // 2) Find or create default dictionary for that language
    const defaultDict = await database.getFirstAsync<{ id: number }>(
      'SELECT id FROM dictionaries WHERE language_id = ? AND name = ? LIMIT 1',
      [langId, 'Default']
    );
    let dictId = defaultDict?.id;
    if (!dictId) {
      const res = await database.runAsync('INSERT INTO dictionaries (language_id, name, sort_order) VALUES (?, ?, ?)', [langId, 'Default', 0]);
      dictId = res.lastInsertRowId as number;
    }

    // 3) Backfill existing cards to default dictionary
    try { await database.runAsync('UPDATE cards SET dictionary_id = ? WHERE dictionary_id IS NULL', [dictId]); } catch {}

    // Indices to improve lookup
    try { await database.execAsync('CREATE INDEX IF NOT EXISTS idx_cards_dictionary ON cards(dictionary_id);'); } catch {}
    try { await database.execAsync('CREATE INDEX IF NOT EXISTS idx_cards_word ON cards(dictionary_id, word COLLATE NOCASE);'); } catch {}
    try { await database.execAsync('CREATE INDEX IF NOT EXISTS idx_examples_card_id ON examples(card_id);'); } catch {}
  });
};

export const initDatabase = async (): Promise<void> => {
  let database = getOrOpenDb();
  try {
    await runMigrations(database);
  } catch (error) {
    if (!isReleasedObjectError(error)) throw error;
    // SDK 54 + Fast Refresh can leave a stale released DB object in memory.
    // Reopen once and retry migrations.
    db = SQLite.openDatabaseSync(DB_NAME);
    database = db;
    await runMigrations(database);
  }
};

/**
 * Возвращает уже открытое соединение.
 * Если initDatabase не вызывали — кидает ошибку.
 */
export const getDB = (): SQLite.SQLiteDatabase => {
  return getOrOpenDb();
}
