import { Blob as ExpoBlob } from 'expo-blob';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library/next';

import { benchmarked } from "@/utils/benchmarks";
import { base64toUintArray, uint8ArrayToBase64 } from "@/utils/common";
import { KeyDerivationAlgorithm, Sha256Kdf } from '@/utils/password';
import AesCrypto from '@modules/aes-crypto';
import ImageLoader, { ImageRef } from '@modules/image-loader';
import { randomUUID } from 'expo-crypto';
import { Alert, Platform } from 'react-native';

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
}

/**
 * Uses Stream to write ExpoBlob contents to a FileSystem.File.
 * For some reason it is extremely slow (~700x slower than direct write)
 */
const USE_SLOW_STREAM_TRANSFER = false;

/**
 * Prompts the user to pick an image from their photo gallery.
 * 
 * @returns Promise that resolves to a PickedImage object with URI and dimensions, or null if cancelled or no permissions
 * @throws Alert is shown if permissions are not granted
 */
export async function pickImageFromGalleryAsync(): Promise<PickedImage | null> {
  const permissions = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissions.granted) {
    Alert.alert('No permissions', 'Open settings and grant media lib permissions');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({});
  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const { uri, width, height } = result.assets[0];
  const image = { uri, width, height };
  return image;
}

/**
 * Prompts the user to pick an image file from the filesystem using a file picker.
 * 
 * @returns Promise that resolves to a PickedImage object with URI and dimensions, or null if cancelled
 * @throws Error if the selected file is not an image MIME type
 */
export async function pickImageFromFilesystemAsync(): Promise<PickedImage | null> {
  let result;
  try {
    result = await FileSystem.File.pickFileAsync();
  } catch {
    // Usually it throws when user cancels picking
    return null;
  }
  const file = Array.isArray(result) ? result[0] : result;
  if (!file.type.startsWith("image/")) {
    throw new Error('Not an image MIME type:' + file.type);
  }
  const image = await Image.loadAsync(file.uri);
  return { uri: file.uri, width: image.width, height: image.height };
}

/**
 * Retrieves an image from the device clipboard and converts it to a PickedImage.
 * NOTE: Returned URI is a base64 data uri
 * 
 * @returns Promise that resolves to a PickedImage object with base64 data URI and dimensions, or null if no image in clipboard
 */
export async function pasteImageFromClipboardAsync(): Promise<PickedImage | null> {
  const pasted = await Clipboard.getImageAsync({ format: 'jpeg' });
  if (!pasted) {
    return null;
  }
  const { data: base64data } = pasted;
  const { width, height } = await Image.loadAsync(base64data);
  // console.log({ width, height, base64: base64data.substring(0, 30) });

  // TODO: This is hacky that we rely on uri being a base64 data URI
  // we later do the conversion in `readUriToArrayBufferAsync()`
  return { uri: base64data, width, height };
}

/**
 * Copies an image to the device clipboard as base64 data.
 *
 * NOTE: Prefer providing File uri to Uint8Array because base64 encoding is 6x faster for files.
 * 
 * @param image - Bytes or file system URI of the image to copy
 * @throws Error if the file does not exist
 */
export async function copyImageToClipboardAsync(image: string | Uint8Array) {
  const base64promise = (async () => {
    if (image instanceof Uint8Array) {
      return benchmarked('Base64 encode', async () => uint8ArrayToBase64(image));
    }

    const file = new FileSystem.File(image);
    if (!file.exists) {
      throw new Error('File must exist');
    }

    return benchmarked('File.base64()', async () => file.base64());
  })();

  await Clipboard.setImageAsync(await base64promise);
}

/**
 * Saves an image file to the device's photo gallery/media library.
 * 
 * @param imageFileUri - The file system URI of the image to save
 * @returns Promise that resolves to the created MediaLibrary.Asset or null if permissions denied
 */
export async function saveImageToGalleryAsync(imageFileUri: string): Promise<MediaLibrary.Asset | null> {
  // FIXME: Why writeOnly = true doesn't let me create assets?
  const { granted } = await MediaLibrary.requestPermissionsAsync(false);
  if (!granted) {
    Alert.alert('No permissions', 'Media library permission not granted. Please grant in settings');
    return null;
  }

  const asset = await MediaLibrary.Asset.create(imageFileUri);
  const info = `ID: ${asset.id}\nName:${await asset.getFilename()}`;
  Alert.alert('Asset added', info);
  return asset;
}


/**
 * Prompts user to select a directory and saves a data blob as a file.
 * 
 * @param dataBlob - The blob data to save
 * @param filename - The name for the saved file
 * @returns Promise that resolves to the created File object or null if cancelled/not overwritten
 */
export async function saveFileToFileSystemAsync(dataBlob: ExpoBlob, filename: string): Promise<FileSystem.File | null> {
  const dir = await FileSystem.Directory.pickDirectoryAsync();

  let file: FileSystem.File;
  if (Platform.OS !== 'android') {
    // This fails on Android with:
    // [Error: Call to function 'FileSystemFile.create' has been rejected.
    // → Caused by: A folder with the same name already exists in the file location]
    file = new FileSystem.File(dir.uri, filename);
    if (file.exists) {
      const shouldOverwrite = await new Promise<boolean>(resolve => {
        Alert.alert('File already exsits', `Overwrite '${filename}'?`, [
          { text: 'Yes', style: 'destructive', onPress: () => resolve(true) },
          { text: 'No', style: 'cancel', onPress: () => resolve(false) },
        ])
      });

      if (!shouldOverwrite) {
        return null;
      }
    }
    file.create({ overwrite: true });
  } else {
    // FIXME: Android will ignore filename extension and use `.txt`
    // unless mime type is provided
    const mimeType =
      filename.endsWith('.jpg') ? 'image/jpeg'
        : filename.endsWith('.png') ? 'image/png'
          : 'application/octet-stream';
    file = dir.createFile(filename, mimeType) as FileSystem.File;
  }

  if (USE_SLOW_STREAM_TRANSFER) {
    // FIXME: Investigate why this is so slow
    await benchmarked('Stream blob contents into file', async () => {
      const fileStream = file.writableStream();
      const blobStream = dataBlob.stream();
      await blobStream.pipeTo(fileStream);
    });
  } else {
    await benchmarked('Write blob to file directly', async () => {
      const buffer = await dataBlob.arrayBuffer();
      file.write(new Uint8Array(buffer));
    });
  }

  return file;
}

/**
 * Reads data from a URI (either base64 data URI or file system URI) into a Uint8Array.
 * 
 * @param uri - The URI to read from (supports data: URIs and file system URIs)
 * @returns Promise that resolves to the file contents as Uint8Array
 */
async function readUriToArrayBufferAsync(uri: string): Promise<Uint8Array> {
  if (uri.startsWith('data:')) {
    return benchmarked('Base64 decode', () => {
      const commaPos = uri.indexOf(',');
      const bytes = base64toUintArray(uri.substring(commaPos + 1));
      return Promise.resolve(bytes);
    });
  }

  const file = new FileSystem.File(uri);
  return await file.bytes();
}

/**
 * Encrypts an image using AES encryption with a password-derived key.
 * 
 * @param image - The PickedImage object containing the image URI and metadata
 * @param password - The password to derive the encryption key from
 * @param kdfAlgorithm - The key derivation algorithm to use (currently only 'sha256' is supported)
 * @returns Promise that resolves to an ExpoBlob containing the encrypted data
 * @throws Error if an unsupported KDF algorithm is specified
 */
export async function encryptImageWithPasswordAsync(
  image: PickedImage,
  password: string,
  kdfAlgorithm: KeyDerivationAlgorithm = 'sha256'
): Promise<ExpoBlob> {
  if (kdfAlgorithm !== 'sha256') {
    throw new Error(`KDF '${kdfAlgorithm}' is not implemented yet`);
  }

  const keyBytes = await Sha256Kdf.digest(password);
  const key = await AesCrypto.importKey(keyBytes);

  const plainImageBuffer = await readUriToArrayBufferAsync(image.uri);

  const sealedData = await AesCrypto.encryptAsync(key, plainImageBuffer);
  const sealedDataBytes = sealedData.combined();

  const blob = new ExpoBlob([sealedDataBytes]);
  return blob;
}

// Download/Load functions
/**
 * Downloads encrypted data from a URL.
 * 
 * @param url - The URL to download data from
 * @returns Promise that resolves to the downloaded data as Uint8Array
 * @throws Error if the HTTP request fails (non-200 status)
 */
export async function downloadEncryptedDataAsync(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (response.status !== 200) {
    throw new Error(`Failed to download: HTTP ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Prompts the user to pick a file and loads its contents as encrypted data.
 * 
 * @returns Promise that resolves to the file contents as Uint8Array, or null if cancelled or no file selected
 */
export async function loadEncryptedDataFromFileAsync(): Promise<Uint8Array | null> {
  let result;
  try {
    result = await FileSystem.File.pickFileAsync();
  } catch {
    // Usually throws when user cancels
    return null;
  }

  const file = Array.isArray(result) ?
    result.length > 0 ? result[0] : null
    : result;
  if (!file) {
    return null;
  }
  return await file.bytes();
}

// Decryption functions
/**
 * Decrypts data using AES decryption with a password-derived key.
 * 
 * @param encryptedData - The encrypted data to decrypt
 * @param password - The password to derive the decryption key from
 * @param kdfAlgorithm - The key derivation algorithm to use (currently only 'sha256' is supported)
 * @returns Promise that resolves to the decrypted data as Uint8Array
 * @throws Error if an unsupported KDF algorithm is specified or decryption fails
 */
export async function decryptDataWithPasswordAsync(
  encryptedData: Uint8Array,
  password: string,
  kdfAlgorithm: KeyDerivationAlgorithm = 'sha256'
): Promise<Uint8Array> {
  if (kdfAlgorithm !== 'sha256') {
    throw new Error(`KDF '${kdfAlgorithm}' is not implemented yet`);
  }

  const keyBytes = await Sha256Kdf.digest(password);
  const key = await AesCrypto.importKey(keyBytes);

  const sealedData = new AesCrypto.SealedData(encryptedData, 12);
  return await AesCrypto.decryptAsync(key, sealedData);
}

// Image processing functions
/**
 * Loads image data into memory and returns an ImageRef handle.
 * 
 * @param imageData - The raw image data as Uint8Array
 * @returns Promise that resolves to an ImageRef object for the loaded image
 */
export async function loadImageInMemoryAsync(imageData: Uint8Array): Promise<ImageRef> {
  return await ImageLoader.loadImageAsync(imageData);
}

/**
 * Saves data to a temporary file in the cache directory.
 * 
 * @param contents - The data to write to the file
 * @param filename - The filename to use, or null to generate a random UUID
 * @param overwrite - Whether to overwrite existing files (default: true)
 * @returns Promise that resolves to the created File object
 */
interface SaveTempFileOptions {
  overwrite?: boolean,
  /**
   * Try inferring file extension if filename is not provieded. This works only for images.
   */
  inferFileExtension?: boolean
}
export async function saveTempFileAsync(
  contents: Uint8Array,
  filename: string | null,
  options: SaveTempFileOptions = {},
): Promise<FileSystem.File> {
  const {
    overwrite = true,
    inferFileExtension = true,
  } = options;

  if (!filename) {
    filename = randomUUID();

    if (inferFileExtension) {
      const extension = inferFileExtensionFromMagicBytes(contents);
      filename += extension ?? '';
    }

  }
  const imageFile = new FileSystem.File(FileSystem.Paths.cache, filename);
  if (overwrite) {
    imageFile.create({ overwrite: true });
  }
  imageFile.write(contents, {});

  return imageFile;
}

const MAGIC_BYTES: Record<`.${string}`, Uint8Array> = Object.freeze({
  '.png': new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  '.jpg': new Uint8Array([0xFF, 0xD8, 0xFF]),
});

/**
 * Best effort to infer file extension based on file data (its header).
 * For now, works only for PNG and JPEG images.
 * Add support for more as needed.
 */
function inferFileExtensionFromMagicBytes(imageData: Uint8Array) {
  for (const extension in MAGIC_BYTES) {
    const magic_bytes = MAGIC_BYTES[extension as keyof typeof MAGIC_BYTES];

    // Not the fastest, but magic bytes aren't long sequences
    const bytesMatch = imageData
      .slice(0, magic_bytes.length)
      .every((byte, i) => byte === magic_bytes[i]);

    if (bytesMatch) {
      return extension;
    }
  }

  return null;
}

/**
  * Utility used by [`saveTempFileAsync`] to infer file extension if it is an image.
  *
  * @deprecated Does not work on Android. Use [`inferFileExtensionFromMagicBytes`] instead,
  * its simpler and better.
  */
async function inferFileExtensionAndRename(file: FileSystem.File) {
  // NOTE: `file.type` is null for newly-created files so we have to assume it is an image
  // and load using with expo-image
  // FIXME: Does not work on Android (always null, see expo-image source code)
  try {
    const imageInfo = await Image.loadAsync(file.uri);

    let extension;
    switch (imageInfo.mediaType) {
      case 'image/jpeg':
        extension = '.jpg';
        break;
      case 'image/png':
        extension = '.png';
        break;
    }

    if (!extension) {
      return;
    }

    file.move(new FileSystem.File(file.uri + extension));
  } catch (e) {
    console.log('Failed to infer file extension:', e);
  }

}
