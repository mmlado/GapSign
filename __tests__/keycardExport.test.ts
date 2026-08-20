import { exportKeysForTarget } from '../src/utils/keycardExport';

jest.mock('keycard-sdk', () => ({
  __esModule: true,
  default: {
    BIP32KeyPair: {
      fromTLV: jest.fn((data: Uint8Array) => ({ publicKey: data })),
    },
  },
}));

jest.mock('../src/utils/cryptoAccount', () => ({
  pubKeyFingerprint: jest.fn(
    (pub: Uint8Array) => 0xf0000000 + pub[0], // distinct per response
  ),
}));

// exportKey responses carry a tag byte the fingerprint mock keys off.
function response(tag: number) {
  return { checkOK: jest.fn(), data: new Uint8Array([tag]) };
}

function makeCmdSet(parentTagsByPath: Record<string, number>) {
  return {
    exportKey: jest.fn((_p1: number, _p2: boolean, path: string) => {
      const tag = path === 'm' ? 1 : parentTagsByPath[path];
      if (tag === undefined) {
        throw new Error(`Unexpected exportKey path: ${path}`);
      }
      return Promise.resolve(response(tag));
    }),
    exportExtendedKey: jest.fn((_p1: number, path: string) =>
      Promise.resolve({
        checkOK: jest.fn(),
        data: new Uint8Array([0x50, path.length]),
      }),
    ),
  } as any;
}

describe('exportKeysForTarget', () => {
  it('exports the master key once and derives its fingerprint', async () => {
    const cmdSet = makeCmdSet({ "m/44'/60'": 2 });
    const result = await exportKeysForTarget(cmdSet, [
      { derivationPath: "m/44'/60'/0'", parentPath: "m/44'/60'" },
    ]);

    expect(cmdSet.exportKey).toHaveBeenCalledWith(0, true, 'm', false);
    expect(result.masterFingerprint).toBe(0xf0000000 + 1);
  });

  it('exports each planned key with its parent fingerprint and embeds the entry', async () => {
    const cmdSet = makeCmdSet({ "m/84'/0'": 2, "m/49'/0'": 3 });
    const entries = [
      { derivationPath: "m/84'/0'/0'", parentPath: "m/84'/0'", meta: 'a' },
      { derivationPath: "m/49'/0'/0'", parentPath: "m/49'/0'", meta: 'b' },
    ];

    const result = await exportKeysForTarget(cmdSet, entries);

    expect(cmdSet.exportExtendedKey).toHaveBeenNthCalledWith(
      1,
      0,
      "m/84'/0'/0'",
      false,
    );
    expect(cmdSet.exportExtendedKey).toHaveBeenNthCalledWith(
      2,
      0,
      "m/49'/0'/0'",
      false,
    );
    expect(result.keys).toHaveLength(2);
    expect(result.keys[0].entry).toBe(entries[0]);
    expect(result.keys[0].entry.meta).toBe('a');
    expect(result.keys[0].parentFingerprint).toBe(0xf0000000 + 2);
    expect(result.keys[1].parentFingerprint).toBe(0xf0000000 + 3);
  });

  it('fetches each distinct parent path once', async () => {
    const cmdSet = makeCmdSet({ "m/48'/0'/0'": 2 });
    await exportKeysForTarget(cmdSet, [
      { derivationPath: "m/48'/0'/0'/2'", parentPath: "m/48'/0'/0'" },
      { derivationPath: "m/48'/0'/0'/1'", parentPath: "m/48'/0'/0'" },
    ]);

    const parentCalls = cmdSet.exportKey.mock.calls.filter(
      (c: unknown[]) => c[2] === "m/48'/0'/0'",
    );
    expect(parentCalls).toHaveLength(1);
  });

  it("reuses the master fingerprint for parentPath 'm' without re-exporting", async () => {
    const cmdSet = makeCmdSet({});
    const result = await exportKeysForTarget(cmdSet, [
      { derivationPath: "m/45'", parentPath: 'm' },
    ]);

    // exportKey called exactly once — for the master read.
    expect(cmdSet.exportKey).toHaveBeenCalledTimes(1);
    expect(result.keys[0].parentFingerprint).toBe(result.masterFingerprint);
  });

  it('reports progress statuses', async () => {
    const cmdSet = makeCmdSet({ "m/84'/0'": 2, "m/49'/0'": 3 });
    const setStatus = jest.fn();
    await exportKeysForTarget(
      cmdSet,
      [
        { derivationPath: "m/84'/0'/0'", parentPath: "m/84'/0'" },
        { derivationPath: "m/49'/0'/0'", parentPath: "m/49'/0'" },
      ],
      setStatus,
    );

    expect(setStatus).toHaveBeenCalledWith('Reading master key...');
    expect(setStatus).toHaveBeenCalledWith('Exporting key 1 of 2...');
    expect(setStatus).toHaveBeenCalledWith('Exporting key 2 of 2...');
  });

  it('checks every card response', async () => {
    const bad = {
      checkOK: jest.fn(() => {
        throw new Error('SW error');
      }),
      data: new Uint8Array([1]),
    };
    const cmdSet = {
      exportKey: jest.fn().mockResolvedValue(bad),
      exportExtendedKey: jest.fn(),
    } as any;

    await expect(
      exportKeysForTarget(cmdSet, [
        { derivationPath: "m/44'/60'/0'", parentPath: "m/44'/60'" },
      ]),
    ).rejects.toThrow('SW error');
    expect(cmdSet.exportExtendedKey).not.toHaveBeenCalled();
  });
});
