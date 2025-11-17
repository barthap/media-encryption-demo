import { createAssetAsync, deleteAssetsAsync, Asset as LegacyAsset } from 'expo-media-library';

import type { MediaType, Album, Asset as AssetType } from 'expo-media-library/src/next';

export { requestPermissionsAsync, createAssetAsync, deleteAssetsAsync } from 'expo-media-library';

// This is a stub wrapper, can be removed when media-lib/next supports web
export class Asset implements AssetType {
  private legacyAsset: LegacyAsset;
  private constructor(legacyAsset: LegacyAsset) {
    this.legacyAsset = legacyAsset;
  }

  get id(): string {
    return this.legacyAsset.id;
  }

  static async create(filePath: string, album?: Album): Promise<Asset> {
    const legacyAsset = await createAssetAsync(filePath, album?.id)
    return new Asset(legacyAsset);
  }
  static async delete(assets: AssetType[]): Promise<void> {
    await deleteAssetsAsync(assets.map(asset => asset.id));
  }

  async getCreationTime(): Promise<number | null> {
    return this.legacyAsset.creationTime;
  }
  async getDuration(): Promise<number | null> {
    return this.legacyAsset.duration;
  }
  async getFilename(): Promise<string> {
    return this.legacyAsset.filename;
  }
  async getHeight(): Promise<number> {
    return this.legacyAsset.height;
  }
  async getMediaType(): Promise<MediaType> {
    return translateMediaType(this.legacyAsset.mediaType);
  }
  async getModificationTime(): Promise<number | null> {
    return this.legacyAsset.modificationTime;
  }
  async getUri(): Promise<string> {
    return this.legacyAsset.uri;
  }
  async getWidth(): Promise<number> {
    return this.legacyAsset.width;
  }

  delete(): Promise<void> {
    return Asset.delete([this]);
  }
}

function translateMediaType(legacyType: LegacyAsset['mediaType']): MediaType {
  switch (legacyType) {
    case 'audio':
      return 'audio' as MediaType;
    case 'photo':
      return 'image' as MediaType;
    case 'video':
    case 'pairedVideo':
      return 'video' as MediaType;
    case 'unknown':
      return 'unknown' as MediaType;
  }
}

