import { SharedRef } from 'expo';

import ImageLoader from './ImageLoaderModule';

/**
 * A reference to a native instance of the image.
 */
export declare class ImageRef extends SharedRef<'image'> {
  /**
   * Width of the image.
   */
  width: number;

  /**
   * Height of the image.
   */
  height: number;
}

export default ImageLoader.ImageRef as typeof ImageRef;

