/**
 * Represents input data that can be serialized for encryption.
 * It can be a string, ArrayBuffer, Blob, or Uint8Array.
 */
export type SerializableInput = string | ArrayBuffer | Uint8Array;

export enum KeySize {
  AES128 = 128,
  AES192 = 192,
  AES256 = 256,
}

export interface SealedDataConfig {
  /*
   * The length of the initialization vector. Defaults to 12.
   */
  ivLength: number;
  /*
   * The length of the authentication tag. Defaults to 16.
   */
  tagLength: number;
}

interface CommonDecryptOptions {
  output?: 'bytes' | 'base64';
  /**
   * Additional GCM authenticated data.
   */
  additionalData?: SerializableInput;
}

export interface Base64DecryptOptions extends CommonDecryptOptions {
  output: 'base64';
}

export interface ArrayBufferDecryptOptions extends CommonDecryptOptions {
  output?: 'bytes';
}

export type DecryptOptions = Base64DecryptOptions | ArrayBufferDecryptOptions;

/**
 * Configuration for generating a nonce during encryption.
 * Can specify either the length of the IV to generate or provide an IV directly.
 */
type NonceParam = { length: number } | { bytes: Uint8Array };

/**
 * Options for the encryption process.
 */
export interface EncryptOptions {
  /**
   * Parameters for nonce generation.
   * Defaults to a 12-byte random value.
   */
  nonce?: NonceParam;

  /**
   * The length of the authentication tag.
   * Defaults to 16 bytes.
   * @ios: Not configurable, iOS will always create a 16 byte tag
   */
  tagLength?: number;

  /**
   * Additional GCM authenticated data.
   */
  additionalData?: SerializableInput;
}
