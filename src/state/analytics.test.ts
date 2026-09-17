import test from 'node:test';
import assert from 'node:assert/strict';
import type { Activity, VisitSession } from './types';
import { freshRecord, decodeRecord } from './records';
import { aggregateAnalytics, createDemo, trimHistory } from './analytics';

const now = Date.UTC(2026, 8, 17, 12, 0);
const session = (patch: Partial<VisitSession> = {}): VisitSession => ({
  id: `session`, pages: 1, active: true, device: `Desktop`, source: `Direct`, browser: `Chrome`,
  activeMs: 60_000, startedAt: now - 60_000, lastSeen: now, visitorKey: `guest-device`, countryCode: `unknown`, ...patch,
});
const event = (patch: Partial<Activity> = {}): Activity => ({ id: `event`, type: `visit`, source: `Direct`, path: `/`, at: now, countryCode: `unknown`, ...patch });

test(`Aggregates Real Sessions And Keeps Unknown Locations Unplotted`, () => {
  const sessions = [session(), session({ id: `second-tab`, pages: 3, source: `example.com`, activeMs: 120_000 }), session({ id: `old`, visitorKey: `other`, active: false, lastSeen: now - 100_000, activeMs: 0 })];
  const data = aggregateAnalytics(sessions, [event()], now);
  assert.equal(data.visitors, 2);
  assert.equal(data.pageViews, 5);
  assert.equal(data.online, 1);
  assert.equal(data.avgDuration, 60);
  assert.equal(data.bounceRate, 67);
  assert.deepEqual(data.countries, [{ code: `unknown`, name: `Unknown Location`, count: 3, latitude: null, longitude: null }]);
  assert.deepEqual(data.sources, [{ name: `Direct`, count: 2, percent: 67 }, { name: `example.com`, count: 1, percent: 33 }]);
});
test(`Expires Online Presence And Places Sessions At Bucket Boundaries`, () => {
  const data = aggregateAnalytics([session({ lastSeen: now - 45_000, startedAt: now }), session({ id: `earlier`, startedAt: now - 5 * 60_000, active: false })], [], now);
  assert.equal(data.online, 0);
  assert.equal(data.buckets.at(-1)?.value, 1);
  assert.equal(data.buckets.at(-2)?.value, 1);
  assert.equal(data.buckets.reduce((sum, bucket) => sum + bucket.value, 0), 2);
});
test(`Bounds Stored History And Returns Newest Activity First`, () => {
  const record = freshRecord();
  record.sessions = Array.from({ length: 510 }, (_, index) => session({ id: `${index}` }));
  record.activity = Array.from({ length: 1_010 }, (_, index) => event({ id: `${index}`, at: index }));
  trimHistory(record);
  assert.equal(record.sessions.length, 500);
  assert.equal(record.activity.length, 1_000);
  assert.equal(record.sessions[0]?.id, `10`);
  assert.equal(aggregateAnalytics(record.sessions, record.activity, now).activity[0]?.id, `1009`);
});
test(`Demo Updates Stay Consistent And Never Mutate Their Prior Snapshot`, () => {
  const first = createDemo(0, now);
  const next = createDemo(7, now + 4_000);
  assert.equal(first.visitors, 1_284);
  assert.equal(next.visitors, 1_291);
  assert.equal(next.countries.reduce((sum, country) => sum + country.count, 0), next.visitors);
  assert.equal(next.sources.reduce((sum, source) => sum + source.count, 0), next.visitors);
  assert.equal(next.devices.reduce((sum, device) => sum + device.count, 0), next.visitors);
  assert.ok(next.countries.every(country => country.latitude !== null && country.longitude !== null));
});
test(`Rejects Malformed Or Incompatible Stored Data`, () => {
  assert.deepEqual(decodeRecord(null), freshRecord());
  assert.throws(() => decodeRecord(`{broken`));
  assert.throws(() => decodeRecord(JSON.stringify({ ...freshRecord(), version: 2 })));
  assert.throws(() => decodeRecord(JSON.stringify({ ...freshRecord(), preferences: { theme: `neon` } })));
  assert.throws(() => decodeRecord(JSON.stringify({ ...freshRecord(), sessions: [{ ...session(), activeMs: -1 }] })));
  assert.deepEqual(decodeRecord(JSON.stringify(freshRecord())), freshRecord());
});
