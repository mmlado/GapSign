import { hmac } from '@noble/hashes/hmac.js';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256, sha512 } from '@noble/hashes/sha2.js';
import { Buffer } from 'buffer';
import RIPEMD160 from 'ripemd160';

type HashAlgorithm = 'sha256' | 'sha512' | 'rmd160' | 'ripemd160';

function toBytes(data: Uint8Array | string): Uint8Array {
  return typeof data === 'string' ? Buffer.from(data) : data;
}

function normalizeAlgorithm(algorithm: string): HashAlgorithm {
  const normalized = algorithm.toLowerCase() as HashAlgorithm;
  if (
    normalized !== 'sha256' &&
    normalized !== 'sha512' &&
    normalized !== 'rmd160' &&
    normalized !== 'ripemd160'
  ) {
    throw new Error(`Unsupported crypto hash algorithm: ${algorithm}`);
  }
  return normalized;
}

function digestHash(algorithm: HashAlgorithm, data: Uint8Array): Uint8Array {
  if (algorithm === 'sha256') {
    return sha256(data);
  }
  if (algorithm === 'sha512') {
    return sha512(data);
  }
  return new RIPEMD160().update(Buffer.from(data)).digest();
}

class Hash {
  private chunks: Uint8Array[] = [];

  constructor(private algorithm: HashAlgorithm) {}

  update(data: Uint8Array | string) {
    this.chunks.push(toBytes(data));
    return this;
  }

  digest() {
    return Buffer.from(digestHash(this.algorithm, Buffer.concat(this.chunks)));
  }
}

class Hmac {
  private chunks: Uint8Array[] = [];

  constructor(private algorithm: HashAlgorithm, private key: Uint8Array) {}

  update(data: Uint8Array | string) {
    this.chunks.push(toBytes(data));
    return this;
  }

  digest() {
    const data = Buffer.concat(this.chunks);
    if (this.algorithm === 'sha256') {
      return Buffer.from(hmac(sha256, this.key, data));
    }
    if (this.algorithm === 'sha512') {
      return Buffer.from(hmac(sha512, this.key, data));
    }
    throw new Error(`Unsupported crypto HMAC algorithm: ${this.algorithm}`);
  }
}

export function createHash(algorithm: string) {
  return new Hash(normalizeAlgorithm(algorithm));
}

export function createHmac(algorithm: string, key: Uint8Array | string) {
  return new Hmac(normalizeAlgorithm(algorithm), toBytes(key));
}

export function pbkdf2Sync(
  password: Uint8Array | string,
  salt: Uint8Array | string,
  iterations: number,
  keylen: number,
  digest: string,
) {
  const algorithm = normalizeAlgorithm(digest);
  if (algorithm !== 'sha256' && algorithm !== 'sha512') {
    throw new Error(`Unsupported crypto PBKDF2 algorithm: ${digest}`);
  }
  return Buffer.from(
    pbkdf2(
      algorithm === 'sha256' ? sha256 : sha512,
      toBytes(password),
      toBytes(salt),
      {
        c: iterations,
        dkLen: keylen,
      },
    ),
  );
}

export function randomBytes(size: number) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes);
}

export const rng = randomBytes;
export const pseudoRandomBytes = randomBytes;
export const prng = randomBytes;
