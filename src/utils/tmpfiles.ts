import { ExpoBlob } from "@/imports/expo-blob";
import { fetch } from 'expo/fetch';
import { Platform } from 'react-native';

const UPLOAD_URL = 'https://tmpfiles.org/api/v1/upload';

interface UploadSuccessResponse {
  status: 'success';
  data: {
    url: string
  }
}

interface UploadFailureResponse {
  message: string;
  errors: object;
}

type UploadResponse = UploadSuccessResponse | UploadFailureResponse;

function isSuccessResponse(response: UploadResponse): response is UploadSuccessResponse {
  return 'status' in response && response.status === 'success'
}

function prepareRequestBody(blob: ExpoBlob, filename: string) {
  // @ts-expect-error
  blob.name = filename;

  const formData = new FormData();

  // TODO: Verify if this platform check is actually needed
  formData.append('file', blob as Blob, Platform.OS === 'web' ? filename : undefined);

  return formData;
}

function makeDownloadableUrl(responseUrl: string): string {
  // http://tmpfiles.org/5891655/name.jpg -> http://tmpfiles.org/dl/5891655/name.jpg

  responseUrl = responseUrl.replace('http', 'https');

  const host = 'tmpfiles.org';
  const index = responseUrl.indexOf(host) + host.length;
  return responseUrl.slice(0, index) + '/dl' + responseUrl.slice(index);
}

interface UploadBlobResult {
  url: string;
  webpageURL: string,
  expires: Date
}

export async function uploadBlobAsync(
  blob: ExpoBlob,
  filename: string = 'upload.jpg'
): Promise<UploadBlobResult> {
  const requestBody = prepareRequestBody(blob, filename);

  const response = await fetch(UPLOAD_URL, {
    method: 'POST',
    body: requestBody,
    // NOTE: Do not manually set `headers: { content-type: multipart/form-data }` here
    // This breaks web which automatically adds boundary here. And would end up with HTTP 422 responses
  });

  const json = await response.json() as UploadResponse;
  if (!isSuccessResponse(json)) {
    throw new Error(`Errror response (HTTP ${response.status}) from upload endpoint: ${json.message}`);
  }

  const expirationDate = new Date();
  expirationDate.setHours(expirationDate.getHours() + 1);

  return {
    url: makeDownloadableUrl(json.data.url),
    webpageURL: json.data.url,
    expires: expirationDate
  }
}
