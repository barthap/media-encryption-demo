import * as ExpoCrypto from 'expo-crypto';
import { hexToUintArray } from './common';

export interface PasswordHasher {
  /**
   * Should return 256-bit long hash of given password
   */
  digest(password: string): Promise<Uint8Array>
}

/**
 * Key derivation using simple SHA-2 function. It is unsafe
 * because it is very fast nowadays and thus vulnerable to brute-force,
 * even with salt. Prefer Argon2id or PBKDF2 instead.
 */
export class UnsafeSha256Hasher implements PasswordHasher {
  async digest(password: string): Promise<Uint8Array> {
    const digestString = await ExpoCrypto.digestStringAsync(
      ExpoCrypto.CryptoDigestAlgorithm.SHA256,
      password,
      { encoding: ExpoCrypto.CryptoEncoding.HEX }
    );
    return hexToUintArray(digestString);
  }
}

export interface Argon2Config {
  /**
   * **Time Cost (`t`)**
   * The number of iterations or passes over the memory array, controlling the time complexity.
   */
  timeCost: number;
  /**
   * **Memory Cost (`m`)**
   * The amount of memory in KiB (kilobytes) to be used for hashing, which increases resistance to memory-based attacks.
   */
  memoryCost: number;
  /**
   * **Parallelism (`p`)**
   * The number of threads to use, which should be based on the number of available CPU cores.
   */
  parallelism: number;
}

export const defaultArgon2Config: Argon2Config = Object.freeze({
  timeCost: 3,
  memoryCost: 64,
  parallelism: 1,
});

export class Argon2Hasher implements PasswordHasher {
  private config: Argon2Config;

  constructor(config: Argon2Config = defaultArgon2Config) {
    this.config = config;
  }

  async digest(password: string): Promise<Uint8Array> {
    throw new Error("Unimplemented")
  }
}

export interface Pbkdf2Config {
  algorithm: 'sha256',
  iterations: number,
  salt: string,
  keyLength: number,
}

export class Pbkdf2Hasher implements PasswordHasher {
  private config: Pbkdf2Config;

  constructor(config: Pbkdf2Config) {
    this.config = config;
  }

  async digest(password: string): Promise<Uint8Array> {
    throw new Error("Unimplemented")
  }
}

// global pre-configured instances
export const Sha256Kdf = new UnsafeSha256Hasher();
