import test from 'node:test';
import assert from 'node:assert/strict';
import { pbkdf2Sync } from 'node:crypto';
import { createVerifier, normalizeEmail, validateAccount, verifyPassword, PASSWORD_ITERATIONS } from './auth';

test(`Normalizes Emails And Rejects Invalid Account Input`, () => {
  assert.equal(normalizeEmail(`  ALEX@Example.com `), `alex@example.com`);
  assert.throws(() => validateAccount(`A`, `alex@example.com`, `long-password`));
  assert.throws(() => validateAccount(`Alex`, `not-an-email`, `long-password`));
  assert.throws(() => validateAccount(`Alex`, `alex@example.com`, `short`));
  assert.doesNotThrow(() => validateAccount(`Alex`, `alex@example.com`, `long-password`));
});
test(`Salted Password Verifier Matches PBKDF2 And Rejects Wrong Passwords`, async () => {
  const password = `a-long-local-password`;
  const salt = Uint8Array.from({ length: 16 }, (_, index) => index);
  const verifier = await createVerifier(password, salt);
  const expected = pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, 32, `sha256`).toString(`hex`);
  assert.equal(verifier.hash, expected);
  assert.equal(JSON.stringify(verifier).includes(password), false);
  assert.equal(await verifyPassword(password, verifier), true);
  assert.equal(await verifyPassword(`wrong-password`, verifier), false);
  assert.equal(await verifyPassword(password, { ...verifier, iterations: 1 }), false);
  assert.equal(await verifyPassword(password, { ...verifier, salt: `invalid` }), false);
});
