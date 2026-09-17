import { sha256 } from '@noble/hashes/sha2.js';
import type { PasswordVerifier } from './types';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';

// Local prototype accounts are editable device data, not an authorization boundary.
export const PASSWORD_ITERATIONS = 600_000;
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const validateAccount = (username: string, email: string, password: string) => {
  if (username.trim().length < 2 || username.trim().length > 40) throw new Error(`Use A Name Between 2 And 40 Characters`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email)) || email.length > 254) throw new Error(`Enter A Valid Email Address`);
  if (password.length < 8 || password.length > 128) throw new Error(`Use A Password Between 8 And 128 Characters`);
};
export const createVerifier = async (password: string, salt: Uint8Array): Promise<PasswordVerifier> => {
  const bytes = utf8ToBytes(password);
  try {
    const hash = await pbkdf2Async(sha256, bytes, salt, { dkLen: 32, asyncTick: 8, c: PASSWORD_ITERATIONS });
    return { hash: bytesToHex(hash), salt: bytesToHex(salt), iterations: PASSWORD_ITERATIONS };
  } finally { bytes.fill(0); }
};
export const verifyPassword = async (password: string, verifier: PasswordVerifier) => {
  if (password.length > 128 || verifier.iterations !== PASSWORD_ITERATIONS) return false;
  if (!/^[a-f0-9]{32}$/.test(verifier.salt) || !/^[a-f0-9]{64}$/.test(verifier.hash)) return false;
  const candidate = await createVerifier(password, hexToBytes(verifier.salt));
  let difference = 0;
  for (let index = 0; index < verifier.hash.length; index++) difference |= verifier.hash.charCodeAt(index) ^ candidate.hash.charCodeAt(index);
  return difference === 0;
};
