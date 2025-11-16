import { NativeModule, requireNativeModule } from 'expo';

import { AesCryptoModuleEvents, KeySize, SealedData, SymmetricKey } from './AesCrypto.types';

declare class AesCryptoModule extends NativeModule<AesCryptoModuleEvents> {
  generateKey(size?: KeySize): Promise<SymmetricKey>;
  importKey(bytes: Uint8Array): Promise<SymmetricKey>;

  encryptAsync(key: SymmetricKey, plaintext: Uint8Array, aad?: Uint8Array): Promise<SealedData>;
  decryptAsync(key: SymmetricKey, sealedData: SealedData, aad?: Uint8Array): Promise<Uint8Array>;

  SymmetricKey: typeof SymmetricKey;
  SealedData: typeof SealedData;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<AesCryptoModule>('AesCrypto');
