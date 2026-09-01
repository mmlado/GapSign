import {
  loadPinPadScramble,
  loadTokenImagesEnabled,
  loadWelcomeSeen,
  loadXpubNoticeDismissed,
  savePinPadScramble,
  saveTokenImagesEnabled,
  saveWelcomeSeen,
  saveXpubNoticeDismissed,
} from '../src/storage/preferencesStorage';

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...args: any[]) => mockGetItem(...args),
    setItem: (...args: any[]) => mockSetItem(...args),
  },
}));

describe('preferencesStorage', () => {
  beforeEach(() => {
    mockGetItem.mockReset();
    mockSetItem.mockReset();
  });

  describe('loadPinPadScramble', () => {
    it('reads the correct storage key', async () => {
      mockGetItem.mockResolvedValue(null);
      await loadPinPadScramble();
      expect(mockGetItem).toHaveBeenCalledWith('preference_pinpad_scramble');
    });

    it('returns true when stored value is "1"', async () => {
      mockGetItem.mockResolvedValue('1');
      expect(await loadPinPadScramble()).toBe(true);
    });

    it('returns false when nothing stored', async () => {
      mockGetItem.mockResolvedValue(null);
      expect(await loadPinPadScramble()).toBe(false);
    });

    it('returns false when storage throws', async () => {
      mockGetItem.mockRejectedValue(new Error('storage failure'));
      expect(await loadPinPadScramble()).toBe(false);
    });
  });

  describe('savePinPadScramble', () => {
    it('stores true as "1"', async () => {
      mockSetItem.mockResolvedValue(undefined);
      await savePinPadScramble(true);
      expect(mockSetItem).toHaveBeenCalledWith(
        'preference_pinpad_scramble',
        '1',
      );
    });

    it('stores false as "0"', async () => {
      mockSetItem.mockResolvedValue(undefined);
      await savePinPadScramble(false);
      expect(mockSetItem).toHaveBeenCalledWith(
        'preference_pinpad_scramble',
        '0',
      );
    });
  });

  describe('loadTokenImagesEnabled', () => {
    it('reads the correct storage key', async () => {
      mockGetItem.mockResolvedValue(null);
      await loadTokenImagesEnabled();
      expect(mockGetItem).toHaveBeenCalledWith(
        'preference_token_images_enabled',
      );
    });

    it('returns false when nothing stored (opt-in default)', async () => {
      mockGetItem.mockResolvedValue(null);
      expect(await loadTokenImagesEnabled()).toBe(false);
    });

    it('returns true when stored value is "1"', async () => {
      mockGetItem.mockResolvedValue('1');
      expect(await loadTokenImagesEnabled()).toBe(true);
    });

    it('returns false when stored value is "0"', async () => {
      mockGetItem.mockResolvedValue('0');
      expect(await loadTokenImagesEnabled()).toBe(false);
    });

    it('returns false when storage throws', async () => {
      mockGetItem.mockRejectedValue(new Error('storage failure'));
      expect(await loadTokenImagesEnabled()).toBe(false);
    });
  });

  describe('saveTokenImagesEnabled', () => {
    it('stores true as "1"', async () => {
      mockSetItem.mockResolvedValue(undefined);
      await saveTokenImagesEnabled(true);
      expect(mockSetItem).toHaveBeenCalledWith(
        'preference_token_images_enabled',
        '1',
      );
    });

    it('stores false as "0"', async () => {
      mockSetItem.mockResolvedValue(undefined);
      await saveTokenImagesEnabled(false);
      expect(mockSetItem).toHaveBeenCalledWith(
        'preference_token_images_enabled',
        '0',
      );
    });
  });

  describe('loadWelcomeSeen', () => {
    it('reads the correct storage key', async () => {
      mockGetItem.mockResolvedValue(null);
      await loadWelcomeSeen();
      expect(mockGetItem).toHaveBeenCalledWith('preference_welcome_seen');
    });

    it('returns true when stored value is "1"', async () => {
      mockGetItem.mockResolvedValue('1');
      expect(await loadWelcomeSeen()).toBe(true);
    });

    it('returns false when nothing stored (first run)', async () => {
      mockGetItem.mockResolvedValue(null);
      expect(await loadWelcomeSeen()).toBe(false);
    });

    it('returns false when storage throws', async () => {
      mockGetItem.mockRejectedValue(new Error('storage failure'));
      expect(await loadWelcomeSeen()).toBe(false);
    });
  });

  describe('saveWelcomeSeen', () => {
    it('stores true as "1"', async () => {
      mockSetItem.mockResolvedValue(undefined);
      await saveWelcomeSeen(true);
      expect(mockSetItem).toHaveBeenCalledWith('preference_welcome_seen', '1');
    });

    it('stores false as "0"', async () => {
      mockSetItem.mockResolvedValue(undefined);
      await saveWelcomeSeen(false);
      expect(mockSetItem).toHaveBeenCalledWith('preference_welcome_seen', '0');
    });
  });

  describe('loadXpubNoticeDismissed', () => {
    it('reads the correct storage key', async () => {
      mockGetItem.mockResolvedValue(null);
      await loadXpubNoticeDismissed();
      expect(mockGetItem).toHaveBeenCalledWith(
        'preference_xpub_notice_dismissed',
      );
    });

    it('returns true when stored value is "1"', async () => {
      mockGetItem.mockResolvedValue('1');
      expect(await loadXpubNoticeDismissed()).toBe(true);
    });

    it('returns false when nothing stored', async () => {
      mockGetItem.mockResolvedValue(null);
      expect(await loadXpubNoticeDismissed()).toBe(false);
    });

    it('returns false when storage throws', async () => {
      mockGetItem.mockRejectedValue(new Error('storage failure'));
      expect(await loadXpubNoticeDismissed()).toBe(false);
    });
  });

  describe('saveXpubNoticeDismissed', () => {
    it('stores true as "1"', async () => {
      mockSetItem.mockResolvedValue(undefined);
      await saveXpubNoticeDismissed(true);
      expect(mockSetItem).toHaveBeenCalledWith(
        'preference_xpub_notice_dismissed',
        '1',
      );
    });

    it('stores false as "0"', async () => {
      mockSetItem.mockResolvedValue(undefined);
      await saveXpubNoticeDismissed(false);
      expect(mockSetItem).toHaveBeenCalledWith(
        'preference_xpub_notice_dismissed',
        '0',
      );
    });
  });
});
