/* eslint-disable no-bitwise */
import { CryptoKeypath, PathComponent } from '@keystonehq/bc-ur-registry';

export function numberToFingerprintBuffer(fingerprint: number): Buffer {
  return Buffer.from([
    (fingerprint >>> 24) & 0xff,
    (fingerprint >>> 16) & 0xff,
    (fingerprint >>> 8) & 0xff,
    fingerprint & 0xff,
  ]);
}

export function derivationPathToKeypath(
  derivationPath: string,
  sourceFingerprint: number,
): CryptoKeypath {
  const components = derivationPath
    .split('/')
    .slice(1)
    .map(part => {
      const hardened = part.endsWith("'");
      const index = parseInt(hardened ? part.slice(0, -1) : part, 10);
      return new PathComponent({ index, hardened });
    });

  return new CryptoKeypath(
    components,
    numberToFingerprintBuffer(sourceFingerprint),
    components.length,
  );
}

export function coinTypeFromPath(derivationPath: string): number {
  const match = derivationPath.match(/^m\/\d+'\/(\d+)'/);
  return match ? parseInt(match[1], 10) : 0;
}
