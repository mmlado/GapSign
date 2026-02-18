import EncryptedStorage from 'react-native-encrypted-storage';
import Keycard from 'keycard-sdk';

const KEY_PREFIX = 'pairing_';

export async function loadPairing(
  instanceUID: string,
): Promise<Keycard.Pairing | null> {
  try {
    const value = await EncryptedStorage.getItem(KEY_PREFIX + instanceUID);
    if (!value) {
      return null;
    }
    return Keycard.Pairing.fromString(value);
  } catch {
    return null;
  }
}

export async function savePairing(
  instanceUID: string,
  pairing: Keycard.Pairing,
): Promise<void> {
  await EncryptedStorage.setItem(KEY_PREFIX + instanceUID, pairing.toBase64());
}

export async function deletePairing(instanceUID: string): Promise<void> {
  await EncryptedStorage.removeItem(KEY_PREFIX + instanceUID);
}
