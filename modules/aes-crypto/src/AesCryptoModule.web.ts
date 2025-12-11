import { registerWebModule, NativeModule } from 'expo';
import {
  DecryptOptions,
  EncryptOptions,
  KeySize,
  SealedDataConfig,
  SerializableInput,
} from './AesCrypto.types';

const IV_LENGTH = 12;
const TAG_LENGTH = 16;

const defaultConfig: SealedDataConfig = {
  ivLength: IV_LENGTH,
  tagLength: TAG_LENGTH,
};

class EncryptionKey {
  key: CryptoKey;

  private constructor(key: CryptoKey) {
    this.key = key;
  }

  static async generate(
    input?: KeySize | Uint8Array | string,
    encoding?: 'hex' | 'base64',
  ): Promise<EncryptionKey> {
    if (input instanceof Uint8Array || typeof input === 'string') {
      let bytes;
      if (typeof input === 'string') {
        bytes = encoding === 'base64' ? base64ToArrayBuffer(input) : hexToUintArray(input);
      } else {
        bytes = input;
      }

      const key = await crypto.subtle.importKey('raw', bytes as BufferSource, 'AES-GCM', true, [
        'encrypt',
        'decrypt',
      ]);
      return new EncryptionKey(key);
    }

    const algorithm = { name: 'AES-GCM', length: input ?? 256 };
    const key = await crypto.subtle.generateKey(algorithm, true, ['encrypt', 'decrypt']);
    return new EncryptionKey(key);
  }

  async bytes(): Promise<Uint8Array> {
    const buffer = await crypto.subtle.exportKey('raw', this.key);
    return new Uint8Array(buffer);
  }

  async encoded(encoding: 'hex' | 'base64'): Promise<string> {
    const bytes = await this.bytes();
    const encoded = encoding === 'base64' ? uint8ArrayToBase64(bytes) : bytesToHex(bytes);
    return encoded;
  }

  get size(): KeySize {
    return (this.bytes.length * 8) as KeySize;
  }
}

// Convert a hex string to a byte array
function hexToUintArray(hexString: string): Uint8Array {
  const byteLength = hexString.length / 2;
  const bytes = new Uint8Array(byteLength);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i >>> 1] = parseInt(hexString.substring(i, i + 2), 16);
  }
  return bytes;
}

// Convert a byte array to a hex string
function bytesToHex(bytes: Uint8Array): string {
  let hex = [];
  for (let i = 0; i < bytes.length; i++) {
    let current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
    hex.push((current >>> 4).toString(16));
    hex.push((current & 0xf).toString(16));
  }
  return hex.join('');
}

function base64ToArrayBuffer(base64String: string): ArrayBuffer {
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
function uint8ArrayToBase64(uint8Array: Uint8Array) {
  let binaryString = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binaryString += String.fromCharCode(uint8Array[i]);
  }

  return btoa(binaryString);
}

function serializableInputBuffer(input: SerializableInput): ArrayBuffer {
  if (input instanceof ArrayBuffer) {
    return input;
  }

  if (ArrayBuffer.isView(input)) {
    return input.buffer as ArrayBuffer;
  }

  if (typeof input === 'string') {
    return base64ToArrayBuffer(input);
  }

  throw new Error('Cannot parse serializable input as ArrayBuffer');
}

class SealedData {
  private buffer: ArrayBuffer;
  private config: SealedDataConfig;

  private constructor(buffer: ArrayBuffer, config: SealedDataConfig) {
    this.buffer = buffer;
    this.config = config;
  }

  static fromCombined(combined: SerializableInput, config?: SealedDataConfig): SealedData {
    const buffer = serializableInputBuffer(combined);
    return new SealedData(buffer, config ?? defaultConfig);
  }

  static fromNonceAndCiphertext(
    iv: SerializableInput,
    ciphertext: SerializableInput,
    tag?: SerializableInput | number,
  ): SealedData {
    const ciphertextBuffer = serializableInputBuffer(ciphertext);
    const ivBuffer = serializableInputBuffer(iv);
    const ivLength = ivBuffer.byteLength;

    if (!tag) {
      tag = TAG_LENGTH;
    }

    if (typeof tag === 'number') {
      const totalLength = ivLength + ciphertextBuffer.byteLength;
      const combined = new Uint8Array(totalLength);
      combined.set(new Uint8Array(ivBuffer));
      combined.set(new Uint8Array(ciphertextBuffer), ivLength);

      const config: SealedDataConfig = {
        ivLength,
        tagLength: tag,
      };
      return new SealedData(combined.buffer, config);
    }

    const tagBuffer = serializableInputBuffer(tag);
    const tagLength = tagBuffer.byteLength;
    const totalLength = ivLength + ciphertextBuffer.byteLength + tagLength;

    const combined = new Uint8Array(totalLength);
    combined.set(new Uint8Array(ivBuffer));
    combined.set(new Uint8Array(ciphertextBuffer), ivLength);
    combined.set(new Uint8Array(tagBuffer), totalLength - tagLength);

    return new SealedData(combined.buffer, { ivLength, tagLength });
  }

  get ivSize(): number {
    return this.config.ivLength;
  }
  get tagSize(): number {
    return this.config.tagLength;
  }
  get combinedSize(): number {
    return this.buffer.byteLength;
  }

  async iv(encoding?: 'bytes' | 'base64'): Promise<Uint8Array | string> {
    const useBase64 = encoding === 'base64';
    const bytes = new Uint8Array(this.buffer, 0, this.ivSize);
    return useBase64 ? uint8ArrayToBase64(bytes) : bytes;
  }
  async tag(encoding?: 'bytes' | 'base64'): Promise<Uint8Array | string> {
    const useBase64 = encoding === 'base64';
    const offset = this.combinedSize - this.tagSize;
    const bytes = new Uint8Array(this.buffer, offset, this.tagSize);
    return useBase64 ? uint8ArrayToBase64(bytes) : bytes;
  }
  async combined(encoding?: 'bytes' | 'base64'): Promise<Uint8Array | string> {
    const useBase64 = encoding === 'base64';
    const bytes = new Uint8Array(this.buffer);
    return useBase64 ? uint8ArrayToBase64(bytes) : bytes;
  }
  async ciphertext(options?: {
    withTag?: boolean;
    encoding?: 'bytes' | 'base64';
  }): Promise<Uint8Array | string> {
    const includeTag = options?.withTag ?? false;
    const useBase64 = options?.encoding === 'base64';

    const taggedCiphertextLength = this.combinedSize - this.ivSize;
    const ciphertextLength = includeTag
      ? taggedCiphertextLength
      : taggedCiphertextLength - this.tagSize;

    const bytes = new Uint8Array(this.buffer, this.ivSize, ciphertextLength);
    return useBase64 ? uint8ArrayToBase64(bytes) : bytes;
  }
}

type NativeEncryptOptions = Omit<EncryptOptions, 'nonce'> & {
  nonce?: number | Uint8Array | undefined;
};

class AesCryptoModule extends NativeModule {
  EncryptionKey = EncryptionKey;
  SealedData = SealedData;

  async generateKey(size?: KeySize): Promise<EncryptionKey> {
    return EncryptionKey.generate(size);
  }
  async importKey(
    keyInput: string | Uint8Array,
    encoding?: 'hex' | 'base64',
  ): Promise<EncryptionKey> {
    return EncryptionKey.generate(keyInput, encoding);
  }

  async encryptAsync(
    plaintext: SerializableInput,
    key: EncryptionKey,
    options: NativeEncryptOptions = {},
  ): Promise<SealedData> {
    const { nonce = IV_LENGTH, tagLength = TAG_LENGTH, additionalData: aad } = options;

    const iv = typeof nonce === 'number' ? crypto.getRandomValues(new Uint8Array(nonce)) : nonce;

    const baseParams = { name: 'AES-GCM', iv: iv, tagLength: tagLength * 8 };

    // workaround for invalid AAD format error when it's present but undefined
    const gcmParams = aad
      ? {
          ...baseParams,
          additionalData: serializableInputBuffer(aad),
        }
      : baseParams;

    const ciphertextWithTag = await crypto.subtle.encrypt(
      gcmParams,
      key.key,
      serializableInputBuffer(plaintext),
    );

    return SealedData.fromNonceAndCiphertext(iv, ciphertextWithTag, tagLength);
  }

  async decryptAsync(
    sealedData: SealedData,
    key: EncryptionKey,
    options: DecryptOptions = {},
  ): Promise<string | Uint8Array> {
    const { additionalData: aad, output } = options;

    // workaround for invalid AAD format error when it's present but undefined
    const iv = await sealedData.iv();
    const baseParams = {
      name: 'AES-GCM',
      iv: iv as BufferSource,
      tagLength: sealedData.tagSize * 8,
    };
    const gcmParams: AesGcmParams = aad
      ? {
          ...baseParams,
          additionalData: serializableInputBuffer(aad),
        }
      : baseParams;

    const taggedCiphertext = await sealedData.ciphertext({ withTag: true });
    const plaintextBuffer = await crypto.subtle.decrypt(
      gcmParams,
      key.key,
      taggedCiphertext as BufferSource,
    );

    const useBase64 = output === 'base64';
    const bytes = new Uint8Array(plaintextBuffer);
    return useBase64 ? uint8ArrayToBase64(bytes) : bytes;
  }
}

export default registerWebModule(AesCryptoModule, 'AesCryptoModule');
