# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Expanded Jest coverage for signing utilities and wallet workflow screens

## [1.1.0] - 2026-04-28

### Added

- Codecov coverage upload in CI and a live README coverage badge
- Decode ERC-20 calldata (`transfer`, `transferFrom`, `approve`) in transaction review; show unlimited approval warning
- Detect and label pre-hashed EIP-712 payloads (`0x1901`) with domain separator and message hash
- `full` (`tech.gapsign`) and `offline` (`tech.gapsign.offline`) Android build flavors
- QR code fallback for external links so air-gapped users can scan URLs on another device

### Fixed

- EIP-712 JSON decode for minified or non-round-tripping UTF-8 payloads; prettify JSON display

## [1.0.3] - 2026-04-27

### Changed

- Publish signed universal APKs and SHA256 checksums in GitHub releases
- Reduce release APK size with minification, resource shrinking, and ARM-only release splits

## [1.0.2] - 2026-04-27

### Changed

- Downgrade @react-native-async-storage/async-storage to 1.24.0 to remove local maven repo incompatible with F-Droid build server

## [1.0.1] - 2026-04-27

### Fixed

- Downgrade Gradle wrapper to 8.14.2 for F-Droid build server compatibility

## [1.0.0] - 2026-04-27

### Added

- Scramble PIN pad digit layout on mount and on each new error to prevent shoulder-surfing
- F-Droid release metadata, store listing text, and unsigned Android release artifact workflow
- About screen with app description, Keycard link, donation addresses, contributors, and license list
- Keycard menu and NFC action indicators so every visible NFC-triggering action shows the `Icons.nfcActivate` marker
- Dismissible dashboard Keycard purchase notice

### Changed

- Migrate Jest screen and hook tests to React Native Testing Library

### Fixed

- Update vulnerable transitive npm packages and require patched Active Support versions
- Fix QRResult screen showing "Show signature to the wallet" title during wallet key export flow

## [0.9.0] - 2026-04-09

### Added

- Add Ledger Live and Ledger Legacy export via `crypto-hdkey` with EIP-4527 `source` and `children` fields
- Add mnemonic verification flow: enter recovery phrase, tap Keycard, confirm fingerprint match
- Add SLIP39 Shamir share generation, import, and verification flows

### Changed

- Centralize all colors in `theme.ts`; replace hardcoded hex strings throughout components and screens with theme tokens
- Use `keycard-sdk` BIP32 helpers for exported key TLV parsing and public key compression
- Replace deprecated dependencies: ESLint v8→v9 flat config, vector-icons→MDI per-family package, RecoverableSignature for eth signature TLV parsing

### Fixed

- Reject unsupported `btc-sign-request` data types instead of treating them as legacy Bitcoin messages

## [0.8.0] - 2026-04-06

### Added

- Add Bitcoin PSBT signing support
- Add Bitcoin message signing support via BIP-322, including crypto-psbt detection and btc-sign-request / btc-signature QR flows
- Add Bitget multi-account export via crypto-multi-accounts UR
- Add EIP-2930 (type 0x01) transaction signing support
- Add decoded EIP-712 domain and message display before signing

### Fixed

- Fix Ethereum `crypto-hdkey` exports to include source fingerprints for Rabby compatibility
- Fix SIWE / personal_sign (`dataType=3`) failing with Invalid MAC by applying EIP-191 prefix hash before signing
- Fix QRScannerScreen camera staying active when navigating away by gating render on `useIsFocused`
- Fix malformed `eth-sign-request` payloads silently passing through by validating transaction sign data on UR parse
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

[Unreleased]: https://github.com/mmlado/GapSign/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/mmlado/GapSign/compare/v1.0.3...v1.1.0
[1.0.3]: https://github.com/mmlado/GapSign/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/mmlado/GapSign/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/mmlado/GapSign/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/mmlado/GapSign/compare/v0.9.0...v1.0.0
[0.9.0]: https://github.com/mmlado/GapSign/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/mmlado/GapSign/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/mmlado/GapSign/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/mmlado/GapSign/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/mmlado/GapSign/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/mmlado/GapSign/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/mmlado/GapSign/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/mmlado/GapSign/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/mmlado/GapSign/compare/294c1212cfd8d1738b5eb90bbb33aa02adee139c...v0.1.0
