import { MongoClient } from 'mongodb';
import { ensureIndexes } from './indexes';

export const DB_NAME = 'grading_db';

type Cache = { _mongoClientPromise?: Promise<MongoClient> };

// In development Next.js re-evaluates this module on every hot reload; keeping
// the promise on the global object stops each reload from opening another
// connection pool. In production a module-level object lives as long as the
// process, which is all that is needed.
const cache: Cache = process.env.NODE_ENV === 'development' ? (global as typeof globalThis & Cache) : {};

function getClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Please add your MongoDB URI to .env.local');
  }

  if (!cache._mongoClientPromise) {
    const pending = new MongoClient(uri).connect().then(async client => {
      await ensureIndexes(client.db(DB_NAME));
      return client;
    });

    // A failed connection must not be cached, or every request until the next
    // process restart fails with it. Drop it so the next caller reconnects.
    pending.catch(() => {
      if (cache._mongoClientPromise === pending) cache._mongoClientPromise = undefined;
    });

    cache._mongoClientPromise = pending;
  }

  return cache._mongoClientPromise;
}

export default getClient;
