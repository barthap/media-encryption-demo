import { NativeModule, requireNativeModule } from 'expo';

import { ImageRef } from './ImageRef';

declare class ImageLoaderModule extends NativeModule {
  ImageRef: typeof ImageRef;

  loadImageAsync(data: Uint8Array): Promise<ImageRef>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ImageLoaderModule>('ImageLoader');
