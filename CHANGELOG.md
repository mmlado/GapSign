# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Add Bitcoin PSBT signing support
- Add Bitcoin message signing support via BIP-322, including crypto-psbt detection and btc-sign-request / btc-signature QR flows
- Add Bitget multi-account export via crypto-multi-accounts UR
- Add EIP-2930 (type 0x01) transaction signing support

### Fixed

- Fix Ethereum `crypto-hdkey` exports to include source fingerprints for Rabby compatibility
- Fix PIN pad bottom key obscured by Android gesture navigation bar

## [0.7.0] - 2026-03-23

- Add Change Secrets flow

## [0.6.0] - 2026-03-21

### Added

- Genuine Keycard verification before first pairing
- Import recovery phrase (12/24 words + optional passphrase)
- Wrong PIN feedback: remaining attempts shown under PIN field, card locked message when no attempts remain
- BIP39 passphrase support for key generation (12 and 24 word variants)
- Mid-operation NFC disconnect shows nudge instead of error

### Fix

- Address menu: removed duplicate top padding that caused a gap below the navigation header
- Address list FlatList performance fix (memoized renderItem/keyExtractor)

## [0.5.0] - 2026-03-16

### Added

- Address list

### Changed

- Unified UI design across all screens

## [0.4.0] - 2026-03-12

### Added

- Generate keypair flow

## [0.3.0] - 2026-03-11

### Added

- Initialize Keycard flow
- Factory reset flow

## [0.2.0] - 2026-03-04

### Added

- Connect software wallet flow (export extended public key via QR)

## [0.1.0] - 2025-02-22

### Added

- Scanning QR code from compatible Ethereum wallets
- Signing transaction with Keycard
- Scan back result QR code into the compatible Ethereum wallet

[Unreleased]: https://github.com/mmlado/GapSign/compare/v0.7.0...HEAD
[0.7.0]: https://github.com/mmlado/GapSign/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/mmlado/GapSign/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/mmlado/GapSign/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/mmlado/GapSign/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/mmlado/GapSign/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/mmlado/GapSign/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/mmlado/GapSign/compare/294c1212cfd8d1738b5eb90bbb33aa02adee139c...v0.1.0
