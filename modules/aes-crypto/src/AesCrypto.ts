import {
  ArrayBufferDecryptOptions,
  Base64DecryptOptions,
  DecryptOptions,
  EncryptOptions,
  KeySize,
  SerializableInput,
} from './AesCrypto.types';
import AesCryptoModule from './AesCryptoModule';

export * from './AesCrypto.types';

export class EncryptionKey extends AesCryptoModule.EncryptionKey {}
export class SealedData extends AesCryptoModule.SealedData {}

/**
 * Generates a new AES encryption key of the specified size.
 * @param size The size of the key (128, 192, or 256). Defaults to 256.
 * @returns A promise that resolves to an EncryptionKey instance.
 */
export function generateKey(size?: KeySize): Promise<EncryptionKey> {
  return AesCryptoModule.generateKey(size);
}
/**
 * Imports an encryption key from a byte array.
 * Validates the size of the key.
 * @param bytes The key as a byte array.
 * @returns A promise that resolves to an EncryptionKey instance.
 */
export function importKey(bytes: Uint8Array): Promise<EncryptionKey>;
/**
 * Imports an encryption key from a string representation (hex or base64).
 * Validates the size of the key.
 * @param hexString The key as a string.
 * @param encoding The encoding used in the string ('hex' or 'base64').
 * @returns A promise that resolves to an EncryptionKey instance.
 */
export function importKey(hexString: string, encoding: 'hex' | 'base64'): Promise<EncryptionKey>;
export function importKey(
  keyInput: string | Uint8Array,
  encoding?: 'hex' | 'base64',
): Promise<EncryptionKey> {
  return AesCryptoModule.importKey(keyInput, encoding);
}

/**
 * Encrypts the given plaintext using the specified key.
 * @param plaintext The data to encrypt.
 * @param key The key to use for encryption.
 * @returns A promise that resolves to a SealedData instance.
 */
export function encryptAsync(
  plaintext: SerializableInput,
  key: EncryptionKey,
  options?: EncryptOptions,
): Promise<SealedData> {
  const { nonce, ...rest } = options ?? {};

  const nonceValue = nonce && 'bytes' in nonce ? nonce.bytes : nonce?.length;
  const nativeOptions = {
    nonce: nonceValue,
    ...rest,
  };
  return AesCryptoModule.encryptAsync(plaintext, key, nativeOptions);
}

/**
 * Decrypts the given sealed data using the specified key and options.
 * @param sealedData The data to decrypt.
 * @param key The key to use for decryption.
 * @param options Options for decryption, including output encoding and additional data.
 * @returns A promise that resolves to the decrypted data string.
 */
export function decryptAsync(
  sealedData: SealedData,
  key: EncryptionKey,
  options: Base64DecryptOptions,
): Promise<string>;
/**
 * Decrypts the given sealed data using the specified key and options.
 * @param sealedData The data to decrypt.
 * @param key The key to use for decryption.
 * @param options Options for decryption, including output encoding and additional data.
 * @returns A promise that resolves to the decrypted data buffer.
 */
export function decryptAsync(
  sealedData: SealedData,
  key: EncryptionKey,
  options?: ArrayBufferDecryptOptions,
): Promise<Uint8Array>;
export function decryptAsync(
  sealedData: SealedData,
  key: EncryptionKey,
  options?: DecryptOptions,
): Promise<string | Uint8Array> {
  return AesCryptoModule.decryptAsync(sealedData, key, options);
}
