import {
  APDUException,
  WrongPINException,
} from 'keycard-sdk/dist/apdu-exception';

import { isTagLostError } from '../src/utils/keycardErrors';

describe('isTagLostError', () => {
  describe('tag-lost messages (true)', () => {
    it.each([
      // Real Android wire shape: PromiseImpl sets name to the Java class, so the
      // CardIOError wrapper stringifies the class name into the message.
      'CardIO Error: android.nfc.TagLostException: Tag was lost.',
      'CardIO Error: Error: Tag was lost.',
      'Tag was lost.',
      'Tag disconnected',
      'CardIO Error: Error: NFCError:100',
      'NFCError:100',
      'NFCError:101',
      'NFCError:102',
      'APDU response must be at least 2 bytes',
    ])('%s', message => {
      expect(isTagLostError(new Error(message))).toBe(true);
    });

    it('accepts the inert forward-compat code arm', () => {
      expect(isTagLostError({ code: 'E_KEYCARD_TAG_LOST' })).toBe(true);
    });

    it('accepts the inert forward-compat name arm', () => {
      expect(isTagLostError({ name: 'NFCDisconnectedError' })).toBe(true);
    });
  });

  describe('non-tag-lost errors (false) — each is a regression guard', () => {
    it.each([
      // R18: excluded codes must not match the 100/101/102 alternation.
      'NFCError:103',
      'NFCError:104',
      'NFCError:202',
      // \b guard: a longer code must not prefix-match an included one.
      'NFCError:1002',
      // Malformed OUTBOUND apdu — programmer error, not tag loss.
      'Malformed card response',
      // Cause-erasing constants that fire for every apdu error.
      'CardIO Error: Error: Invalid APDUResponse',
      'CardIO Error: Error: Error sending command',
      'Card is locked. Use Unblock Card option.',
    ])('%s', message => {
      expect(isTagLostError(new Error(message))).toBe(false);
    });

    it('rejects APDU exceptions', () => {
      expect(
        isTagLostError(new APDUException('Pairing failed on step 1')),
      ).toBe(false);
      expect(isTagLostError(new WrongPINException(2))).toBe(false);
    });

    it.each([[null], [undefined], ['string'], [42]])(
      'rejects non-object %p',
      value => {
        expect(isTagLostError(value)).toBe(false);
      },
    );
  });
});
