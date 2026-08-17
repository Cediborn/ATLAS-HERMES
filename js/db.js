// Atlas — IndexedDB wrapper.
//
// The single persistence primitive for the whole app. Every module's data
// lives in one database (`atlas-db`) across named object stores, and every
// record carries a `workspaceId` so workspaces are real data scopes, not a
// renamed label.
//
// The app never reads/writes these stores directly from views — js/persistence.js
// owns hydration (DB → in-memory arrays) and write-through (arrays → DB). This
// file is deliberately small and dependency-free so a future backend adapter
// (tRPC/Postgres per the Foundation doc) can replace it without touching views.

export const DB_NAME = 'atlas-db';
export const DB_VERSION = 1;

export const STORES = [
  'projects', // project records carry their own tasks array — no join needed
  'events',
  'notes',
  'habits',
  'habitCompletions',
  'goals',
  'resources',
  'transactions',
  'books',
  'codingItems',
  'codingSessions',
  'meta',
];

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('meta')) {
        const meta = db.createObjectStore('meta', { keyPath: 'key' });
        meta.createIndex('workspaceId', 'workspaceId');
      }
      for (const name of STORES) {
        if (name === 'meta') continue;
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: 'id' });
          store.createIndex('workspaceId', 'workspaceId');
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB upgrade blocked — close other Atlas tabs and reload.'));
  });
  return dbPromise;
}

function requestToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAll(storeName) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readonly');
  return requestToPromise(tx.objectStore(storeName).getAll());
}

// Fetch only the records belonging to one workspace.
export async function getAllByWorkspace(storeName, workspaceId) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readonly');
  const index = tx.objectStore(storeName).index('workspaceId');
  return requestToPromise(index.getAll(workspaceId));
}

export async function get(storeName, id) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readonly');
  return requestToPromise(tx.objectStore(storeName).get(id));
}

export async function put(storeName, item) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).put(item);
  return requestToPromise(tx.objectStore(storeName).get(item.id));
}

// Write a whole snapshot of a collection. Used by write-through persistence —
// collections are small (personal data), so snapshotting is simpler and safer
// than diffing, and the per-store write queue in persistence.js keeps
// snapshots from interleaving out of order.
export async function putMany(storeName, items) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  for (const item of items) store.put(item);
  return requestToPromise(tx.objectStore(storeName).count());
}

export async function remove(storeName, id) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).delete(id);
  return requestToPromise(tx.objectStore(storeName).count());
}

export async function clearStore(storeName) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).clear();
  return requestToPromise(tx.objectStore(storeName).count());
}

export async function getAllMeta() {
  const db = await openDb();
  const tx = db.transaction('meta', 'readonly');
  return requestToPromise(tx.objectStore('meta').getAll());
}

export async function putMeta(key, value) {
  const db = await openDb();
  const tx = db.transaction('meta', 'readwrite');
  tx.objectStore('meta').put({ key, value });
  return requestToPromise(tx.objectStore('meta').get(key));
}

export async function getMeta(key) {
  const db = await openDb();
  const tx = db.transaction('meta', 'readonly');
  return requestToPromise(tx.objectStore('meta').get(key));
}

export async function deleteMeta(key) {
  const db = await openDb();
  const tx = db.transaction('meta', 'readwrite');
  tx.objectStore('meta').delete(key);
  return requestToPromise(tx.objectStore('meta').count());
}
