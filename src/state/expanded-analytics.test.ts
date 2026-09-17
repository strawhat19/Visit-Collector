import test from 'node:test';
import assert from 'node:assert/strict';
import { detectWebClient } from './client';
import { updateSession } from './sessions';
import { decodeRecord, freshRecord } from './records';
import { aggregateAnalytics, createDemo } from './analytics';
import type { Activity, LocalAccount, VisitSession } from './types';
import { MAX_LOCATIONS, saveLocation, validateLocation } from './locations';

const now = Date.UTC(2026, 8, 17, 12, 0);
const account = (id: string, createdAt?: number): LocalAccount => ({
  id, createdAt, number: id === `a` ? 2 : 3, username: `Alex`, email: `${id}@example.com`,
  verifier: { hash: `1`.repeat(64), salt: `2`.repeat(32), iterations: 600_000 },
});
const session = (id: string, visitorKey: string, startedAt: number): VisitSession => ({
  id, visitorKey, startedAt, lastSeen: now, pages: 1, active: true, activeMs: 0,
  source: `Direct`, device: `Desktop`, browser: `Chrome`, countryCode: `unknown`,
});
const event = (id: string, visitorKey: string | undefined, path: string, at: number, type: Activity[`type`] = `visit`): Activity => ({
  id, visitorKey, path, at, type, countryCode: `unknown`, source: `Direct`,
});
test(`Deduplicates Visitor Page Pairs And Keeps Each Visitor's Latest Visit`, () => {
  const sessions = [session(`a1`, `a`, now - 30_000), session(`a2`, `a`, now - 10_000), session(`b1`, `b`, now - 5_000)];
  const events = [event(`first-a`, `a`, `/`, now - 30_000), event(`pricing`, `a`, `/pricing`, now - 20_000, `page`),
    event(`latest-a`, `a`, `/`, now - 10_000), event(`first-b`, `b`, `/`, now - 5_000), event(`legacy-page`, undefined, `/unattributed`, now, `page`)];
  const data = aggregateAnalytics(sessions, events, now);
  assert.equal(data.uniqueViews, 3);
  assert.deepEqual(data.uniqueVisits.map(visit => visit.id), [`first-b`, `latest-a`]);
  assert.deepEqual(data.browsers, [{ name: `Chrome`, count: 3 }]);
  assert.deepEqual(data.operatingSystems, [{ name: `Unknown`, count: 3 }]);
});
test(`Counts All Accounts But Only Known Signup Dates In The Timeline`, () => {
  const record = freshRecord();
  record.accounts = [account(`a`), account(`b`, now - 10 * 60_000)];
  const data = aggregateAnalytics([], [], now, record);
  assert.equal(data.signedUpUsers, 2);
  assert.equal(data.userBuckets.reduce((total, bucket) => total + bucket.value, 0), 1);
  assert.equal(data.userBuckets.at(-3)?.value, 1);
});
test(`Migrates Existing V1 Accounts And Sessions Without Inventing Dates Or Paths`, () => {
  const { locations, locationAssignments, ...legacy } = freshRecord();
  const stored = decodeRecord(JSON.stringify({ ...legacy, userId: `a`, nextNumber: 3, accounts: [account(`a`)], sessions: [session(`old`, `a`, now - 60_000)] }));
  assert.equal(stored.accounts[0]?.verifier.hash, `1`.repeat(64));
  assert.equal(stored.accounts[0]?.createdAt, 0);
  assert.equal(stored.sessions[0]?.operatingSystem, `Unknown`);
  assert.deepEqual(stored.locations, []);
  assert.deepEqual(stored.locationAssignments, {});
  const data = aggregateAnalytics(stored.sessions, stored.activity, now, stored);
  assert.equal(data.signedUpUsers, 1);
  assert.equal(data.uniqueViews, 0);
  assert.equal(data.uniqueVisits[0]?.visitorKey, `a`);
  assert.equal(data.uniqueVisits[0]?.path, `Not Recorded`);
  assert.equal(data.uniqueVisits[0]?.at, now - 60_000);
  const attributed = aggregateAnalytics(stored.sessions, [event(`legacy-visit`, undefined, `/known`, now - 60_000)], now, stored);
  assert.equal(attributed.uniqueViews, 1);
  assert.equal(attributed.uniqueVisits[0]?.path, `/known`);
});
test(`Keeps Saved Locations Scoped To Their Owner And Maps Current And Future Visits`, () => {
  const record = freshRecord();
  let sequence = 0;
  const createId = () => `${sequence++}`;
  const update = { now, createId, path: `/`, active: true, source: `Direct`, device: `Desktop`, browser: `Chrome`, operatingSystem: `Windows`, elapsedMs: 0, recordPage: true, createIfMissing: true };
  const guestSession = updateSession(record, ``, update);
  const boston = saveLocation(record, { name: ` Boston `, latitude: 42.36, longitude: -71.06 }, guestSession, createId, now);
  assert.equal(saveLocation(record, { name: `boston`, latitude: 42.36, longitude: -71.06 }, guestSession, createId, now), boston);
  assert.equal(record.activity[0]?.countryCode, boston);
  assert.equal(record.activity[0]?.sessionId, guestSession);
  assert.equal(record.activity[0]?.visitorKey, `guest-device`);
  record.userId = `a`;
  const accountSession = updateSession(record, guestSession, { ...update, now: now + 1_000 });
  assert.equal(record.sessions.find(visit => visit.id === accountSession)?.countryCode, `unknown`);
  const london = saveLocation(record, { name: `London`, latitude: 51.51, longitude: -0.13 }, accountSession, createId, now);
  record.userId = null;
  const returnedGuest = updateSession(record, accountSession, { ...update, now: now + 2_000 });
  assert.equal(record.sessions.find(visit => visit.id === returnedGuest)?.countryCode, boston);
  const data = aggregateAnalytics(record.sessions, record.activity, now + 2_000, record);
  assert.equal(data.countries.find(location => location.code === boston)?.count, 2);
  assert.equal(data.countries.find(location => location.code === london)?.count, 1);
  assert.equal(data.countries.find(location => location.code === boston)?.latitude, 42.36);
  assert.equal(record.locations.length, 2);
  assert.deepEqual(decodeRecord(JSON.stringify(record)).locations, record.locations);
});
test(`Rejects Invalid Coordinates And Bounds Saved Locations Without Dropping Existing Data`, () => {
  assert.throws(() => validateLocation({ name: `Paris`, latitude: Number.NaN, longitude: 2.35 }));
  assert.throws(() => validateLocation({ name: `Paris`, latitude: 91, longitude: 2.35 }));
  assert.throws(() => validateLocation({ name: `Paris`, latitude: 48.86, longitude: 181 }));
  assert.throws(() => validateLocation({ name: ` `, latitude: 48.86, longitude: 2.35 }));
  assert.doesNotThrow(() => validateLocation({ name: `South Pole`, latitude: -90, longitude: -180 }));
  const record = freshRecord();
  record.accounts = [account(`a`)];
  record.locations = Array.from({ length: MAX_LOCATIONS }, (_, index) => ({ id: `${index}`, ownerKey: `guest-device`, name: `Place ${index}`, latitude: 0, longitude: 0, createdAt: now }));
  assert.throws(() => saveLocation(record, { name: `Extra`, latitude: 1, longitude: 1 }, ``, () => `extra`, now));
  assert.equal(record.accounts.length, 1);
  assert.equal(record.locations.length, MAX_LOCATIONS);
});
test(`Demo Unique Visits, Category Totals, And Signup Timeline Agree`, () => {
  const data = createDemo(17, now);
  assert.equal(data.uniqueVisits.length, data.visitors);
  assert.equal(new Set(data.uniqueVisits.map(visit => visit.visitorKey)).size, data.visitors);
  assert.equal(data.userBuckets.reduce((total, bucket) => total + bucket.value, 0), data.signedUpUsers);
  for (const categories of [data.browsers, data.operatingSystems, data.devices, data.countries, data.sources]) assert.equal(categories.reduce((total, item) => total + item.count, 0), data.visitors);
  assert.equal(data.buckets.reduce((total, bucket) => total + bucket.value, 0), data.uniqueVisits.filter(visit => visit.at >= now - 55 * 60_000).length);
  for (const country of data.countries) assert.equal(data.uniqueVisits.filter(visit => visit.countryCode === country.code).length, country.count);
  assert.ok(data.uniqueViews <= data.pageViews);
});
test(`Detects Mobile Browser Variants, Tablets, And Operating Systems`, () => {
  assert.deepEqual(detectWebClient(`Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) CriOS/135.0 Mobile Safari/604.1`), { device: `Mobile`, browser: `Chrome`, operatingSystem: `iOS` });
  assert.deepEqual(detectWebClient(`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Version/18.0 Safari/605.1`, 5), { device: `Tablet`, browser: `Safari`, operatingSystem: `iPadOS` });
  assert.deepEqual(detectWebClient(`Mozilla/5.0 (Linux; Android 15) SamsungBrowser/28.0 Chrome/131.0 Mobile Safari/537.36`), { device: `Mobile`, browser: `Samsung Internet`, operatingSystem: `Android` });
  assert.equal(detectWebClient(`Mozilla/5.0 (Windows NT 10.0) Chrome/135.0 Safari/537.36 Edg/135.0`).browser, `Edge`);
  assert.equal(detectWebClient(`Mozilla/5.0 (X11; CrOS x86_64 1.0) Chrome/135.0 Safari/537.36`).operatingSystem, `ChromeOS`);
});
