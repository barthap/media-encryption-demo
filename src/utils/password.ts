import * as ExpoCrypto from 'expo-crypto';
import { hexToUintArray } from './common';
import { AES } from '@modules/aes-crypto';
import * as Argon2 from '@modules/expo-argon2/src/index';

export type KeyDerivationAlgorithm = 'sha256' | 'argon2' | 'pbkdf2';

export interface PasswordHasher {
  /**
   * Should return 256-bit long hash of given password
   */
  hash(password: string): Promise<AES.EncryptionKey>
}

/**
 * Key derivation using simple SHA-2 function. It is unsafe
 * because it is very fast nowadays and thus vulnerable to brute-force,
 * even with salt. Prefer Argon2id or PBKDF2 instead.
 */
export class UnsafeSha256Hasher implements PasswordHasher {
  async hash(password: string): Promise<AES.EncryptionKey> {
    const digestString = await ExpoCrypto.digestStringAsync(
      ExpoCrypto.CryptoDigestAlgorithm.SHA256,
      password,
      { encoding: ExpoCrypto.CryptoEncoding.HEX }
    );
    const bytes = hexToUintArray(digestString);
    return await AES.importKey(bytes);
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
  /**
   * Salt 
   * WARN: it is constant for the purpose of this app, but it should be unique for each password and stored alongside!
   */
  salt: string;
}

export const defaultArgon2Config: Argon2Config = Object.freeze({
  timeCost: 3,
  memoryCost: 32 * 1024,
  parallelism: 1,
  salt: '76b8aca35e949e6590965764fee8c9ec'
});

export class Argon2Hasher implements PasswordHasher {
  private config: Argon2Config;

  constructor(config: Argon2Config = defaultArgon2Config) {
    this.config = config;
  }

  async hash(password: string): Promise<AES.EncryptionKey> {
    const {
      salt,
      timeCost,
      memoryCost,
      parallelism,
    } = this.config;

    const { rawHash } = await Argon2.hashAsync(password, salt, {
      iterations: timeCost,
      memory: memoryCost,
      parallelism
    });

    const bytes = hexToUintArray(rawHash);
    return await AES.importKey(bytes);
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

  async hash(password: string): Promise<AES.EncryptionKey> {
    throw new Error("Unimplemented")
  }
}

// global pre-configured instances
const Sha256Kdf = new UnsafeSha256Hasher();
const Argon2Kdf = new Argon2Hasher();

export function getHasher(alrogirhm: KeyDerivationAlgorithm): PasswordHasher {
  switch (alrogirhm) {
    case 'sha256': return Sha256Kdf;
    case 'argon2': return Argon2Kdf;
    case 'pbkdf2': throw new Error("PBKDF2 Hasher is not implemented yet");
  }
}

