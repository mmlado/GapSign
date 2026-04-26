# GapSign

<p align="center">
  <img src="fastlane/metadata/android/en-US/images/icon.png" width="96" alt="GapSign icon" />
</p>

<p align="center">
  <a href="https://github.com/mmlado/GapSign/actions/workflows/ci.yml"><img src="https://github.com/mmlado/GapSign/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/mmlado/GapSign/actions/workflows/android-release.yml"><img src="https://github.com/mmlado/GapSign/actions/workflows/android-release.yml/badge.svg" alt="Build & Release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
  <a href="https://developer.android.com"><img src="https://img.shields.io/badge/platform-Android-green.svg" alt="Platform" /></a>
  <a href="https://reactnative.dev"><img src="https://img.shields.io/badge/React%20Native-0.83-blue.svg" alt="React Native" /></a>
  <a href="https://github.com/mmlado/GapSign/releases/latest"><img src="https://img.shields.io/github/v/release/mmlado/GapSign" alt="GitHub release" /></a>
  <img src="https://img.shields.io/github/last-commit/mmlado/GapSign.svg" alt="Last commit" />
  <img src="https://img.shields.io/github/stars/mmlado/GapSign.svg?style=social" alt="Stars" />
</p>

GapSign is an air-gapped Android companion app for [Status Keycard](https://keycard.tech). It lets you sign Ethereum and Bitcoin transactions over NFC, so your private keys never touch an internet-connected device.

All communication with your watch-only wallet happens through animated QR codes using the [Blockchain Commons UR](https://github.com/BlockchainCommons/bc-ur) standard. There is no internet permission, no network calls, and no telemetry.

## Screenshots

<p align="center">
  <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/01_dashboard.png" width="30%" alt="Dashboard" />
  <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/02_connect_software_wallet.png" width="30%" alt="Connect software wallet" />
  <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/03_nfc_scan.png" width="30%" alt="NFC scan" />
</p>
<p align="center">
  <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/04_show_qr_code.png" width="30%" alt="Show QR code" />
  <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/05_scan_qr_code.png" width="30%" alt="Scan QR code" />
  <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/06_transaction.png" width="30%" alt="Transaction review" />
</p>
<p align="center">
  <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/07_keypair.png" width="30%" alt="Key pair" />
</p>

## Features

- Sign Ethereum transactions: legacy, EIP-1559, and EIP-2930
- Sign EIP-712 typed data with a decoded preview before you approve
- Sign personal messages (EIP-191 / SIWE)
- Sign Bitcoin transactions via PSBT
- Sign Bitcoin messages (BIP-322)
- Export wallet keys to MetaMask, Rabby, Ledger Live, Sparrow, BlueWallet, and Bitget
- Generate and load key pairs directly onto the Keycard
- Import a recovery phrase (BIP-39, 12 or 24 words, with optional passphrase)
- Import SLIP-39 Shamir Secret Sharing shares
- Genuine Keycard verification before first pairing
- Fully air-gapped: no internet permission, no network calls, no telemetry

## Requirements

- Android 7.0+ (API 24)
- A [Status Keycard](https://keycard.tech) NFC smart card

## Getting the app

Download the latest APK from [Releases](../../releases) and sideload it onto your device.

> The APK is built automatically by GitHub Actions on every version tag. F-Droid distribution is coming.

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
npm start        # Terminal 1: Metro bundler
npm run android  # Terminal 2: build and install
```

### Release build

```sh
cd android && ./gradlew assembleRelease
```

## Development

```sh
npm test      # Jest test suite
npm run lint  # ESLint
```

## Security

- Pairing data is stored in encrypted storage backed by the Android Keystore
- Private keys never leave the Keycard; only the signature result is returned to the app
- QR codes use [Blockchain Commons UR](https://github.com/BlockchainCommons/bc-ur) for structured binary encoding
- No internet permission in release builds

## License

MIT
