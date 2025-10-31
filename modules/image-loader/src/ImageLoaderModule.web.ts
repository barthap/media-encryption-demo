import { registerWebModule, NativeModule } from 'expo';

class ImageLoaderModule extends NativeModule {
  async loadImageAsync() {
    throw new Error('not implemented');
  }
};

export default registerWebModule(ImageLoaderModule, 'ImageLoaderModule');
