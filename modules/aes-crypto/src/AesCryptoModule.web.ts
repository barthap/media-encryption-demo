import { registerWebModule, NativeModule } from 'expo';
import { KeySize } from './AesCrypto.types';

const IV_LENGTH = 12;
const TAG_LENGTH = 16;

class SymmetricKey {
  key: CryptoKey;

  private constructor(key: CryptoKey) {
    this.key = key;
  }

  static generate(bytes: Uint8Array): Promise<SymmetricKey>
  static generate(size?: KeySize): Promise<SymmetricKey>
  static async generate(input?: KeySize | Uint8Array): Promise<SymmetricKey> {
    if (input instanceof Uint8Array) {
      const key = await crypto.subtle.importKey(
        'raw',
        input as BufferSource,
        'AES-GCM',
        true,
        ['encrypt', 'decrypt'],
      );
      return new SymmetricKey(key);
    }
    const algorithm = { name: 'AES-GCM', length: input ?? 256 };
    const key = await crypto.subtle.generateKey(algorithm, true, [
      'encrypt',
      'decrypt',
    ]);
    return new SymmetricKey(key);
  }

  async bytes(): Promise<Uint8Array> {
    const buffer = await crypto.subtle.exportKey('raw', this.key);
    return new Uint8Array(buffer);
  }

  get size(): KeySize {
    return this.bytes.length * 8 as KeySize
  }
}

class SealedData {
  private iv_: Uint8Array;
  private ciphertextWithTag: Uint8Array;
  private tagLength: number;

  // TODO: Class cannot have multiple constructors
  // use static functions instead
  constructor(combined: Uint8Array, ivLength: number, tagLength?: number);
  constructor(iv: Uint8Array, ciphertextWithTag: Uint8Array, tagLength?: number);

  constructor(combinedOrIv: Uint8Array, lengthOrCipher: number | Uint8Array, tagLength?: number) {
    if (lengthOrCipher instanceof Uint8Array) {
      //iv, ciphertextWithTag
      this.iv_ = combinedOrIv;
      this.ciphertextWithTag = lengthOrCipher;
    } else {
      // combined, tagLength;
      this.iv_ = combinedOrIv.subarray(0, lengthOrCipher);
      this.ciphertextWithTag = combinedOrIv.subarray(lengthOrCipher);
    }

    this.tagLength = tagLength ?? TAG_LENGTH;
  }

  get ivSize(): number {
    return this.iv_.length;
  }
  get tagSize(): number {
    return this.tagLength;
  }
  get combinedSize(): number {
    return this.ivSize + this.ciphertextWithTag.length;
  }

  iv(): Uint8Array {
    return this.iv_;
  }
  combined(): Uint8Array {
    // TODO: What's more efficient - doing this here or in constructor
    const buf = new ArrayBuffer(this.combinedSize);
    const combined = new Uint8Array(buf);
    combined.set(this.iv());
    combined.set(this.ciphertextWithTag, this.ivSize);
    return combined;
  }
  ciphertext(includeTag?: boolean): Uint8Array {
    if (includeTag) {
      return this.ciphertextWithTag;
    }

    return this.ciphertextWithTag.subarray(0, this.ciphertextWithTag.length - this.tagLength);
  }
}

class AesCryptoModule extends NativeModule {
  async generateKey(size?: KeySize): Promise<SymmetricKey> {
    return SymmetricKey.generate(size);

  }
  async importKey(bytes: Uint8Array): Promise<SymmetricKey> {
    return SymmetricKey.generate(bytes)
  }

  async encryptAsync(key: SymmetricKey, plaintext: Uint8Array, aad?: Uint8Array): Promise<SealedData> {
    // we're creating the buffer now so we can avoid reallocating it later
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // workaround for invalid AAD format error when it's present but undefined
    const algorithmBase = { name: 'AES-GCM', iv: iv, tagLength: TAG_LENGTH * 8 };
    const algorithm = aad ? { ...algorithmBase, additionalData: aad } : algorithmBase;


    const ciphertextWithTag = await crypto.subtle.encrypt(
      algorithm,
      key.key,
      plaintext as BufferSource,
    );

    return new SealedData(iv, new Uint8Array(ciphertextWithTag), TAG_LENGTH);
  }

  async decryptAsync(key: SymmetricKey, sealedData: SealedData, aad?: Uint8Array): Promise<Uint8Array> {

    // workaround for invalid AAD format error when it's present but undefined
    const algorithmBase = { name: 'AES-GCM', iv: sealedData.iv(), tagLength: TAG_LENGTH * 8 };
    const algorithm = aad ? { ...algorithmBase, additionalData: aad } : algorithmBase;

    const plaintextBuffer = await crypto.subtle.decrypt(
      algorithm,
      key.key,
      sealedData.ciphertext(true) as BufferSource,
    );
    return new Uint8Array(plaintextBuffer);
  }

  SymmetricKey = SymmetricKey;
  SealedData = SealedData;
};

export default registerWebModule(AesCryptoModule, 'AesCryptoModule');
