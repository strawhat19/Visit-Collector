import test from 'node:test';
import assert from 'node:assert/strict';
import { freshRecord } from './records';
import { updateSession } from './sessions';

const options = () => {
  let id = 0;
  return {
    now: 1_000, path: `/`, active: true, source: `Direct`, device: `Desktop`, browser: `Chrome`,
    elapsedMs: 0, recordPage: true, createIfMissing: true, createId: () => `id-${id++}`,
  };
};
test(`Account Changes Start New Sessions Without Reassigning Previous History`, () => {
  const record = freshRecord();
  const update = options();
  const guestId = updateSession(record, ``, update);
  record.userId = `account-a`;
  const accountId = updateSession(record, guestId, { ...update, now: 2_000, elapsedMs: 1_000, recordPage: false });
  record.userId = null;
  const signedOutId = updateSession(record, accountId, { ...update, now: 3_000, elapsedMs: 1_000, recordPage: false });
  record.userId = `account-b`;
  updateSession(record, signedOutId, { ...update, now: 4_000, elapsedMs: 1_000, recordPage: false });
  assert.deepEqual(record.sessions.map(session => session.visitorKey), [`guest-device`, `account-a`, `guest-device`, `account-b`]);
  assert.deepEqual(record.sessions.map(session => session.active), [false, false, false, true]);
  assert.deepEqual(record.sessions.map(session => session.activeMs), [1_000, 1_000, 1_000, 0]);
  assert.equal(record.activity.length, 4);
  assert.ok(record.activity.every(event => event.type === `visit`));
});
test(`A Tab Heartbeat Rotates To The Shared Account Without An Extra Page Event`, () => {
  const record = freshRecord();
  const update = options();
  const firstTab = updateSession(record, ``, update);
  const secondTab = updateSession(record, ``, update);
  record.userId = `account-a`;
  updateSession(record, firstTab, { ...update, now: 2_000, recordPage: false });
  const rotated = updateSession(record, secondTab, { ...update, now: 3_000, elapsedMs: 2_000, recordPage: false, createIfMissing: false });
  assert.notEqual(rotated, secondTab);
  assert.equal(record.sessions.find(session => session.id === secondTab)?.visitorKey, `guest-device`);
  assert.equal(record.sessions.find(session => session.id === secondTab)?.active, false);
  assert.equal(record.sessions.find(session => session.id === rotated)?.visitorKey, `account-a`);
  assert.equal(record.sessions.find(session => session.id === rotated)?.pages, 1);
});
test(`Hidden Tabs Close Their Old Session And Defer New Visits Until Active`, () => {
  const record = freshRecord();
  const update = options();
  const oldId = updateSession(record, ``, update);
  record.userId = `account-a`;
  const hiddenId = updateSession(record, oldId, { ...update, now: 2_000, active: false, recordPage: false });
  assert.equal(hiddenId, oldId);
  assert.equal(record.sessions.length, 1);
  assert.equal(record.sessions[0]?.active, false);
  assert.equal(record.activity.length, 1);
  const resumed = updateSession(record, oldId, { ...update, now: 3_000, recordPage: false });
  assert.notEqual(resumed, oldId);
  assert.equal(record.activity.length, 2);
});
test(`Heartbeat Does Not Recreate Cleared History And Unchanged Identity Does Not Rotate`, () => {
  const record = freshRecord();
  const update = options();
  const id = updateSession(record, ``, update);
  assert.equal(updateSession(record, id, { ...update, now: 2_000, recordPage: false }), id);
  assert.equal(record.activity.length, 1);
  record.sessions = [];
  record.activity = [];
  updateSession(record, id, { ...update, now: 3_000, recordPage: false, createIfMissing: false });
  assert.equal(record.sessions.length, 0);
  assert.equal(record.activity.length, 0);
});
