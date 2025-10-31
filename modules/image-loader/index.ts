// Reexport the native module. On web, it will be resolved to ImageLoaderModule.web.ts
// and on native platforms to ImageLoaderModule.ts
export { default } from './src/ImageLoaderModule';

export type { ImageRef } from './src/ImageRef';
