import AsyncStorage from '@react-native-async-storage/async-storage';

const PIN_PAD_SCRAMBLE = 'preference_pinpad_scramble';
const TOKEN_IMAGES_ENABLED = 'preference_token_images_enabled';
const WELCOME_SEEN = 'preference_welcome_seen';
const XPUB_NOTICE_DISMISSED = 'preference_xpub_notice_dismissed';

async function loadBoolean(key: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key)) === '1';
  } catch {
    return false;
  }
}

async function saveBoolean(key: string, value: boolean): Promise<void> {
  await AsyncStorage.setItem(key, value ? '1' : '0');
}

export async function loadPinPadScramble(): Promise<boolean> {
  return loadBoolean(PIN_PAD_SCRAMBLE);
}

export async function savePinPadScramble(value: boolean): Promise<void> {
  return saveBoolean(PIN_PAD_SCRAMBLE, value);
}

export async function loadTokenImagesEnabled(): Promise<boolean> {
  return loadBoolean(TOKEN_IMAGES_ENABLED);
}

export async function saveTokenImagesEnabled(value: boolean): Promise<void> {
  return saveBoolean(TOKEN_IMAGES_ENABLED, value);
}

export async function loadWelcomeSeen(): Promise<boolean> {
  return loadBoolean(WELCOME_SEEN);
}

export async function saveWelcomeSeen(value: boolean): Promise<void> {
  return saveBoolean(WELCOME_SEEN, value);
}

export async function loadXpubNoticeDismissed(): Promise<boolean> {
  return loadBoolean(XPUB_NOTICE_DISMISSED);
}

export async function saveXpubNoticeDismissed(value: boolean): Promise<void> {
  return saveBoolean(XPUB_NOTICE_DISMISSED, value);
}
