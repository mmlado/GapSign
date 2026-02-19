import React, {act} from 'react';
import ReactTestRenderer from 'react-test-renderer';
import QRScannerScreen from '../src/screens/QRScannerScreen';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('react-native-paper', () => {
  const {Text} = require('react-native');
  const {createElement} = require('react');
  return {
    MD3DarkTheme: {colors: {}},
    Text,
    Button: ({children, onPress}: any) =>
      createElement(Text, {onPress}, children),
    ActivityIndicator: () => null,
    Icon: () => null,
  };
});

// Capture the Camera's onReadCode so tests can trigger scan events.
let capturedOnReadCode: ((event: any) => void) | null = null;

jest.mock('react-native-camera-kit', () => ({
  Camera: (props: any) => {
    capturedOnReadCode = props.onReadCode;
    return null;
  },
}));

// Control URDecoder behaviour per test.
const mockReceivedPart = jest.fn();
const mockEstimatedPercent = jest.fn();
const mockIsComplete = jest.fn();
const mockIsSuccess = jest.fn();
const mockResultUR = jest.fn();
const mockResultError = jest.fn();

jest.mock('@ngraveio/bc-ur', () => ({
  URDecoder: jest.fn().mockImplementation(() => ({
    receivePart: mockReceivedPart,
    estimatedPercentComplete: mockEstimatedPercent,
    isComplete: mockIsComplete,
    isSuccess: mockIsSuccess,
    resultUR: mockResultUR,
    resultError: mockResultError,
  })),
}));

// useFocusEffect — call the callback immediately (simulates screen focus).
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => {
    require('react').useEffect(cb, []);
  },
}));

const mockHandleUR = jest.fn();
jest.mock('../src/utils/ur', () => ({
  handleUR: (...args: any[]) => mockHandleUR(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const navigation = {navigate: jest.fn()} as any;

function scan(value: string) {
  capturedOnReadCode?.({nativeEvent: {codeStringValue: value}});
}

async function renderScreen() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <QRScannerScreen navigation={navigation} route={{} as any} />,
    );
  });
  return renderer;
}

function toJson(r: ReactTestRenderer.ReactTestRenderer): string {
  return JSON.stringify(r.toJSON());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QRScannerScreen', () => {
  beforeEach(() => {
    capturedOnReadCode = null;
    mockReceivedPart.mockReset();
    mockEstimatedPercent.mockReturnValue(0);
    mockIsComplete.mockReturnValue(false);
    mockIsSuccess.mockReturnValue(false);
    mockResultUR.mockReturnValue(undefined);
    mockResultError.mockReturnValue('decode error');
    mockHandleUR.mockReset();
    navigation.navigate.mockClear();
  });

  describe('camera view', () => {
    it('renders the scanner title', async () => {
      const renderer = await renderScreen();
      expect(toJson(renderer)).toContain('Scan transaction QR');
    });

    it('registers onReadCode on the Camera', async () => {
      await renderScreen();
      expect(typeof capturedOnReadCode).toBe('function');
    });
  });

  describe('onCodeScanned — filtering', () => {
    it('ignores a falsy code value', async () => {
      await renderScreen();
      await act(async () => {
        scan('');
      });
      expect(mockReceivedPart).not.toHaveBeenCalled();
    });

    it('ignores a non-UR QR code', async () => {
      await renderScreen();
      await act(async () => {
        scan('https://example.com');
      });
      expect(mockReceivedPart).not.toHaveBeenCalled();
    });

    it('accepts a UR code regardless of case', async () => {
      await renderScreen();
      await act(async () => {
        scan('ur:eth-sign-request/somedata');
      });
      expect(mockReceivedPart).toHaveBeenCalledWith('ur:eth-sign-request/somedata');
    });
  });

  describe('onCodeScanned — progress', () => {
    it('updates progress when a partial UR frame is received', async () => {
      mockEstimatedPercent.mockReturnValue(0.5);
      const renderer = await renderScreen();
      await act(async () => {
        scan('ur:eth-sign-request/part1');
      });
      // Progress > 0 renders the progress bar (identified by its fill colour)
      expect(toJson(renderer)).toContain('#1C8A80');
    });
  });

  describe('onCodeScanned — complete UR', () => {
    it('navigates to TransactionDetail with parsed result on success', async () => {
      const fakeUR = {type: 'eth-sign-request', cbor: Buffer.alloc(0)};
      const fakeResult = {kind: 'eth-sign-request', request: {}};
      mockIsComplete.mockReturnValue(true);
      mockIsSuccess.mockReturnValue(true);
      mockResultUR.mockReturnValue(fakeUR);
      mockHandleUR.mockReturnValue(fakeResult);

      await renderScreen();
      await act(async () => {
        scan('ur:eth-sign-request/completedata');
      });

      expect(mockHandleUR).toHaveBeenCalledWith(fakeUR.type, fakeUR.cbor);
      expect(navigation.navigate).toHaveBeenCalledWith('TransactionDetail', {
        result: fakeResult,
      });
    });

    it('navigates to TransactionDetail with an error result on decode failure', async () => {
      mockIsComplete.mockReturnValue(true);
      mockIsSuccess.mockReturnValue(false);
      mockResultError.mockReturnValue('bad checksum');

      await renderScreen();
      await act(async () => {
        scan('ur:eth-sign-request/baddata');
      });

      expect(navigation.navigate).toHaveBeenCalledWith('TransactionDetail', {
        result: {kind: 'error', message: 'bad checksum'},
      });
    });

    it('ignores subsequent scan events after a complete scan', async () => {
      mockIsComplete.mockReturnValue(true);
      mockIsSuccess.mockReturnValue(true);
      mockResultUR.mockReturnValue({type: 'eth-sign-request', cbor: Buffer.alloc(0)});
      mockHandleUR.mockReturnValue({kind: 'eth-sign-request', request: {}});

      await renderScreen();
      await act(async () => {
        scan('ur:eth-sign-request/first');
        scan('ur:eth-sign-request/second');
      });

      expect(navigation.navigate).toHaveBeenCalledTimes(1);
    });
  });
});
