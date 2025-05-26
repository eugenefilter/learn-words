import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase;

export const initDatabase = async (): Promise<void> => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('vocabcards.db');

    await db.withTransactionAsync(async () => {
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS cards (
          id INTEGER PRIMARY KEY AUTOINCREMENT, 
          word TEXT NOT NULL, 
          translation TEXT NOT NULL, 
          explanation TEXT, 
          transcription TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`
      );

      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS examples (
          id INTEGER PRIMARY KEY AUTOINCREMENT, 
          card_id INTEGER NOT NULL, 
          sentence TEXT NOT NULL, 
          FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE);`
      );
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