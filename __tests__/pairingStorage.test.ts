import {loadPairing, savePairing, deletePairing} from '../src/storage/pairingStorage';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();

jest.mock('react-native-encrypted-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...args: any[]) => mockGetItem(...args),
    setItem: (...args: any[]) => mockSetItem(...args),
    removeItem: (...args: any[]) => mockRemoveItem(...args),
  },
}));

const mockFromString = jest.fn();
const mockToBase64 = jest.fn();

jest.mock('keycard-sdk', () => ({
  __esModule: true,
  default: {
    Pairing: {
      fromString: (...args: any[]) => mockFromString(...args),
    },
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('pairingStorage', () => {
  beforeEach(() => {
    mockGetItem.mockReset();
    mockSetItem.mockReset();
    mockRemoveItem.mockReset();
    mockFromString.mockReset();
    mockToBase64.mockReset();
  });

  describe('loadPairing', () => {
    it('uses the correct storage key', async () => {
      mockGetItem.mockResolvedValue(null);
      await loadPairing('abc123');
      expect(mockGetItem).toHaveBeenCalledWith('pairing_abc123');
    });

    it('returns null when no entry is stored', async () => {
      mockGetItem.mockResolvedValue(null);
      expect(await loadPairing('abc123')).toBeNull();
    });

    it('returns the parsed Pairing when an entry exists', async () => {
      const fakePairing = {pairingIndex: 0};
      mockGetItem.mockResolvedValue('base64data');
      mockFromString.mockReturnValue(fakePairing);
      const result = await loadPairing('abc123');
      expect(mockFromString).toHaveBeenCalledWith('base64data');
      expect(result).toBe(fakePairing);
    });

    it('returns null when EncryptedStorage throws', async () => {
      mockGetItem.mockRejectedValue(new Error('storage failure'));
      expect(await loadPairing('abc123')).toBeNull();
    });

    it('returns null when Pairing.fromString throws', async () => {
      mockGetItem.mockResolvedValue('corrupted');
      mockFromString.mockImplementation(() => {
        throw new Error('invalid pairing data');
      });
      expect(await loadPairing('abc123')).toBeNull();
    });
  });

  describe('savePairing', () => {
    it('stores the pairing base64 under the correct key', async () => {
      mockSetItem.mockResolvedValue(undefined);
      mockToBase64.mockReturnValue('encoded==');
      const fakePairing = {toBase64: mockToBase64} as any;
      await savePairing('abc123', fakePairing);
      expect(mockSetItem).toHaveBeenCalledWith('pairing_abc123', 'encoded==');
    });
  });

  describe('deletePairing', () => {
    it('removes the entry under the correct key', async () => {
      mockRemoveItem.mockResolvedValue(undefined);
      await deletePairing('abc123');
      expect(mockRemoveItem).toHaveBeenCalledWith('pairing_abc123');
    });
  });
});
