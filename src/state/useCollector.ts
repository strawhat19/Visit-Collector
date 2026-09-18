import * as Crypto from 'expo-crypto';
import { syncVisits } from '../api/client';
import { detectWebClient } from './client';
import { updateSession } from './sessions';
import { AppState, Platform } from 'react-native';
import { useEffect, useSyncExternalStore } from 'react';
import { saveLocation, validateLocation } from './locations';
import { collectVisitMetadata } from './collectVisitMetadata';
import { createVerifier, normalizeEmail, validateAccount, verifyPassword } from './auth';
import { aggregateAnalytics, createDemo, SESSION_IDLE_MS, trimHistory } from './analytics';
import type { DataMode, LocalUser, Preferences, LocationInput, StoredCollector } from './types';
import { freshRecord, getStorageIssue, readRecord, SESSION_KEY, STORAGE_KEY, transact } from './storage';

type CollectorState = {
  ready: boolean;
  mode: DataMode;
  visitorNumber: number;
  user: LocalUser | null;
  preferences: Preferences;
  storageError: string | null;
  visits: StoredCollector[`sessions`];
  data: ReturnType<typeof aggregateAnalytics>;
};
let record = freshRecord();
let snapshot: CollectorState = {
  ready: false, user: null, mode: `local`, visitorNumber: 1, storageError: null,
  visits: record.sessions, preferences: record.preferences, data: aggregateAnalytics([], [], 0),
};
let owners = 0;
let demoTick = 0;
let lastTick = 0;
let pendingMs = 0;
let lastPage = ``;
let sessionId = ``;
let lastPageAt = 0;
let visible = true;
let heartbeatTick = 0;
let boot: Promise<void> | null = null;
let cleanupListeners: (() => void) | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let pendingSession: Pick<StoredCollector, `activity` | `sessions`> | null = null;
const listeners = new Set<() => void>();
const randomId = () => Crypto.randomUUID();
const message = (error: unknown) => error instanceof Error ? error.message : `Local Data Could Not Be Saved`;
const notify = () => listeners.forEach(listener => listener());
const publicUser = (value: StoredCollector) => {
  const account = value.accounts.find(candidate => candidate.id === value.userId);
  return account ? { id: account.id, email: account.email, number: account.number, username: account.username } : null;
};
const publish = (patch: Partial<CollectorState> = {}) => {
  const user = publicUser(record);
  snapshot = {
    ...snapshot, user, visits: record.sessions, visitorNumber: user?.number ?? 1, preferences: record.preferences,
    data: snapshot.mode === `demo` ? createDemo(demoTick) : aggregateAnalytics(record.sessions, record.activity, Date.now(), record), ...patch,
  };
  notify();
};
const accept = (next: StoredCollector) => {
  if (next.revision >= record.revision || next.revision === 0) record = next;
  syncVisits(record.sessions);
  publish({ storageError: getStorageIssue() });
};
const commit = async <T>(change: (current: StoredCollector) => T, onSaved?: (result: T) => void) => {
  try {
    const result = await transact(change);
    onSaved?.(result.result);
    accept(result.record);
    return result.result;
  } catch (error) {
    if (message(error).startsWith(`Local Storage`)) publish({ storageError: message(error) });
    throw error;
  }
};
const pathName = () => Platform.OS === `web` && typeof window !== `undefined` ? window.location.pathname : `/`;
const cleanPath = (path: string) => `/${path.split(/[?#]/)[0]?.replace(/^\/+/, ``) ?? ``}`.slice(0, 512);
const sourceName = () => {
  if (Platform.OS !== `web` || !document.referrer) return `Direct`;
  try {
    const host = new URL(document.referrer).hostname;
    return host === window.location.hostname ? `Direct` : host.replace(/^www\./, ``).slice(0, 254);
  } catch {
    return `Direct`;
  }
};
const clientInfo = () => {
  if (Platform.OS !== `web`) return {
    browser: `Native App`, device: Platform.OS === `ios` && Platform.isPad ? `Tablet` : `Mobile`,
    operatingSystem: Platform.OS === `ios` ? Platform.isPad ? `iPadOS` : `iOS` : Platform.OS === `android` ? `Android` : `Unknown`,
  };
  return detectWebClient(navigator.userAgent, navigator.maxTouchPoints);
};
const saveSessionId = () => {
  if (Platform.OS !== `web`) return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, sessionId);
  } catch { /* A blocked session store still permits an in-memory session. */ }
};
const adoptSession = (id: string) => {
  sessionId = id;
  saveSessionId();
};
const restorePendingSession = (current: StoredCollector) => {
  if (!pendingSession) return;
  pendingSession.sessions.forEach(session => {
    const saved = current.sessions.find(candidate => candidate.id === session.id);
    if (!saved) current.sessions.push({ ...session });
    else {
      saved.pages = Math.max(saved.pages, session.pages);
      saved.activeMs = Math.max(saved.activeMs, session.activeMs);
      if (session.lastSeen >= saved.lastSeen) {
        saved.lastPath = session.lastPath;
        saved.metadata = session.metadata ?? saved.metadata;
      }
      saved.lastSeen = Math.max(saved.lastSeen, session.lastSeen);
    }
  });
  pendingSession.activity.forEach(event => {
    if (!current.activity.some(candidate => candidate.id === event.id)) current.activity.push({ ...event });
  });
};
const syncSession = (current: StoredCollector, path: string, now: number, elapsedMs = 0, page = false, createIfMissing = false) => {
  restorePendingSession(current);
  const nextSession = updateSession(current, sessionId, {
    ...clientInfo(), now, path, elapsedMs, createIfMissing, active: visible, source: sourceName(), createId: randomId, recordPage: page,
    metadata: collectVisitMetadata(),
  });
  trimHistory(current);
  return nextSession;
};
const accrueDuration = () => {
  const now = Date.now();
  if (visible && lastTick) pendingMs += Math.min(Math.max(now - lastTick, 0), 45_000);
  lastTick = now;
};
const flushSession = async () => {
  accrueDuration();
  const elapsed = pendingMs;
  const now = Date.now();
  pendingMs = 0;
  try {
    await commit(current => syncSession(current, lastPage || cleanPath(pathName()), now, elapsed, false, !sessionId), adoptSession);
    pendingSession = null;
  } catch {
    pendingMs += elapsed;
  }
};
const initialize = () => {
  if (boot) return boot;
  boot = (async () => {
    visible = Platform.OS === `web` ? document.visibilityState !== `hidden` : AppState.currentState !== `background` && AppState.currentState !== `inactive`;
    lastTick = Date.now();
    if (Platform.OS === `web`) {
      try {
        const navigation = performance.getEntriesByType(`navigation`)?.[0] as PerformanceNavigationTiming | undefined;
        sessionId = navigation?.type === `reload` ? window.sessionStorage.getItem(SESSION_KEY) ?? `` : ``;
      } catch {
        sessionId = ``;
      }
    }
    lastPage = cleanPath(pathName());
    lastPageAt = Date.now();
    try {
      accept(await readRecord());
    } catch (error) {
      publish({ storageError: message(error) });
    }
    try {
      await commit(current => syncSession(current, lastPage, lastPageAt, 0, true, true), adoptSession);
    } catch {
      const previousEvents = new Set(record.activity.map(event => event.id));
      adoptSession(syncSession(record, lastPage, lastPageAt, 0, true, true));
      pendingSession = {
        sessions: record.sessions.filter(session => session.id === sessionId).map(session => ({ ...session })),
        activity: record.activity.filter(event => !previousEvents.has(event.id)).map(event => ({ ...event })),
      };
    }
    publish({ ready: true });
  })();
  return boot;
};
const refreshFromStorage = async () => {
  try {
    accept(await readRecord());
  } catch (error) {
    publish({ storageError: message(error) });
  }
};
const onVisibility = (active: boolean) => {
  if (active === visible) return;
  accrueDuration();
  visible = active;
  const stale = record.sessions.find(session => session.id === sessionId);
  if (active && stale && Date.now() - stale.lastSeen > SESSION_IDLE_MS) {
    pendingMs = 0;
    recordPage(pathName());
  } else void flushSession();
  if (active) publish();
};
const start = () => {
  owners += 1;
  if (owners > 1) return;
  void initialize();
  timer = setInterval(() => {
    if (!snapshot.ready || !visible) return;
    demoTick += 1;
    heartbeatTick += 1;
    if (heartbeatTick % 3 === 0) void flushSession();
    else publish();
  }, 4_000);
  if (Platform.OS === `web`) {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) void refreshFromStorage();
    };
    const onVisible = () => onVisibility(document.visibilityState !== `hidden`);
    const onPageHide = () => onVisibility(false);
    const onPageShow = () => onVisibility(document.visibilityState !== `hidden`);
    document.addEventListener(`visibilitychange`, onVisible);
    window.addEventListener(`storage`, onStorage);
    window.addEventListener(`pagehide`, onPageHide);
    window.addEventListener(`pageshow`, onPageShow);
    cleanupListeners = () => {
      document.removeEventListener(`visibilitychange`, onVisible);
      window.removeEventListener(`storage`, onStorage);
      window.removeEventListener(`pagehide`, onPageHide);
      window.removeEventListener(`pageshow`, onPageShow);
    };
  } else {
    const subscription = AppState.addEventListener(`change`, state => onVisibility(state === `active`));
    cleanupListeners = () => subscription.remove();
  }
};
const stop = () => {
  owners -= 1;
  if (owners) return;
  if (timer) clearInterval(timer);
  cleanupListeners?.();
  cleanupListeners = null;
  timer = null;
};
const changeIdentity = async (change: (current: StoredCollector) => void) => {
  accrueDuration();
  const elapsed = pendingMs;
  const now = Date.now();
  pendingMs = 0;
  try {
    await commit(current => {
      change(current);
      return syncSession(current, lastPage || cleanPath(pathName()), now, elapsed, false, true);
    }, adoptSession);
    pendingSession = null;
  } catch (error) {
    pendingMs += elapsed;
    throw error;
  }
};
const signIn = async (email: string, password: string) => {
  await initialize();
  const latest = await readRecord();
  const account = latest.accounts.find(candidate => candidate.email === normalizeEmail(email));
  if (!account || !(await verifyPassword(password, account.verifier))) throw new Error(`Email Or Password Is Incorrect`);
  await changeIdentity(current => {
    if (!current.accounts.some(candidate => candidate.id === account.id)) throw new Error(`Account Is No Longer Available`);
    current.userId = account.id;
  });
};
const signUp = async (username: string, email: string, password: string) => {
  validateAccount(username, email, password);
  await initialize();
  const normalizedEmail = normalizeEmail(email);
  if ((await readRecord()).accounts.some(account => account.email === normalizedEmail)) throw new Error(`An Account With This Email Already Exists`);
  const verifier = await createVerifier(password, await Crypto.getRandomBytesAsync(16));
  const uuid = randomId();
  const name = username.trim();
  await changeIdentity(current => {
    if (current.accounts.some(account => account.email === normalizedEmail)) throw new Error(`An Account With This Email Already Exists`);
    if (current.accounts.length >= 100) throw new Error(`This Device Has Reached Its Local Account Limit`);
    const number = Math.max(current.nextNumber, 2, ...current.accounts.map(account => account.number + 1));
    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, `_`);
    const id = `User_${number}_${name.replace(/[^a-zA-Z0-9]/g, ``) || `User`}_${stamp}${uuid}`;
    current.accounts.push({ id, number, verifier, username: name, email: normalizedEmail, createdAt: Date.now() });
    current.nextNumber = number + 1;
    current.userId = id;
  });
};
const signOut = async () => {
  await initialize();
  await changeIdentity(current => { current.userId = null; });
};
const updatePreferences = async (patch: Partial<Preferences>) => {
  await initialize();
  await commit(current => { current.preferences = { ...current.preferences, ...patch }; });
};
const setMode = async (mode: DataMode) => {
  await initialize();
  publish({ mode, data: mode === `demo` ? createDemo(demoTick) : aggregateAnalytics(record.sessions, record.activity, Date.now(), record) });
};
const addLocation = async (input: LocationInput) => {
  const location = validateLocation(input);
  await initialize();
  accrueDuration();
  const elapsed = pendingMs;
  const now = Date.now();
  pendingMs = 0;
  try {
    const result = await commit(current => {
      const nextSession = syncSession(current, lastPage || cleanPath(pathName()), now, elapsed, false, true);
      const code = saveLocation(current, location, nextSession, randomId, now);
      return { code, nextSession };
    }, saved => adoptSession(saved.nextSession));
    pendingSession = null;
    if (snapshot.mode === `demo`) publish({ mode: `local`, data: aggregateAnalytics(record.sessions, record.activity, Date.now(), record) });
    return result.code;
  } catch (error) {
    pendingMs += elapsed;
    throw error;
  }
};
const recordPage = (path: string) => {
  const cleaned = cleanPath(path);
  void initialize().then(async () => {
    const now = Date.now();
    if (cleaned === lastPage && now - lastPageAt < 2_000) return;
    lastPage = cleaned;
    lastPageAt = now;
    accrueDuration();
    const elapsed = pendingMs;
    pendingMs = 0;
    try {
      await commit(current => syncSession(current, cleaned, now, elapsed, true, true), adoptSession);
      pendingSession = null;
    } catch (error) {
      pendingMs += elapsed;
      throw error;
    }
  }).catch(error => publish({ storageError: message(error) }));
};
const clearHistory = async () => {
  await initialize();
  await commit(current => {
    current.activity = [];
    current.sessions = [];
  });
  pendingSession = null;
  pendingMs = 0;
  lastTick = Date.now();
};
const clearLocalData = async () => {
  await initialize();
  pendingSession = null;
  pendingMs = 0;
  sessionId = ``;
  lastPageAt = 0;
  lastTick = Date.now();
  lastPage = cleanPath(pathName());
  await commit(current => {
    const revision = current.revision;
    Object.assign(current, freshRecord(), { revision });
    return syncSession(current, lastPage, lastTick, 0, true, true);
  }, adoptSession);
  publish({ mode: `local`, data: aggregateAnalytics(record.sessions, record.activity, Date.now(), record) });
};
const resetDemo = () => {
  demoTick = 0;
  publish();
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const getSnapshot = () => snapshot;
export const useCollector = () => {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    start();
    return stop;
  }, []);
  return { ...state, signIn, signUp, signOut, setMode, addLocation, recordPage, resetDemo, clearHistory, clearLocalData, updatePreferences };
};
