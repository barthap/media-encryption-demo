# Expo AES Crypto

> [!NOTE]
> This API is going to be integrated into `expo-crypto`. See [pull request](https://github.com/expo/expo/pull/41249).

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

> NOTE: API RFC is in progress, It's subject to changes

Pseudo-Typescript API declaration:

```typescript
// Encapsulating this inside a namespace to avoid possible conflits
// in the future if more encryption APIs are added
namespace Crypto.AES {
  /**
   * Supported key sizes for AES encryption.
   */
  type KeySize = 256 | 192 | 128;

  /**
   * Represents an encryption key for AES.
   */
  declare class EncryptionKey {
    /**
     * The size of the encryption key.
     */
    size: KeySize;

    /**
     * Retrieves the key as a byte array.
     * Asynchronous due to the use of SubtleCrypto exportKey API.
     * @returns A promise that resolves to the byte array representation of the key.
     */
    async bytes(): Uint8Array;

    /**
     * Retrieves the key encoded as a string in the specified format.
     * Asynchronous due to the use of SubtleCrypto exportKey API.
     * @param encoding The encoding format to use ('hex' or 'base64').
     * @returns A promise that resolves to the string representation of the key.
     */
    async stringEncoded(encoding: 'hex' | 'base64'): string;
  }

  /**
   * Represents input data that can be serialized for encryption.
   * It can be a string, ArrayBuffer, Blob, or Uint8Array.
   */
  type SerializableInput = string | ArrayBuffer | Blob | Uint8Array;

  /**
   * Represents encrypted data, including ciphertext, initialization vector, and authentication tag.
   */
  declare class SealedData {
    /**
     * Creates a SealedData instance from a combined byte array, including the IV, ciphertext, and tag.
     * @param combined The combined data array.
     * @param ivLen The length of the initialization vector. Defaults to 12.
     * @param tagLen The length of the authentication tag. Defaults to 16.
     * @returns A SealedData object.
     */
    static fromCombined(combined: Uint8Array, options: { ivLen: number = 12, tagLen: number = 16 }): SealedData;

    /**
     * Creates a SealedData instance from separate nonce, ciphertext, and optionally a tag.
     * @param iv The initialization vector.
     * @param ciphertext The encrypted data. May include GCM tag.
     * @param tag The authentication tag (optional). Leave empty if ciphertext already contains tag.
     * @returns A SealedData object.
     */
    static fromNonceAndCiphertext(iv: Uint8Array, ciphertext: Uint8Array, tag?: Uint8Array): SealedData;

    /**
     * Retrieves the ciphertext.
     * @returns The ciphertext as a Uint8Array.
     */
    ciphertext(): Uint8Array;

    /**
     * Retrieves the initialization vector.
     * @returns The initialization vector as a Uint8Array.
     */
    iv(): Uint8Array;

    // ALTERNATIVE PROPERTY SYNTAX:
    /**
     * Retrieves the authentication tag.
     */
    readonly tag: Uint8Array;

    /**
     * Retrieves a combined representation of the IV, ciphertext, and tag.
     * @returns The combined data as a Uint8Array.
     */
    combined(): Uint8Array;

    // base64 counterpart examples:
    ciphertext(encoding: 'base64'): Promise<string>;
    combined(encoding: 'base64'): Promise<string>;
    // ...
  }

  /**
   * Configuration for generating a nonce during encryption.
   * Can specify either the length of the IV to generate or provide an IV directly.
   */
  type NonceParam = { ivLength: number } | { iv: Uint8Array };

  /**
   * Options for the encryption process.
   */
  interface EncryptOptions {
    /**
     * Parameters for nonce generation.
     * Defaults to a 12-byte random value.
     */
    nonce: NonceParam;

    /**
     * The length of the authentication tag.
     * Defaults to 16 bytes.
     * @ios: Not configurable, iOS will always create a 16 byte tag
     */
    tagLength: number;

    /**
     * Additional GCM authenticated data.
     */
    additionalData?: SerializableInput;
  }

  /**
   * Options for the decryption process.
   */
  interface DecryptOptions {
    /**
     * The encoding for the output, defaults to 'buffer'.
     */
    outputEncoding?: 'buffer' | 'utf8' | 'base64' = 'buffer';

    /**
     * Additional GCM authenticated data.
     */
    additionalData?: SerializableInput;
  }

  /** GLOBAL MODULE FUNCTIONS **/

  // NOTE: Alternatively, below functions can be static members
  // of the `EncryptionKey` class.

  /**
   * Generates a new AES encryption key of the specified size.
   * @param size The size of the key (128, 192, or 256). Defaults to 256.
   * @returns A promise that resolves to an EncryptionKey instance.
   */
  async generateKey(size: KeySize = 256): EncryptionKey;
  /**
   * Imports an encryption key from a byte array.
   * Validates the size of the key.
   * @param bytes The key as a byte array.
   * @returns A promise that resolves to an EncryptionKey instance.
   */
  async importKey(bytes: Uint8Array): EncryptionKey;
  /**
   * Imports an encryption key from a string representation (hex or base64).
   * Validates the size of the key.
   * @param hexString The key as a string.
   * @param encoding The encoding used in the string ('hex' or 'base64').
   * @returns A promise that resolves to an EncryptionKey instance.
   */
  async importKey(hexString: string, encoding: 'hex' | 'base64'): EncryptionKey;



  /**
   * Encrypts the given plaintext using the specified key.
   * @param plaintext The data to encrypt.
   * @param key The key to use for encryption.
   * @returns A promise that resolves to a SealedData instance.
   */
  async encryptAsync(
    plaintext: SerializableInput,
    key: EncryptionKey,
  ): Promise<SealedData>;

  /**
   * Decrypts the given sealed data using the specified key and options.
   * @param sealedData The data to decrypt.
   * @param key The key to use for decryption.
   * @param options Options for decryption, including output encoding and additional data.
   * @returns A promise that resolves to the decrypted data.
   */
  async decryptAsync(
    sealedData: SealedData,
    key: EncryptionKey,
    options?: DecryptOptions = {},
  ): Promise<base64 | string | Uint8Array>;
}
```

## Native implementations

- iOS: [`CryptoKit` AES GCM](https://developer.apple.com/documentation/cryptokit/aes/gcm)
- Android: [`javax.crypto`](https://developer.android.com/reference/javax/crypto/package-summary) `Cipher` and `KeyGenerator` classes
- Web: [`SubtleCrypto` API](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto)

## NIST recommendations for AES-GCM

Default and allowed values are based on
[NIST SD 800-38D](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf)
and [RFC-5116](https://www.ietf.org/rfc/rfc5116.txt) recommendations.

Key points:

- Nonce (IV) cannot be reused between encryptions! Must be generated every time `AES.encryptAsync()` is called.
- Recommended IV length is 96 bit (12 bytes)
- Recommended tag length is 128 bit (16 bytes), a few other arbitrary values are allowed under certain circumstances

From NIST SD 800-38D section 5.2.1:

> For IVs, it is recommended that implementations restrict support to the length of 96 bits, to
> promote interoperability, efficiency, and simplicity of design.

> The bit length of the tag, denoted t, is a security parameter, as discussed in Appendix B. In
> general, t may be any one of the following five values: 128, 120, 112, 104, or 96. For certain
> applications, t may be 64 or 32; guidance for the use of these two tag lengths, including
> requirements on the length of the input data and the lifetime of the key in these cases, is given in
> Appendix C.
>
> An implementation shall not support values for t that are different from the seven choices in the
> preceding paragraph. An implementation may restrict its support to as few as one of these
> values. A single, fixed value for t from among the supported choices shall be associated with
> each key.
