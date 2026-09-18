import * as Crypto from 'expo-crypto';
import type { ApiVisit } from './types';
import { Platform } from 'react-native';
import { readRecord } from '../state/storage';
import type { VisitSession } from '../state/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeVisitPath, normalizeVisitMetadata } from '../state/visitMetadata';

const sourceKey = `visit-collector:api-source:v1`;
let savedSnapshot = ``;
let syncing = false;
let retryDelay = 1_000;
let pending: ApiVisit[] | null = null;
let sourceId: Promise<string> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

export const getApiBaseUrl = () => {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, ``);
  if (configured) return configured;
  if (Platform.OS !== `web` || typeof window === `undefined`) return null;
  const url = new URL(window.location.origin);
  if (__DEV__) {
    url.protocol = `http:`;
    url.port = `3001`;
    if ([`localhost`, `[::1]`].includes(url.hostname)) url.hostname = `127.0.0.1`;
  }
  url.pathname = `/api/Piratechs`;
  return url.toString().replace(/\/+$/, ``);
};

const getSourceId = () => {
  if (!sourceId) sourceId = (async () => {
    const existing = Platform.OS === `web` ? window.localStorage.getItem(sourceKey) : await AsyncStorage.getItem(sourceKey);
    if (existing && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(existing)) return existing;
    const id = Crypto.randomUUID();
    if (Platform.OS === `web`) window.localStorage.setItem(sourceKey, id);
    else await AsyncStorage.setItem(sourceKey, id);
    return id;
  })().catch(error => {
    sourceId = null;
    throw error;
  });
  return sourceId;
};

const requestVisits = async (init?: RequestInit) => {
  const base = getApiBaseUrl();
  if (!base) throw new Error(`Set EXPO_PUBLIC_API_BASE_URL To Connect This Device`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(`${base}/visits`, { ...init, credentials: `omit`, signal: controller.signal });
    if (!response.ok) throw new Error(`Visits API Returned ${response.status}`);
    const visits: unknown = await response.json();
    if (!Array.isArray(visits)) throw new Error(`Visits API Did Not Return An Array`);
    return visits as ApiVisit[];
  } finally {
    clearTimeout(timeout);
  }
};

export const getVisits = () => requestVisits();

const scheduleSync = (delay: number) => {
  if (timer || syncing) return;
  timer = setTimeout(() => {
    timer = null;
    void flushVisits();
  }, delay);
};

const flushVisits = async () => {
  if (syncing || !pending || !getApiBaseUrl()) return;
  const visits = pending;
  pending = null;
  syncing = true;
  try {
    const sendLatest = async () => {
      const latest = toApiVisits((await readRecord()).sessions);
      const snapshot = JSON.stringify(latest);
      if (snapshot === savedSnapshot) return;
      await requestVisits({
        method: `POST`,
        headers: { 'Content-Type': `application/json` },
        body: JSON.stringify({ visits: latest, sourceId: await getSourceId() }),
      });
      savedSnapshot = snapshot;
    };
    if (Platform.OS === `web` && navigator.locks?.request) await navigator.locks.request(`visit-collector:api-sync`, sendLatest);
    else await sendLatest();
    retryDelay = 1_000;
  } catch {
    savedSnapshot = ``;
    pending ??= visits;
    retryDelay = Math.min(30_000, retryDelay * 2);
  } finally {
    syncing = false;
    if (pending) scheduleSync(retryDelay);
  }
};

const toApiVisits = (sessions: VisitSession[]): ApiVisit[] => sessions.map(session => ({
  id: session.id,
  pages: session.pages,
  active: session.active,
  activeMs: session.activeMs,
  lastSeen: session.lastSeen,
  startedAt: session.startedAt,
  source: session.source || `Direct`,
  device: session.device || `Unknown`,
  browser: session.browser || `Unknown`,
  ipAddress: session.ipAddress ?? null,
  countryCode: session.countryCode || `unknown`,
  lastPath: normalizeVisitPath(session.lastPath),
  entryPath: normalizeVisitPath(session.entryPath),
  metadata: normalizeVisitMetadata(session.metadata),
  operatingSystem: session.operatingSystem || `Unknown`,
}));

export const syncVisits = (sessions: VisitSession[]) => {
  if (!getApiBaseUrl()) return;
  pending = toApiVisits(sessions);
  scheduleSync(500);
};
