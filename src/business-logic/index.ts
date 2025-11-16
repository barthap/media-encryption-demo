import { Blob as ExpoBlob } from 'expo-blob';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library/next';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

import { benchmarked } from "@/utils/benchmarks";
import { base64toUintArray } from "@/utils/common";
import { KeyDerivationAlgorithm, Sha256Kdf } from '@/utils/password';
import AesCrypto from '@modules/aes-crypto';
import ImageLoader, { ImageRef } from '@modules/image-loader';
import { Alert } from 'react-native';
import { randomUUID } from 'expo-crypto';

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
}

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

// TODO: Accept in-memory image
// The reason we want a File uri is that we can easily read it as base64 
// which is the prerequisite for setting clipboard content
export async function copyImageToClipboardAsync(imageFileUri: string) {
  const file = new FileSystem.File(imageFileUri);
  if (!file.exists) {
    throw new Error('File must exist');
  }

  const base64data = await file.base64();

  await Clipboard.setImageAsync(base64data);
}

export async function saveImageToGalleryAsync(imageFileUri: string): Promise<MediaLibrary.Asset | null> {
  const { granted } = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
  if (!granted) {
    Alert.alert('No permissions', 'Media library permission not granted. Please grant in settings');
    return null;
  }

  const asset = await MediaLibrary.Asset.create(imageFileUri);
  const info = `ID: ${asset.id}\nName:${await asset.getFilename()}`;
  Alert.alert('Asset added', info);
  return asset;
}

export async function saveFileToFileSystemAsync(dataBlob: ExpoBlob, filename: string): Promise<FileSystem.File | null> {
  const dir = await FileSystem.Directory.pickDirectoryAsync();
  const file = new FileSystem.File(dir.uri, filename);
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

  await benchmarked('Write blob to file directly', async () => {
    const buffer = await dataBlob.arrayBuffer();
    file.write(new Uint8Array(buffer));
  })

  return file;
}

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
export async function downloadEncryptedDataAsync(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (response.status !== 200) {
    throw new Error(`Failed to download: HTTP ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

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
export async function loadImageInMemoryAsync(imageData: Uint8Array): Promise<ImageRef> {
  return await ImageLoader.loadImageAsync(imageData);
}

export async function saveTempFileAsync(
  contents: Uint8Array,
  filename: string | null,
  overwrite: boolean = true,
): Promise<FileSystem.File> {
  if (!filename) {
    filename = randomUUID();
  }
  const imageFile = new FileSystem.File(FileSystem.Paths.cache, filename);
  if (overwrite) {
    imageFile.create({ overwrite });
  }
  imageFile.write(contents, {});
  return imageFile;
}
