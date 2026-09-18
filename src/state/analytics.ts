import type { Activity, AnalyticsSnapshot, StoredCollector, VisitSession } from './types';

const BUCKET_MS = 5 * 60_000;
export const MAX_SESSIONS = 500;
export const MAX_ACTIVITY = 1_000;
export const ONLINE_WINDOW_MS = 45_000;
export const SESSION_IDLE_MS = 30 * 60_000;
const countBy = <T>(items: T[], key: (item: T) => string) => {
  const counts = new Map<string, number>();
  items.forEach(item => counts.set(key(item), (counts.get(key(item)) ?? 0) + 1));
  return [...counts].map(([name, count]) => ({ name, count })).sort((left, right) => right.count - left.count);
};
const timeline = (timestamps: number[], now: number) => {
  const bucketEnd = Math.floor(now / BUCKET_MS) * BUCKET_MS;
  return Array.from({ length: 12 }, (_, index) => {
    const start = bucketEnd - (11 - index) * BUCKET_MS;
    const date = new Date(start);
    return {
      label: `${date.getHours().toString().padStart(2, `0`)}:${date.getMinutes().toString().padStart(2, `0`)}`,
      value: timestamps.filter(at => at > 0 && at >= start && at < start + BUCKET_MS).length,
    };
  });
};
export const aggregateAnalytics = (sessions: VisitSession[], activity: Activity[], now = Date.now(), context: Pick<StoredCollector, `accounts` | `locations`> = { accounts: [], locations: [] }): AnalyticsSnapshot => {
  const sessionLookup = new Map(sessions.map(session => [session.id, session]));
  const events = activity.map(event => {
    const session = event.sessionId ? sessionLookup.get(event.sessionId) : undefined;
    const enriched = event.ipAddress === undefined && session?.ipAddress !== undefined ? { ...event, ipAddress: session.ipAddress } : event;
    if (enriched.visitorKey) {
      if (enriched.ipAddress !== undefined || session || enriched.type !== `visit`) return enriched;
      const matchingSessions = sessions.filter(candidate => candidate.visitorKey === enriched.visitorKey && candidate.startedAt === enriched.at && candidate.source === enriched.source);
      return matchingSessions.length === 1 && matchingSessions?.[0]?.ipAddress !== undefined ? { ...enriched, ipAddress: matchingSessions[0]?.ipAddress } : enriched;
    }
    if (session) return { ...enriched, visitorKey: session.visitorKey };
    const matches = event.type === `visit` ? sessions.filter(candidate => candidate.startedAt === event.at && candidate.source === event.source) : [];
    const identities = new Set(matches.map(candidate => candidate.visitorKey));
    return identities.size === 1 ? {
      ...enriched, visitorKey: matches?.[0]?.visitorKey, sessionId: matches.length === 1 ? matches?.[0]?.id : undefined,
      ipAddress: enriched.ipAddress !== undefined ? enriched.ipAddress : matches.length === 1 ? matches?.[0]?.ipAddress : undefined,
    } : enriched;
  });
  const latestVisits = new Map<string, Activity>();
  const keepLatest = (event: Activity) => {
    if (event.visitorKey && event.type === `visit` && (latestVisits.get(event.visitorKey)?.at ?? -1) < event.at) latestVisits.set(event.visitorKey, event);
  };
  events.forEach(keepLatest);
  sessions.forEach(session => {
    if (events.some(event => event.type === `visit` && (event.sessionId === session.id || event.visitorKey === session.visitorKey && event.at === session.startedAt))) return;
    keepLatest({
      id: `session-visit-${session.id}`, type: `visit`, path: `Not Recorded`, at: session.startedAt,
      source: session.source, countryCode: session.countryCode, sessionId: session.id, visitorKey: session.visitorKey,
      ipAddress: session.ipAddress,
    });
  });
  const locations = new Map(context.locations.map(location => [location.id, location]));
  const locationCounts = new Map(countBy(sessions, session => locations.has(session.countryCode) ? session.countryCode : `unknown`).map(item => [item.name, item.count]));
  const countries: AnalyticsSnapshot[`countries`] = context.locations.map(location => ({
    code: location.id, name: location.name, count: locationCounts.get(location.id) ?? 0, latitude: location.latitude, longitude: location.longitude,
  }));
  if (locationCounts.has(`unknown`)) countries.push({ code: `unknown`, name: `Unknown Location`, count: locationCounts.get(`unknown`) ?? 0, latitude: null, longitude: null });
  countries.sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
  const sources = countBy(sessions, session => session.source).map(source => ({
    ...source, percent: sessions.length ? Math.round(source.count / sessions.length * 100) : 0,
  }));
  return {
    sources,
    countries,
    updatedAt: now,
    totalVisits: sessions.length,
    signedUpUsers: context.accounts.length,
    savedLocations: context.locations.length,
    activity: [...events].sort((left, right) => right.at - left.at).slice(0, 40),
    uniqueVisits: [...latestVisits.values()].sort((left, right) => right.at - left.at),
    pageViews: sessions.reduce((total, session) => total + session.pages, 0),
    devices: countBy(sessions, session => session.device),
    browsers: countBy(sessions, session => session.browser || `Unknown`),
    operatingSystems: countBy(sessions, session => session.operatingSystem || `Unknown`),
    visitors: new Set(sessions.map(session => session.visitorKey)).size,
    uniqueViews: new Set(events.filter(event => !!event.visitorKey).map(event => JSON.stringify([event.visitorKey, event.path]))).size,
    online: new Set(sessions.filter(session => session.active && now - session.lastSeen < ONLINE_WINDOW_MS).map(session => session.visitorKey)).size,
    bounceRate: sessions.length ? Math.round(sessions.filter(session => session.pages === 1).length / sessions.length * 100) : 0,
    avgDuration: sessions.length ? Math.round(sessions.reduce((total, session) => total + session.activeMs, 0) / sessions.length / 1_000) : 0,
    buckets: timeline(sessions.map(session => session.startedAt), now),
    userBuckets: timeline(context.accounts.map(account => account.createdAt ?? 0), now),
  };
};
export const trimHistory = (record: StoredCollector) => {
  record.sessions = record.sessions.slice(-MAX_SESSIONS);
  record.activity = record.activity.slice(-MAX_ACTIVITY);
};

const demoCountries = [
  { code: `US`, name: `United States`, count: 584, latitude: 38.9, longitude: -77.04 },
  { code: `GB`, name: `United Kingdom`, count: 330, latitude: 51.51, longitude: -0.13 },
  { code: `DE`, name: `Germany`, count: 176, latitude: 52.52, longitude: 13.4 },
  { code: `JP`, name: `Japan`, count: 112, latitude: 35.68, longitude: 139.69 },
  { code: `BR`, name: `Brazil`, count: 82, latitude: -23.55, longitude: -46.63 },
];
const demoSources = [{ name: `Direct`, count: 566 }, { name: `Google`, count: 334 }, { name: `Instagram`, count: 231 }, { name: `GitHub`, count: 153 }];
const demoIpBlocks = [`192.0.2`, `198.51.100`, `203.0.113`];
const chooseCounted = <T extends { count: number }>(items: T[], index: number) => {
  let remaining = index;
  return items.find(item => {
    remaining -= item.count;
    return remaining < 0;
  }) ?? items?.[0];
};
const coprimeStride = (length: number) => {
  const gcd = (left: number, right: number): number => right ? gcd(right, left % right) : left;
  let stride = 389;
  while (gcd(stride, length) !== 1) stride += 2;
  return stride;
};
export const createDemo = (tick = 0, now = Date.now()): AnalyticsSnapshot => {
  const step = Math.min(1_000, Math.max(0, Math.floor(tick)));
  const visitors = 1_284 + step;
  const countries = demoCountries.map((country, index) => ({ ...country, count: country.count + Math.floor((step + 4 - index) / 5) }));
  const sources = demoSources.map((source, index) => {
    const count = source.count + Math.floor((step + 3 - index) / 4);
    return { ...source, count, percent: Math.round(count / visitors * 100) };
  });
  const bucketEnd = Math.floor(now / BUCKET_MS) * BUCKET_MS;
  const labels = timeline([], now).map(bucket => bucket.label);
  const buckets = [24, 31, 28, 42, 36, 54, 48, 62, 51, 72, 64, 81].map((value, index) => ({ label: labels?.[index] ?? ``, value: value + (index === 11 ? step % 20 : 0) }));
  const userBuckets = [4, 8, 5, 9, 11, 12, 10, 17, 16, 13, 20, 17].map((value, index) => ({ label: labels?.[index] ?? ``, value: value + (index === 11 ? Math.floor(step / 3) : 0) }));
  const timestamps = buckets.flatMap((bucket, index) => {
    const start = bucketEnd - (11 - index) * BUCKET_MS;
    const span = Math.min(BUCKET_MS, Math.max(0, now - start));
    return Array.from({ length: bucket.value }, (_, entry) => start + Math.floor(span * entry / bucket.value));
  });
  const olderCount = visitors - timestamps.length;
  for (let index = 0; index < olderCount; index++) timestamps.push(bucketEnd - 12 * BUCKET_MS - index * 37_000);
  timestamps.sort((left, right) => right - left);
  const stride = coprimeStride(visitors);
  const uniqueVisits: Activity[] = timestamps.map((at, index) => {
    const rank = index * stride % visitors;
    return {
      at, type: `visit`, path: `/`, id: `demo-visit-${step}-${index}`, visitorKey: `demo-visitor-${index}`, sessionId: `demo-session-${index}`,
      source: chooseCounted(sources, rank)?.name ?? `Unknown`, countryCode: chooseCounted(countries, rank)?.code ?? `unknown`,
      ipAddress: `${demoIpBlocks[index % demoIpBlocks.length] ?? `192.0.2`}.${index % 254 + 1}`,
    };
  });
  return {
    sources,
    countries,
    visitors,
    buckets,
    userBuckets,
    uniqueVisits,
    updatedAt: now,
    totalVisits: visitors,
    avgDuration: 147,
    bounceRate: 31.2,
    online: 24 + step % 7,
    uniqueViews: 2_140 + step * 2,
    pageViews: 2_846 + step * 2,
    savedLocations: countries.length,
    signedUpUsers: userBuckets.reduce((total, bucket) => total + bucket.value, 0),
    devices: [{ name: `Desktop`, count: 796 + step }, { name: `Mobile`, count: 424 }, { name: `Tablet`, count: 64 }],
    browsers: [{ name: `Chrome`, count: 720 + step }, { name: `Safari`, count: 362 }, { name: `Firefox`, count: 112 }, { name: `Edge`, count: 90 }],
    operatingSystems: [{ name: `Windows`, count: 568 + step }, { name: `macOS`, count: 200 }, { name: `iOS`, count: 282 }, { name: `Android`, count: 206 }, { name: `Linux`, count: 28 }],
    activity: uniqueVisits.slice(0, 16).map((visit, index) => index % 3 ? visit : { ...visit, type: `page`, path: `/pricing`, id: `${visit.id}-page`, at: Math.min(now, visit.at + 1_000) }),
  };
};
