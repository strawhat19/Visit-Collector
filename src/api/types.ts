import type { VisitSession } from '../state/types';

export type ApiVisit = Pick<VisitSession,
  `id` | `url` | `pages` | `device` | `source` | `active` | `browser` | `metadata` | `lastPath` | `entryPath` |
  `activeMs` | `lastSeen` | `startedAt` | `countryCode`
> & { operatingSystem: string; ipAddress: string | null };
export type VisitSnapshot = { sourceId: string; visits: ApiVisit[] };
