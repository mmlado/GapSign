import Keycard from 'keycard-sdk';
import { Commandset } from 'keycard-sdk/dist/commandset';

import { KEYCARD_CA_PUBLIC_KEY } from '../constants/keycard';

/**
 * Returns true if the card proves it was manufactured by Keycard.
 * Throws if the IDENT APDU itself fails (e.g. sw !== 0x9000) — that is a
 * protocol error, not a "not genuine" result.
 * Returns false if the recovered CA key does not match the expected key.
 */
export async function checkGenuine(cmdSet: Commandset): Promise<boolean> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const resp = await cmdSet.identifyCard(challenge);

  if (resp.sw === 0x6985) {
    // Card has no identity certificate — cannot verify authenticity.
    return false;
  }

  if (resp.sw !== 0x9000) {
    throw new Error(`IDENT failed: 0x${resp.sw.toString(16).toUpperCase()}`);
  }

  try {
    const recovered = Keycard.Certificate.verifyIdentity(challenge, resp.data);
    if (recovered.length !== KEYCARD_CA_PUBLIC_KEY.length) return false;
    return recovered.every((b, i) => b === KEYCARD_CA_PUBLIC_KEY[i]);
  } catch {
    return false;
  }
}
