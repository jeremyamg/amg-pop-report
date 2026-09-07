import type { Db, IndexDescription } from 'mongodb';

// Every index the app relies on, in one place, so a fresh database or a lost
// index is rebuilt on the next deploy instead of surfacing as a slow query.
// createIndexes is a no-op for an index that already exists with the same spec.
const INDEXES: Record<string, IndexDescription[]> = {
  items: [
    // Each side of the artist/album $or in /api/search walks one of these
    // instead of the whole collection.
    { key: { artistPopReport: 1 } },
    { key: { albumPopReport: 1 } },
    { key: { itemType: 1 } },
  ],
  search_logs: [
    // Every analytics query filters on itemType and sorts or ranges on timestamp.
    { key: { itemType: 1, timestamp: -1 } },
    // Search-log dedup: one row per term, item type, and 5-second bucket.
    // Unique, so two concurrent requests cannot both insert a row for the same
    // window; partial, so rows written before `bucket` existed are not all
    // treated as duplicates of one another.
    {
      key: { searchTerm: 1, itemType: 1, bucket: 1 },
      name: 'search_dedup',
      unique: true,
      partialFilterExpression: { bucket: { $exists: true } },
    },
  ],
};

let ensured: Promise<void> | null = null;

/**
 * Create any missing index. Runs once per process; a failure is logged and
 * retried on the next call rather than taking the app down, since every
 * route still works (more slowly) without them.
 */
export function ensureIndexes(db: Db): Promise<void> {
  if (!ensured) {
    ensured = Promise.all(
      Object.entries(INDEXES).map(([collection, specs]) => db.collection(collection).createIndexes(specs))
    )
      .then(() => undefined)
      .catch(error => {
        ensured = null;
        console.error('Index setup failed; will retry on the next request:', error);
      });
  }
  return ensured;
}
