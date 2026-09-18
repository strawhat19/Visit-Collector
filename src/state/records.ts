import { MAX_LOCATIONS } from './locations';
import type { StoredCollector } from './types';
import { normalizeVisitPath, normalizeVisitMetadata } from './visitMetadata';

export const freshRecord = (): StoredCollector => ({
  version: 1, revision: 0, userId: null, accounts: [], activity: [], sessions: [], nextNumber: 2, locations: [], locationAssignments: {},
  preferences: { haptics: true, theme: `dark`, reducedMotion: false },
});
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === `object` && !Array.isArray(value);
const text = (value: unknown, max = 254): value is string => typeof value === `string` && value.length <= max;
const number = (value: unknown): value is number => typeof value === `number` && Number.isFinite(value) && value >= 0;
const integer = (value: unknown): value is number => number(value) && Number.isSafeInteger(value);
const ipv4 = (value: string) => /^\d{1,3}(?:\.\d{1,3}){3}$/.test(value) && value.split(`.`).every(octet => Number(octet) <= 255);
const ipAddress = (value: unknown) => {
  if (value === undefined || value === null) return true;
  if (typeof value !== `string` || !value.length || value.length > 45) return false;
  if (ipv4(value)) return true;
  if (!value.includes(`:`) || !/^[a-f\d:.]+$/i.test(value)) return false;
  let address = value;
  if (address.includes(`.`)) {
    const tail = address.split(`:`).at(-1) ?? ``;
    if (!ipv4(tail)) return false;
    address = `${address.slice(0, -tail.length)}0:0`;
  }
  const halves = address.split(`::`);
  const segments = halves.flatMap(half => half ? half.split(`:`) : []);
  return halves.length <= 2 && segments.every(segment => /^[a-f\d]{1,4}$/i.test(segment))
    && (halves.length === 2 ? segments.length < 8 : segments.length === 8);
};
export const decodeRecord = (raw: string | null): StoredCollector => {
  if (!raw) return freshRecord();
  const value: unknown = JSON.parse(raw);
  if (!object(value) || value.version !== 1 || !integer(value.revision) || !integer(value.nextNumber)) throw new Error(`Invalid Local Data Version`);
  if (!Array.isArray(value.accounts) || value.accounts.length > 100 || !Array.isArray(value.sessions) || !Array.isArray(value.activity)) throw new Error(`Invalid Local Data`);
  if (value.sessions.length > 500 || value.activity.length > 1_000) throw new Error(`Local History Exceeds Its Limit`);
  const prefs = value.preferences;
  if (!object(prefs) || ![`light`, `dark`, `system`].includes(String(prefs.theme)) || typeof prefs.haptics !== `boolean` || typeof prefs.reducedMotion !== `boolean`) throw new Error(`Invalid Preferences`);
  const accountsValid = value.accounts.every(account => object(account) && text(account.id) && text(account.email) && text(account.username, 40)
    && integer(account.number) && account.number >= 2 && object(account.verifier) && account.verifier.iterations === 600_000
    && (account.createdAt === undefined || number(account.createdAt))
    && /^[a-f0-9]{32}$/.test(String(account.verifier.salt)) && /^[a-f0-9]{64}$/.test(String(account.verifier.hash)));
  const sessionsValid = value.sessions.every(session => object(session) && text(session.id) && text(session.device) && text(session.source)
    && ipAddress(session.ipAddress)
    && text(session.browser) && text(session.visitorKey) && text(session.countryCode) && typeof session.active === `boolean`
    && (session.operatingSystem === undefined || text(session.operatingSystem, 80))
    && integer(session.pages) && number(session.activeMs) && number(session.lastSeen) && number(session.startedAt));
  const eventsValid = value.activity.every(event => object(event) && text(event.id) && text(event.path, 512) && text(event.source)
    && ipAddress(event.ipAddress)
    && (event.visitorKey === undefined || text(event.visitorKey)) && (event.sessionId === undefined || text(event.sessionId))
    && text(event.countryCode) && number(event.at) && [`visit`, `page`].includes(String(event.type)));
  if (!accountsValid || !sessionsValid || !eventsValid || !(value.userId === null || text(value.userId))) throw new Error(`Invalid Local Data`);
  const accounts = value.accounts as StoredCollector[`accounts`];
  if (new Set(accounts.map(account => account.email)).size !== accounts.length || new Set(accounts.map(account => account.number)).size !== accounts.length) throw new Error(`Duplicate Local Accounts`);
  const locations = value.locations ?? [];
  const assignments = value.locationAssignments ?? {};
  if (!Array.isArray(locations) || locations.length > MAX_LOCATIONS || !object(assignments) || Object.keys(assignments).length > 101) throw new Error(`Invalid Saved Locations`);
  const locationsValid = locations.every(location => object(location) && text(location.id) && text(location.ownerKey) && text(location.name, 80)
    && location.name.trim().length >= 2 && number(location.createdAt) && typeof location.latitude === `number` && Number.isFinite(location.latitude)
    && Math.abs(location.latitude) <= 90 && typeof location.longitude === `number` && Number.isFinite(location.longitude) && Math.abs(location.longitude) <= 180);
  if (!locationsValid || new Set(locations.map(location => location.id)).size !== locations.length
    || !Object.entries(assignments).every(([owner, id]) => text(id) && locations.some(location => location.id === id && location.ownerKey === owner))) throw new Error(`Invalid Saved Locations`);
  return {
    ...value, locations, locationAssignments: assignments,
    accounts: accounts.map(account => ({ ...account, createdAt: account.createdAt ?? 0 })),
    sessions: value.sessions.map(session => ({
      ...session, operatingSystem: session.operatingSystem || `Unknown`,
      entryPath: normalizeVisitPath(session.entryPath), lastPath: normalizeVisitPath(session.lastPath), metadata: normalizeVisitMetadata(session.metadata),
    })),
  } as StoredCollector;
};
