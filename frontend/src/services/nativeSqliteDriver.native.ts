/**
 * Native SQLite driver for React Native (iOS & Android).
 * Uses expo-sqlite for durable, ACID-compliant local offline storage.
 */
export async function getNativeSQLiteDb(): Promise<unknown> {
  try {
    const SQLite = await import('expo-sqlite');
    if (SQLite && SQLite.openDatabaseSync) {
      const db = SQLite.openDatabaseSync('lifelens_offline.db');
      const nativeDb = db as { execSync: (sql: string) => void };
      nativeDb.execSync(`
        CREATE TABLE IF NOT EXISTS sync_outbox (
          id TEXT PRIMARY KEY,
          endpoint TEXT NOT NULL,
          method TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          status TEXT NOT NULL,
          retry_count INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          last_error TEXT,
          user_id TEXT
        );
        CREATE TABLE IF NOT EXISTS offline_cache (
          key TEXT PRIMARY KEY,
          entity_type TEXT NOT NULL,
          data_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      // Migrate outboxes created before user scoping was added.
      try {
        nativeDb.execSync('ALTER TABLE sync_outbox ADD COLUMN user_id TEXT');
      } catch {
        // Column already exists
      }
      return db;
    }
  } catch {
    return null;
  }
  return null;
}

