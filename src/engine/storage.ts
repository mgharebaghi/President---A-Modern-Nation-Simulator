/** One local save slot. IndexedDB success is reported only after transaction commit. */
import { validateSave } from './kernel';
import type { SaveGame } from './types';
export interface SaveSlot { savedAt: string; game: SaveGame }
const DB = 'president-saves';
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('slots');
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Storage blocked'));
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
  });
}
async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction('slots', mode);
    const request = action(tx.objectStore('slots'));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Storage failed')); };
  });
}
export async function readSlot(): Promise<SaveSlot | null> {
  const value = await transaction<SaveSlot | undefined>('readonly', store => store.get('current'));
  if (!value) return null;
  if (!Number.isFinite(Date.parse(value.savedAt))) throw new TypeError('Invalid save date');
  return { savedAt: value.savedAt, game: validateSave(value.game) };
}
export async function writeSlot(game: SaveGame): Promise<SaveSlot> {
  const slot = { savedAt: new Date().toISOString(), game: validateSave(game) };
  await transaction('readwrite', store => store.put(slot, 'current'));
  return slot;
}
