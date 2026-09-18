import { isIP } from 'node:net';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ApiVisit, VisitSnapshot } from '../src/api/types';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { normalizeVisitUrl, normalizeVisitPath, normalizeVisitMetadata } from '../src/state/visitMetadata';

type StoredSource = { visits: ApiVisit[]; updatedAt: number };
type VisitStore = { version: 1; sources: Record<string, StoredSource> };

const MAX_SOURCES = 100;
const MAX_VISITS = 500;
const storeDirectory = join(process.cwd(), `.local`);
const storePath = join(storeDirectory, `visits.json`);
const uuidPattern = /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i;
let queuedWrite: Promise<unknown> = Promise.resolve();

export class VisitStoreError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = `VisitStoreError`;
  }
}

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === `object` && !Array.isArray(value);
const validNumber = (value: unknown): value is number => typeof value === `number` && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
const text = (value: unknown, field: string, limit = 254) => {
  if (typeof value !== `string` || !value.trim() || value.length > limit) throw new VisitStoreError(`Invalid Visit ${field}`, 400);
  return value;
};
const number = (value: unknown, field: string, integer = false) => {
  if (!validNumber(value) || integer && !Number.isSafeInteger(value)) throw new VisitStoreError(`Invalid Visit ${field}`, 400);
  return value;
};
const optionalPath = (value: unknown, field: string) => {
  if (value === undefined) return undefined;
  const path = normalizeVisitPath(value);
  if (!path) throw new VisitStoreError(`Invalid Visit ${field}`, 400);
  return path;
};
const optionalUrl = (value: unknown) => {
  if (value == null) return undefined;
  const url = normalizeVisitUrl(value);
  if (!url) throw new VisitStoreError(`Invalid Visit URL`, 400);
  return url;
};
const parseVisit = (value: unknown): ApiVisit => {
  if (!object(value) || typeof value.active !== `boolean`) throw new VisitStoreError(`Invalid Visit`, 400);
  const ipAddress = value.ipAddress ?? null;
  if (ipAddress !== null && (typeof ipAddress !== `string` || ipAddress.length > 45 || !isIP(ipAddress))) {
    throw new VisitStoreError(`Invalid Visit IP Address`, 400);
  }
  return {
    ipAddress,
    active: value.active,
    id: text(value.id, `ID`),
    url: optionalUrl(value.url),
    source: text(value.source, `Source`),
    device: text(value.device, `Device`),
    browser: text(value.browser, `Browser`),
    pages: number(value.pages, `Pages`, true),
    activeMs: number(value.activeMs, `Active Time`),
    lastSeen: number(value.lastSeen, `Last Seen Time`),
    startedAt: number(value.startedAt, `Started Time`),
    lastPath: optionalPath(value.lastPath, `Last Path`),
    entryPath: optionalPath(value.entryPath, `Entry Path`),
    countryCode: text(value.countryCode, `Country Code`),
    metadata: normalizeVisitMetadata(value.metadata),
    operatingSystem: text(value.operatingSystem ?? `Unknown`, `Operating System`, 80),
  };
};

export const parseVisitSnapshot = (value: unknown): VisitSnapshot => {
  if (!object(value) || typeof value.sourceId !== `string` || !uuidPattern.test(value.sourceId)) {
    throw new VisitStoreError(`A Valid Source ID Is Required`, 400);
  }
  if (!Array.isArray(value.visits)) throw new VisitStoreError(`Visits Must Be An Array`, 400);
  if (value.visits.length > MAX_VISITS) throw new VisitStoreError(`A Source Can Store Up To ${MAX_VISITS} Visits`, 413);
  const visits = value.visits.map(parseVisit);
  if (new Set(visits.map(visit => visit.id)).size !== visits.length) throw new VisitStoreError(`Visit IDs Must Be Unique Within A Source`, 400);
  return { sourceId: value.sourceId.toLowerCase(), visits };
};

const requireLocalStorage = () => {
  if (process.env.VERCEL) throw new VisitStoreError(`Shared Persistent Storage Is Required Before This API Can Run On Vercel`, 503);
};
const readStore = async (): Promise<VisitStore> => {
  requireLocalStorage();
  let raw: string;
  try {
    raw = await readFile(storePath, `utf8`);
  } catch (error) {
    if (object(error) && error.code === `ENOENT`) return { version: 1, sources: {} };
    throw new VisitStoreError(`Saved Visits Could Not Be Read`, 500);
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (!object(value) || value.version !== 1 || !object(value.sources)) throw new Error(`Invalid Store`);
    const entries = Object.entries(value.sources);
    if (entries.length > MAX_SOURCES) throw new Error(`Source Limit Exceeded`);
    const sources: VisitStore[`sources`] = {};
    for (const [sourceId, source] of entries) {
      if (!object(source) || !validNumber(source.updatedAt)) throw new Error(`Invalid Source`);
      const snapshot = parseVisitSnapshot({ sourceId, visits: source.visits });
      if (sources[snapshot.sourceId]) throw new Error(`Duplicate Source`);
      sources[snapshot.sourceId] = { visits: snapshot.visits, updatedAt: source.updatedAt };
    }
    return { version: 1, sources };
  } catch {
    throw new VisitStoreError(`Saved Visits Are Invalid And Must Be Repaired Before Continuing`, 500);
  }
};
const collectVisits = (store: VisitStore): ApiVisit[] => {
  const visits = new Map<string, ApiVisit>();
  Object.keys(store.sources).sort().forEach(sourceId => {
    store.sources[sourceId]?.visits.forEach(visit => {
      const saved = visits.get(visit.id);
      if (!saved || visit.lastSeen > saved.lastSeen) visits.set(visit.id, visit);
    });
  });
  return [...visits.values()].sort((left, right) => right.startedAt - left.startedAt || left.id.localeCompare(right.id));
};

export const readVisits = async (): Promise<ApiVisit[]> => {
  requireLocalStorage();
  await queuedWrite;
  return collectVisits(await readStore());
};
export const saveVisits = async (snapshot: VisitSnapshot): Promise<ApiVisit[]> => {
  requireLocalStorage();
  const parsed = parseVisitSnapshot(snapshot);
  const save = async () => {
    const store = await readStore();
    if (!store.sources[parsed.sourceId] && Object.keys(store.sources).length >= MAX_SOURCES) {
      throw new VisitStoreError(`The Local API Can Store Up To ${MAX_SOURCES} Sources`, 413);
    }
    store.sources[parsed.sourceId] = { visits: parsed.visits, updatedAt: Date.now() };
    const temporaryPath = join(storeDirectory, `visits-${randomUUID()}.tmp`);
    try {
      await mkdir(storeDirectory, { recursive: true, mode: 0o700 });
      await writeFile(temporaryPath, JSON.stringify(store), { flag: `wx`, mode: 0o600 });
      await rename(temporaryPath, storePath);
    } catch {
      throw new VisitStoreError(`Visits Could Not Be Saved`, 500);
    } finally {
      await rm(temporaryPath, { force: true }).catch(() => undefined);
    }
    return collectVisits(store);
  };
  const result = queuedWrite.then(save, save);
  queuedWrite = result.catch(() => undefined);
  return result;
};
