import { registerWebModule, NativeModule } from 'expo';

import ImageRef from './ImageRef.web';

class ImageLoaderModule extends NativeModule {
  async loadImageAsync(data: Uint8Array): Promise<ImageRef> {
    const blob = new Blob([data as BlobPart]);
    const imageObjectUrl = URL.createObjectURL(blob);
    const image = await loadImageElementAsync(imageObjectUrl);

    return ImageRef.init(
      imageObjectUrl,
      image.width,
      image.height,
      // TODO: Infer media type based on magic bytes
      null,
    );
  }
}

/**
 * Helper that resolves to an `<img />` element once it finishes loading the given source.
 *
 * Original source: `expo-image`
 */
async function loadImageElementAsync(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = document.createElement('img');

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load the image from '${src}'`));
    image.src = src;
  });
}

export default registerWebModule(ImageLoaderModule, 'ImageLoaderModule');
