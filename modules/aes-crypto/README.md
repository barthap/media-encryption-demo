# Expo AES Crypto

NOTE: Ideally, this module should be integrated into `expo-crypto` when API here
is stabilized.

**Main features:**

- Secure random key generation, possibility import and export to byte array
- AES 128/192/256 GCM encryption / decryption, with AAD authentication
- Easy to use API with secure defaults, with advanced configuration possibilities
  - Configurable parameters: IV (nonce) and GCM tag length
  - Defaults to NIST recommended values (96-bit nonce, 128-bit tag)
- Portable `SealedData` format for encrypted data, both easy to use and
  compatible with any 3rd party AES GCM API.
  - Ease of use: Concatenated `IV || ciphertext || tag` into contiguous byte array
  - Compatibility: Possibility to extract its components, and build from components

Support for modes other than GCM is not planned.

## API

> TODO: API RFC is in progress

## Native implementations

- iOS: `CryptoKit` AES GCM
- Android: `javax.crypto.Cipher`
- Web: `SubtleCrypto` API
