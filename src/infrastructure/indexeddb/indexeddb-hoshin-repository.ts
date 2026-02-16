import type { HoshinRepository } from "@/src/application/repository/hoshin-repository";
import type { HoshinDocument } from "@/src/domain/hoshin/models";

const DB_NAME = "hoshin-db";
const DB_VERSION = 1;
const STORE_NAME = "hoshin-documents";

function ensureIndexedDbAvailable(): IDBFactory {
  if (typeof window === "undefined" || !window.indexedDB) {
    throw new Error("IndexedDB is not available in this environment.");
  }
  return window.indexedDB;
}

function toIdbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  const indexedDb = ensureIndexedDbAvailable();
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open IndexedDB."));
  });
}

export class IndexedDbHoshinRepository implements HoshinRepository {
  async upsert(document: HoshinDocument): Promise<void> {
    const db = await openDatabase();
    try {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      await toIdbRequest(store.put(document));
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () =>
          reject(transaction.error ?? new Error("Failed to upsert document."));
        transaction.onabort = () =>
          reject(transaction.error ?? new Error("IndexedDB upsert aborted."));
      });
    } finally {
      db.close();
    }
  }

  async getById(id: string): Promise<HoshinDocument | null> {
    const db = await openDatabase();
    try {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const result = await toIdbRequest(store.get(id));
      return (result as HoshinDocument | undefined) ?? null;
    } finally {
      db.close();
    }
  }

  async list(): Promise<HoshinDocument[]> {
    const db = await openDatabase();
    try {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const result = await toIdbRequest(store.getAll());
      const documents = (result as HoshinDocument[]).sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt)
      );
      return documents;
    } finally {
      db.close();
    }
  }

  async delete(id: string): Promise<void> {
    const db = await openDatabase();
    try {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      await toIdbRequest(store.delete(id));
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () =>
          reject(transaction.error ?? new Error("Failed to delete document."));
        transaction.onabort = () =>
          reject(transaction.error ?? new Error("IndexedDB delete aborted."));
      });
    } finally {
      db.close();
    }
  }
}
