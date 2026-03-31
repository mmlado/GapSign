import { inspectBtcPsbt, parseCryptoPsbtRequest } from '../src/utils/btcPsbt';
import { CryptoPSBT } from '@keystonehq/bc-ur-registry';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Minimal valid PSBT v0 (magic + empty global + no inputs/outputs)
const MINIMAL_PSBT_HEX = '70736274ff01000a0200000000000000000000';

// PSBT with one input (m/84'/0'/0'/0/0) and two outputs (one change, one recipient)
// Built with bitcoinjs-lib in a real environment; values are plausible testnet amounts.
// We use a pre-serialised hex to keep the test self-contained.
// The PSBT was constructed to have:
//   - 1 input, 2 outputs
//   - bip32Derivation on input  → path m/84'/1'/0'/0/0  (testnet)
//   - bip32Derivation on output[1] (change)
//   - no feeSats (witnessUtxo missing → psbt.getFee() throws)
const TESTNET_WPKH_PSBT_HEX = (() => {
  // We build it programmatically so the test doesn't depend on a magic string.
  const { Psbt, payments, networks } = require('bitcoinjs-lib');
  const psbt = new Psbt({ network: networks.testnet });

  const fakePubkey = Buffer.alloc(33, 0x02);
  const { output } = payments.p2wpkh({
    pubkey: fakePubkey,
    network: networks.testnet,
  });

  psbt.addInput({
    hash: Buffer.alloc(32, 0xaa),
    index: 0,
    bip32Derivation: [
      {
        masterFingerprint: Buffer.from([0xde, 0xad, 0xbe, 0xef]),
        path: "m/84'/1'/0'/0/0",
        pubkey: fakePubkey,
      },
    ],
  });

  psbt.addOutput({ script: output!, value: 90_000 });
  psbt.addOutput({
    script: output!,
    value: 9_000,
    bip32Derivation: [
      {
        masterFingerprint: Buffer.from([0xde, 0xad, 0xbe, 0xef]),
        path: "m/84'/1'/0'/1/0",
        pubkey: fakePubkey,
      },
    ],
  });

  return psbt.toBuffer().toString('hex');
})();

// ---------------------------------------------------------------------------
// parseCryptoPsbtRequest
// ---------------------------------------------------------------------------

describe('parseCryptoPsbtRequest', () => {
  it('extracts psbtHex from a valid CryptoPSBT CBOR', () => {
    const psbtBytes = Buffer.from(MINIMAL_PSBT_HEX, 'hex');
    const cbor = new CryptoPSBT(psbtBytes).toCBOR();
    const result = parseCryptoPsbtRequest(cbor);
    expect(result.psbtHex).toBe(MINIMAL_PSBT_HEX);
  });

  it('returns a psbtHex string even for unexpected CBOR (library quirk)', () => {
    // CryptoPSBT.fromCBOR does not throw on bad input — getPSBT() silently returns
    // an Error object whose .toString('hex') yields a non-PSBT string.
    const result = parseCryptoPsbtRequest(Buffer.from([0x41, 0x00]));
    expect(typeof result.psbtHex).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// inspectBtcPsbt
// ---------------------------------------------------------------------------

describe('inspectBtcPsbt', () => {
  it('throws for an invalid PSBT hex', () => {
    expect(() => inspectBtcPsbt('deadbeef')).toThrow();
  });

  it('returns inputCount 0 for a PSBT with no inputs', () => {
    const summary = inspectBtcPsbt(MINIMAL_PSBT_HEX);
    expect(summary.inputCount).toBe(0);
  });

  it('returns correct input and output counts', () => {
    const summary = inspectBtcPsbt(TESTNET_WPKH_PSBT_HEX);
    expect(summary.inputCount).toBe(1);
    expect(summary.outputCount).toBe(2);
  });

  it('detects testnet from derivation path coin type 1', () => {
    const summary = inspectBtcPsbt(TESTNET_WPKH_PSBT_HEX);
    expect(summary.network).toBe('testnet');
  });

  it('marks outputs with bip32Derivation as change', () => {
    const summary = inspectBtcPsbt(TESTNET_WPKH_PSBT_HEX);
    expect(summary.outputs[0].isChange).toBe(false);
    expect(summary.outputs[1].isChange).toBe(true);
  });

  it('reports totalOutputSats as sum of all outputs', () => {
    const summary = inspectBtcPsbt(TESTNET_WPKH_PSBT_HEX);
    expect(summary.totalOutputSats).toBe(99_000);
  });
});
