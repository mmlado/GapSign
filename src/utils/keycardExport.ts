import Keycard from 'keycard-sdk';
import type { Commandset } from 'keycard-sdk/dist/commandset';

import { pubKeyFingerprint } from './cryptoAccount';

/** One key an export target wants: the path to export and the parent path its fingerprint comes from. */
export type ExportPlanEntry = {
  derivationPath: string;
  parentPath: string;
};

/** An exported key carrying the plan entry it was exported for, so per-key metadata travels with the key. */
export type ExportedKey<E extends ExportPlanEntry = ExportPlanEntry> = {
  entry: E;
  exportRespData: Uint8Array;
  parentFingerprint: number;
};

export type ExportKeysResult<E extends ExportPlanEntry = ExportPlanEntry> = {
  masterFingerprint: number;
  keys: ExportedKey<E>[];
};

function fingerprintFromExportResponse(data: Uint8Array): number {
  return pubKeyFingerprint(Keycard.BIP32KeyPair.fromTLV(data).publicKey);
}

/**
 * The generic card-session executor for wallet exports: reads the master
 * fingerprint once, then exports every planned key with its parent
 * fingerprint (parents are fetched once per distinct path). Which keys to
 * export and what UR to build from them is declared by an ExportTarget
 * (see exportTargets.ts).
 */
export async function exportKeysForTarget<E extends ExportPlanEntry>(
  cmdSet: Commandset,
  entries: readonly E[],
  setStatus: (s: string) => void = () => {},
): Promise<ExportKeysResult<E>> {
  setStatus('Reading master key...');
  const masterResp = await cmdSet.exportKey(0, true, 'm', false);
  masterResp.checkOK();
  const masterFingerprint = fingerprintFromExportResponse(masterResp.data);

  const parentFingerprints = new Map<string, number>([
    ['m', masterFingerprint],
  ]);

  const keys: ExportedKey<E>[] = [];
  for (const [index, entry] of entries.entries()) {
    setStatus(`Exporting key ${index + 1} of ${entries.length}...`);

    let parentFingerprint = parentFingerprints.get(entry.parentPath);
    if (parentFingerprint === undefined) {
      const parentResp = await cmdSet.exportKey(
        0,
        true,
        entry.parentPath,
        false,
      );
      parentResp.checkOK();
      parentFingerprint = fingerprintFromExportResponse(parentResp.data);
      parentFingerprints.set(entry.parentPath, parentFingerprint);
    }

    const resp = await cmdSet.exportExtendedKey(0, entry.derivationPath, false);
    resp.checkOK();
    keys.push({ entry, exportRespData: resp.data, parentFingerprint });
  }

  return { masterFingerprint, keys };
}
