import * as ExpoCrypto from 'expo-crypto';

export interface PasswordHasher {
  /**
   * Should return 256-bit long hash of given password
   */
  digest(password: string): Promise<Uint8Array>
}

export class Sha256Hasher implements PasswordHasher {
  async digest(password: string): Promise<Uint8Array> {
    const digestString = await ExpoCrypto.digestStringAsync(
      ExpoCrypto.CryptoDigestAlgorithm.SHA256,
      password,
      { encoding: ExpoCrypto.CryptoEncoding.HEX }
    );
    return hexToArrayBuffer(digestString);
  }
}

export interface Argon2Config {
  // TODO
}

export class Argon2Hasher implements PasswordHasher {
  private config: Argon2Config;

  constructor(config: Argon2Config) {
    this.config = config;
  }

  async digest(password: string): Promise<Uint8Array> {
    throw new Error("Unimplemented")
  }
}

function hexToArrayBuffer(hexString: string): Uint8Array {
  const byteLength = hexString.length / 2;
  const bytes = new Uint8Array(byteLength);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i >>> 1] = parseInt(hexString.substring(i, i + 2), 16);
  }
  return bytes;
}
