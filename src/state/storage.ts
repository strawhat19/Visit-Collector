import { Platform } from 'react-native';
import type { StoredCollector } from './types';
import { decodeRecord, freshRecord } from './records';
import AsyncStorage from '@react-native-async-storage/async-storage';

export { freshRecord } from './records';
const LOCK_NAME = `visit-collector:write`;
export const STORAGE_KEY = `visit-collector:v1`;
export const SESSION_KEY = `visit-collector:tab-session:v1`;
let queuedWrite: Promise<unknown> = Promise.resolve();
let storageIssue: string | null = null;
export const getStorageIssue = () => storageIssue;
export const readRecord = async (): Promise<StoredCollector> => {
  let raw: string | null;
  try {
    raw = Platform.OS === `web` ? window.localStorage.getItem(STORAGE_KEY) : await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    throw new Error(`Local Storage Is Unavailable`);
  }
  try {
    return decodeRecord(raw);
  } catch {
    storageIssue = `Saved Local Data Was Invalid And Has Been Reset`;
    return freshRecord();
  }
};
const writeRecord = async (record: StoredCollector) => {
  try {
    const raw = JSON.stringify(record);
    if (Platform.OS === `web`) window.localStorage.setItem(STORAGE_KEY, raw);
    else await AsyncStorage.setItem(STORAGE_KEY, raw);
  } catch {
    throw new Error(`Local Storage Is Full Or Unavailable`);
  }
};
const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));
const legacyBrowserLock = async <T>(task: () => Promise<T>): Promise<T> => {
  const prefix = `${LOCK_NAME}:`;
  const owner = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const key = `${prefix}${owner}`;
  const expires = Date.now() + 10_000;
  const readContenders = () => Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
    .filter((entry): entry is string => !!entry?.startsWith(prefix)).flatMap(entry => {
      try {
        const candidate = JSON.parse(window.localStorage.getItem(entry) ?? `null`) as { choosing: boolean; ticket: number; expires: number } | null;
        return candidate && candidate.expires > Date.now() ? [{ key: entry, ...candidate }] : [];
      } catch {
        return [];
      }
    });
  try {
    window.localStorage.setItem(key, JSON.stringify({ choosing: true, ticket: 0, expires }));
    const ticket = Math.max(0, ...readContenders().map(entry => entry.ticket)) + 1;
    window.localStorage.setItem(key, JSON.stringify({ choosing: false, ticket, expires }));
    while (readContenders().some(entry => entry.key !== key && (entry.choosing || (entry.ticket > 0 && (entry.ticket < ticket || entry.ticket === ticket && entry.key < key))))) {
      if (Date.now() > expires - 1_000) throw new Error(`Local Storage Is Busy — Try Again`);
      await wait(20);
    }
    return await task();
  } finally {
    window.localStorage.removeItem(key);
  }
};
export const transact = <T>(change: (record: StoredCollector) => T): Promise<{ record: StoredCollector; result: T }> => {
  const execute = async () => {
    const task = async () => {
      const record = await readRecord();
      const result = change(record);
      record.revision += 1;
      await writeRecord(record);
      return { record, result };
    };
    if (Platform.OS !== `web`) return task();
    try {
      return await (navigator.locks?.request ? navigator.locks.request(LOCK_NAME, task) : legacyBrowserLock(task));
    } catch (error) {
      if (error instanceof DOMException) throw new Error(`Local Storage Is Full Or Unavailable`);
      throw error;
    }
  };
  const result = queuedWrite.then(execute, execute);
  queuedWrite = result.catch(() => undefined);
  return result;
};
