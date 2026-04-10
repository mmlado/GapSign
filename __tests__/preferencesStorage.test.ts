import {
  loadBooleanPreference,
  preferenceKeys,
  saveBooleanPreference,
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

  describe('loadBooleanPreference', () => {
    it('uses the provided storage key', async () => {
      mockGetItem.mockResolvedValue(null);
      await loadBooleanPreference(
        preferenceKeys.dashboardKeycardNoticeDismissed,
      );
      expect(mockGetItem).toHaveBeenCalledWith(
        'preference_dashboard_keycard_notice_dismissed',
      );
    });

    it('returns true when the stored value is enabled', async () => {
      mockGetItem.mockResolvedValue('1');
      expect(
        await loadBooleanPreference(
          preferenceKeys.dashboardKeycardNoticeDismissed,
        ),
      ).toBe(true);
    });

    it('returns false when the stored value is missing', async () => {
      mockGetItem.mockResolvedValue(null);
      expect(
        await loadBooleanPreference(
          preferenceKeys.dashboardKeycardNoticeDismissed,
        ),
      ).toBe(false);
    });

    it('returns false when storage throws', async () => {
      mockGetItem.mockRejectedValue(new Error('storage failure'));
      expect(
        await loadBooleanPreference(
          preferenceKeys.dashboardKeycardNoticeDismissed,
        ),
      ).toBe(false);
    });
  });

  describe('saveBooleanPreference', () => {
    it('stores enabled preferences as 1', async () => {
      mockSetItem.mockResolvedValue(undefined);
      await saveBooleanPreference(
        preferenceKeys.dashboardKeycardNoticeDismissed,
        true,
      );
      expect(mockSetItem).toHaveBeenCalledWith(
        'preference_dashboard_keycard_notice_dismissed',
        '1',
      );
    });

    it('stores disabled preferences as 0', async () => {
      mockSetItem.mockResolvedValue(undefined);
      await saveBooleanPreference(
        preferenceKeys.dashboardKeycardNoticeDismissed,
        false,
      );
      expect(mockSetItem).toHaveBeenCalledWith(
        'preference_dashboard_keycard_notice_dismissed',
        '0',
      );
    });
  });
});
