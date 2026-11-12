/**
 * Fallback SQLite driver for Web and Node.js runtimes.
 * Returns null to trigger transparent AsyncStorage offline outbox fallback.
 */
export async function getNativeSQLiteDb(): Promise<unknown> {
  return null;
}

