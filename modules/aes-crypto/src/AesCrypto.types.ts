import type { StyleProp, ViewStyle } from 'react-native';


export enum KeySize {
  AES128 = 128,
  AES192 = 192,
  AES256 = 256,
}

export declare class SymmetricKey {
  constructor(bytes: Uint8Array)
  constructor(size?: KeySize)

  size: KeySize;
  bytes(): Promise<Uint8Array>;
}

export declare class SealedData {
  // TODO: Class cannot have multiple constructors
  // use static functions instead
  constructor(combined: Uint8Array, ivLength: number, tagLength?: number);
  constructor(iv: Uint8Array, ciphertextWithTag: Uint8Array, tagLength?: number);

  ivSize: number;
  tagSize: number;
  combinedSize: number;

  iv(): Uint8Array;
  combined(): Uint8Array;
  ciphertext(includeTag?: boolean): Uint8Array;
}

export type OnLoadEventPayload = {
  url: string;
};

export type AesCryptoModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
};

export type ChangeEventPayload = {
  value: string;
};

export type AesCryptoViewProps = {
  url: string;
  onLoad: (event: { nativeEvent: OnLoadEventPayload }) => void;
  style?: StyleProp<ViewStyle>;
};
