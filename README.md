# GapSign

[![CI](https://github.com/mmlado/GapSign/actions/workflows/ci.yml/badge.svg)](https://github.com/mmlado/GapSign/actions/workflows/ci.yml)

An air-gap Android wallet that uses [Status Keycard](https://keycard.tech) over NFC to sign Ethereum transactions without the private key ever touching an internet-connected device.

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

## Security notes

- Pairing data is stored in encrypted storage (Android Keystore-backed)
- The signing key (Keycard) is never exposed to the app — only the signature result is returned
- QR communication uses the [Blockchain Commons UR](https://github.com/BlockchainCommons/bc-ur) standard for structured binary data

## License

MIT
