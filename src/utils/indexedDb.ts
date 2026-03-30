/**
 * Thin Promise wrapper for IndexedDB.
 * Database: grain-intel-historical
 *
 * Object stores: weather-history, price-history, cash-prices, fetch-metadata
 */

const DB_NAME = 'grain-intel-historical';
const DB_VERSION = 1;

const STORES = {
  weatherHistory: 'weather-history',
  priceHistory: 'price-history',
  cashPrices: 'cash-prices',
  fetchMetadata: 'fetch-metadata',
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.weatherHistory)) {
        const ws = db.createObjectStore(STORES.weatherHistory, { keyPath: 'id' });
        ws.createIndex('by-location', 'locationKey');
        ws.createIndex('by-date', 'date');
      }
      if (!db.objectStoreNames.contains(STORES.priceHistory)) {
        const ps = db.createObjectStore(STORES.priceHistory, { keyPath: 'id' });
        ps.createIndex('by-symbol', 'symbol');
        ps.createIndex('by-date', 'date');
      }
      if (!db.objectStoreNames.contains(STORES.cashPrices)) {
        const cp = db.createObjectStore(STORES.cashPrices, { keyPath: 'id' });
        cp.createIndex('by-commodity', 'commodity');
        cp.createIndex('by-date', 'date');
      }
      if (!db.objectStoreNames.contains(STORES.fetchMetadata)) {
        db.createObjectStore(STORES.fetchMetadata, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) dbPromise = openDb();
  return dbPromise;
}

export async function put<T extends Record<string, unknown>>(store: StoreName, item: T): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function putBatch<T extends Record<string, unknown>>(store: StoreName, items: T[]): Promise<void> {
  if (items.length === 0) return;
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    for (const item of items) os.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function get<T>(store: StoreName, key: string): Promise<T | undefined> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function getByIndex<T>(store: StoreName, indexName: string, key: string): Promise<T[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const index = tx.objectStore(store).index(indexName);
    const req = index.getAll(key);
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getByDateRange<T>(
  store: StoreName,
  indexName: string,
  lower: string,
  upper: string,
): Promise<T[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const index = tx.objectStore(store).index(indexName);
    const range = IDBKeyRange.bound(lower, upper);
    const req = index.getAll(range);
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function clearStore(store: StoreName): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Check if IndexedDB is available (Safari private browsing blocks it) */
export async function isAvailable(): Promise<boolean> {
  try {
    await getDb();
    return true;
  } catch {
    return false;
  }
}

export { STORES };
