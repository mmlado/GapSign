# GapSign

[![CI](https://github.com/mmlado/GapSign/actions/workflows/ci.yml/badge.svg)](https://github.com/mmlado/GapSign/actions/workflows/ci.yml)

An air-gap Android wallet that uses [Status Keycard](https://keycard.tech) over NFC to sign Ethereum transactions without the private key ever touching an internet-connected device.

## How it works

1. MetaMask (or another wallet) displays a transaction as a **UR QR code** (`eth-sign-request`)
2. GapSign scans the QR code with the camera
3. GapSign communicates with the Keycard over **NFC** and requests a signature using your PIN
4. The signed result is displayed as a **UR QR code** (`eth-signature`)
5. MetaMask scans the result QR to broadcast the transaction

The private key never leaves the Keycard.

## Requirements

- Android 7.0+ (API 24)
- A [Status Keycard](https://keycard.tech) with a loaded wallet
- MetaMask Mobile or any wallet that supports UR QR air-gap signing

## Getting a release APK

Download the latest APK from [Releases](../../releases) and sideload it onto your device.

> The APK is built and signed automatically by GitHub Actions on every version tag.

## Building from source

### Prerequisites

- Node.js 20+
- JDK 17
- Android SDK with NDK 27.1.12297006

### Setup

```sh
npm install
```

### Run (development)

```sh
npm run android
```

### Release build

```sh
cd android && ./gradlew assembleRelease
```

## Development

```sh
# Lint
npm run lint

# Tests
npm test
```

## Architecture

| Layer | Technology |
|---|---|
| UI | React Native + React Native Paper (Material You dark theme) |
| Navigation | React Navigation (native stack) |
| QR scanning | react-native-camera-kit |
| UR encoding/decoding | @ngraveio/bc-ur |
| Keycard NFC | keycard-sdk + react-native-keycard |
| Pairing storage | react-native-encrypted-storage |
| Ethereum signatures | @noble/secp256k1 |

## Security notes

- Pairing data is stored in encrypted storage (Android Keystore-backed)
- The signing key (Keycard) is never exposed to the app — only the signature result is returned
- QR communication uses the [Blockchain Commons UR](https://github.com/BlockchainCommons/bc-ur) standard for structured binary data

## License

MIT
