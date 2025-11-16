// Reexport the native module. On web, it will be resolved to AesCryptoModule.web.ts
// and on native platforms to AesCryptoModule.ts
export { default } from './src/AesCryptoModule';
export * from './src/AesCrypto.types';
