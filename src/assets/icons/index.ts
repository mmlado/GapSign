import ScanIcon from './scan.svg';
import KeycardIcon from './keycard.svg';
import BackspaceIcon from './backspace.svg';
import ChevronRight from './chevron-right.svg';
import QrIcon from './qr.svg';
import CopyIcon from './copy.svg';
import NfcDefault from './nfc/default.svg';
import NfcSuccess from './nfc/success.svg';
import NfcFailure from './nfc/failure.svg';
import NfcActivate from './nfc_activate.svg';
import Checkmark from './checkmark.svg';
import Exclamation from './exclamation.svg';

export const Icons = {
  scan: ScanIcon,
  keycard: KeycardIcon,
  backspace: BackspaceIcon,
  chevronRight: ChevronRight,
  qr: QrIcon,
  copy: CopyIcon,
  nfcActivate: NfcActivate,
  checkmark: Checkmark,
  exclamation: Exclamation,
  nfc: {
    default: NfcDefault,
    success: NfcSuccess,
    failure: NfcFailure,
  },
};
