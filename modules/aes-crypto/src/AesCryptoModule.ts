import { NativeModule, requireNativeModule } from 'expo';

import {
  DecryptOptions,
  EncryptOptions,
  KeySize,
  SealedDataConfig,
  SerializableInput,
} from './AesCrypto.types';

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
  bytes(): Promise<Uint8Array>;

  /**
   * Retrieves the key encoded as a string in the specified format.
   * Asynchronous due to the use of SubtleCrypto exportKey API.
   * @param encoding The encoding format to use ('hex' or 'base64').
   * @returns A promise that resolves to the string representation of the key.
   */
  encoded(encoding: 'hex' | 'base64'): Promise<string>;
}

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
  static fromCombined(combined: SerializableInput, config?: SealedDataConfig): SealedData;

  /**
   * Creates a SealedData instance from separate nonce, ciphertext, and optionally a tag.
   * @param iv The initialization vector.
   * @param ciphertext The encrypted data. Should not include GCM tag.
   * @param tag The authentication tag.
   * @returns A SealedData object.
   */
  static fromNonceAndCiphertext(
    iv: SerializableInput,
    ciphertext: SerializableInput,
    tag: SerializableInput,
  ): SealedData;
  /**
   * Creates a SealedData instance from separate nonce, ciphertext, and optionally a tag.
   * @param iv The initialization vector.
   * @param ciphertextWithTag The encrypted data with GCM tag appended.
   * @param tag Authentication tag length, in bytes. Default to 16.
   * @returns A SealedData object.
   */
  static fromNonceAndCiphertext(
    iv: SerializableInput,
    ciphertextWithTag: SerializableInput,
    tagLength?: number,
  ): SealedData;

  /**
   * Retrieves the ciphertext.
   * @returns The ciphertext as a Uint8Array.
   */
  ciphertext(options: { withTag?: boolean; encoding: 'base64' }): Promise<string>;
  ciphertext(options?: { withTag?: boolean; encoding?: 'bytes' }): Promise<Uint8Array>;

  /**
   * Retrieves the initialization vector.
   * @returns The initialization vector as a Uint8Array.
   */
  iv(encoding?: 'bytes'): Promise<Uint8Array>;
  iv(encoding: 'base64'): Promise<string>;

  /**
   * Retrieves the authentication tag.
   */
  tag(encoding?: 'bytes'): Promise<Uint8Array>;
  tag(encoding: 'base64'): Promise<string>;

  /**
   * Retrieves a combined representation of the IV, ciphertext, and tag.
   * @returns The combined data as a Uint8Array.
   */
  combined(encoding?: 'bytes'): Promise<Uint8Array>;
  combined(encoding: 'base64'): Promise<string>;

  readonly combinedSize: number;
  readonly ivSize: number;
  readonly tagSize: number;
}

type NativeEncryptOptions = Omit<EncryptOptions, 'nonce'> & {
  nonce?: number | Uint8Array | undefined;
};

declare class NativeAesCryptoModule extends NativeModule {
  EncryptionKey: typeof EncryptionKey;
  SealedData: typeof SealedData;

  generateKey(size?: KeySize): Promise<EncryptionKey>;
  importKey(keyInput: string | Uint8Array, encoding?: 'hex' | 'base64'): Promise<EncryptionKey>;

  encryptAsync(
    plaintext: SerializableInput,
    key: EncryptionKey,
    options?: NativeEncryptOptions,
  ): Promise<SealedData>;
  decryptAsync(
    sealedData: SealedData,
    key: EncryptionKey,
    options?: DecryptOptions,
  ): Promise<string | Uint8Array>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<NativeAesCryptoModule>('AesCrypto');
