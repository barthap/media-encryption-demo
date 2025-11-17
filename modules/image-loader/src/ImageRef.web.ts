import { SharedRef } from "expo";

/**
 * Copied from expo-image's [`ImageRefWeb`]
 */
export default class ImageRef extends SharedRef<'image'> {
  override nativeRefType = 'image';

  uri: string | null = null;
  width: number = 0;
  height: number = 0;
  mediaType: string | null = null;

  static init(uri: string, width: number, height: number, mediaType: string | null): ImageRef {
    return Object.assign(new ImageRef(), {
      uri,
      width,
      height,
      mediaType,
    });
  }
}
