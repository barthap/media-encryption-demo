import { Result, runCatching } from '@/utils/result';
import { uploadBlobAsync } from '@/utils/tmpfiles';
import { ExpoBlob } from '@/imports/expo-blob';
import * as React from 'react';

export interface ImageMetadata {
  width: number;
  height: number;
  filename: string;
}

export interface UploadInfo {
  /**
   * Timestamp at which upload expires
   */
  expires: Date;
  /**
   * User-friendly URL for viewing info in the browser
   */
  webpageURL: string;
  /**
   * Direct link to the uploaded file.
   */
  directURL: string;
}

type AppState =
  | { status: 'none' }
  | { status: 'image_uploaded', info: UploadInfo, metadata: ImageMetadata };

const initialAppState: AppState = { status: 'none' };

interface CtxVal {
  uploadState: AppState,
  setAppState: (newState: AppState) => void
  uploadFile: (data: ExpoBlob, metadata: ImageMetadata) => Promise<Result<UploadInfo>>;
  clearUpload: () => void;
}

const FileHostingContext = React.createContext<CtxVal>({
  uploadState: initialAppState,
  setAppState: () => { },
  uploadFile: () => Promise.reject(new Error('Context not set')),
  clearUpload: () => { }
});

export function useHostingContext() {
  return React.useContext(FileHostingContext);
}

export default function FileHostingProvider({ children }: React.PropsWithChildren) {
  const [appState, setAppState] = React.useState<AppState>(initialAppState);

  const uploadFile = (data: ExpoBlob, metadata: ImageMetadata) => runCatching(async () => {
    const encryptedFilename = `${metadata.filename}.dat`;

    const { url, webpageURL, expires } = await uploadBlobAsync(data, encryptedFilename);

    const info: UploadInfo = {
      expires,
      webpageURL,
      directURL: url,
    };

    setAppState({ status: 'image_uploaded', info, metadata });
    return info;
  });

  const clearUpload = () => setAppState(initialAppState);

  const ctxValue: CtxVal = {
    uploadState: appState,
    setAppState,
    uploadFile,
    clearUpload,
  };

  return <FileHostingContext.Provider value={ctxValue}>
    {children}
  </FileHostingContext.Provider>
}
