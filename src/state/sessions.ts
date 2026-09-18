import type { StoredCollector } from './types';
import type { VisitMetadata } from './visitMetadata';
import { SESSION_IDLE_MS, trimHistory } from './analytics';

type SessionUpdate = {
  now: number;
  path: string;
  source: string;
  device: string;
  active: boolean;
  browser: string;
  elapsedMs: number;
  recordPage: boolean;
  createId: () => string;
  metadata?: VisitMetadata;
  operatingSystem?: string;
  createIfMissing: boolean;
};
export const updateSession = (record: StoredCollector, sessionId: string, update: SessionUpdate) => {
  let session = record.sessions.find(candidate => candidate.id === sessionId);
  const visitorKey = record.userId ?? `guest-device`;
  const expired = !!session && update.now - session.lastSeen > SESSION_IDLE_MS;
  const changedIdentity = !!session && session.visitorKey !== visitorKey;
  const rotate = !session || expired || changedIdentity;
  if (session) {
    session.activeMs += update.elapsedMs;
    session.active = rotate ? false : update.active;
    if (!expired) session.lastSeen = update.now;
  }
  if (rotate) {
    if (!update.active || !session && !update.createIfMissing) return sessionId;
    session = {
      visitorKey, pages: 0, activeMs: 0, active: true, id: update.createId(), countryCode: record.locationAssignments[visitorKey] ?? `unknown`,
      startedAt: update.now, lastSeen: update.now, source: update.source, device: update.device, browser: update.browser,
      entryPath: update.path, lastPath: update.path, metadata: update.metadata, operatingSystem: update.operatingSystem ?? `Unknown`,
    };
    record.sessions.push(session);
  }
  if (!session) return sessionId;
  session.lastPath = update.path;
  session.entryPath ??= update.path;
  if (update.metadata) session.metadata = { ...update.metadata, page: session.metadata?.page ?? update.metadata.page };
  const locationCode = record.locationAssignments[visitorKey];
  if (locationCode) session.countryCode = locationCode;
  if (update.recordPage || rotate) {
    record.activity.push({
      id: update.createId(), type: session.pages === 0 ? `visit` : `page`, path: update.path,
      at: update.now, source: session.source, countryCode: session.countryCode, visitorKey, sessionId: session.id,
      ipAddress: session.ipAddress,
    });
    session.pages += 1;
  }
  trimHistory(record);
  return session.id;
};
