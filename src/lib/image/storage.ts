const DB_NAME = 'merchdesk-images'
const STORE = 'images'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function access<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = fn(db.transaction(STORE, mode).objectStore(STORE))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

export const imageKey = (runId: string, productId: string, version: number) => `${runId}:${productId}:${version}`
export const saveImage = (key: string, dataUrl: string) => access('readwrite', (store) => store.put(dataUrl, key))
export const loadImage = (key: string) => access('readonly', (store) => store.get(key)) as Promise<string | undefined>
export async function clearImages(): Promise<void> {
  await access('readwrite', (store) => store.clear())
}
