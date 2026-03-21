import Keycard from 'keycard-sdk';

import { checkGenuine } from '../src/utils/genuineCheck';
import { KEYCARD_CA_PUBLIC_KEY } from '../src/constants/keycard';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('keycard-sdk', () => ({
  __esModule: true,
  default: {
    Certificate: {
      verifyIdentity: jest.fn(),
    },
  },
}));

const mockVerifyIdentity = Keycard.Certificate
  .verifyIdentity as jest.MockedFunction<
  typeof Keycard.Certificate.verifyIdentity
>;

function makeCmdSet(sw: number, data: Uint8Array = new Uint8Array()) {
  return {
    identifyCard: jest.fn().mockResolvedValue({ sw, data }),
  } as any;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('checkGenuine', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when recovered CA key matches', async () => {
    const cmdSet = makeCmdSet(0x9000, new Uint8Array(65));
    mockVerifyIdentity.mockReturnValue(KEYCARD_CA_PUBLIC_KEY);
    await expect(checkGenuine(cmdSet)).resolves.toBe(true);
  });

  it('returns false when recovered CA key does not match', async () => {
    const wrongKey = new Uint8Array(KEYCARD_CA_PUBLIC_KEY.length).fill(0xff);
    const cmdSet = makeCmdSet(0x9000, new Uint8Array(65));
    mockVerifyIdentity.mockReturnValue(wrongKey);
    await expect(checkGenuine(cmdSet)).resolves.toBe(false);
  });

  it('returns false when recovered key has wrong length', async () => {
    const cmdSet = makeCmdSet(0x9000, new Uint8Array(65));
    mockVerifyIdentity.mockReturnValue(new Uint8Array(10));
    await expect(checkGenuine(cmdSet)).resolves.toBe(false);
  });

  it('returns false when verifyIdentity throws (invalid signature)', async () => {
    const cmdSet = makeCmdSet(0x9000, new Uint8Array(65));
    mockVerifyIdentity.mockImplementation(() => {
      throw new Error('invalid signature');
    });
    await expect(checkGenuine(cmdSet)).resolves.toBe(false);
  });

  it('returns false for 0x6985 (no identity certificate on card)', async () => {
    const cmdSet = makeCmdSet(0x6985);
    await expect(checkGenuine(cmdSet)).resolves.toBe(false);
    expect(mockVerifyIdentity).not.toHaveBeenCalled();
  });

  it('throws for other non-9000 status words', async () => {
    const cmdSet = makeCmdSet(0x6a82);
    await expect(checkGenuine(cmdSet)).rejects.toThrow('IDENT failed: 0x6A82');
    expect(mockVerifyIdentity).not.toHaveBeenCalled();
  });
});
