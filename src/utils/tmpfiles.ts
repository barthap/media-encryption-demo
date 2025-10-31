import { Blob as ExpoBlob } from "expo-blob";
import { fetch } from 'expo/fetch';

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
  formData.append('file', blob as Blob);
  return formData;
}

function makeDownloadUrl(responseUrl: string): string {
  // http://tmpfiles.org/5891655/name.jpg -> http://tmpfiles.org/dl/5891655/name.jpg

  responseUrl = responseUrl.replace('http', 'https');

  const host = 'tmpfiles.org';
  const index = responseUrl.indexOf(host) + host.length;
  return responseUrl.slice(0, index) + '/dl' + responseUrl.slice(index);
}

interface UploadBlobResult {
  url: string;
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
    headers: {
      'content-type': 'multipart/form-data'
    }
  });

  const json = await response.json() as UploadResponse;
  if (!isSuccessResponse(json)) {
    throw new Error(`Errror response (HTTP ${response.status}) from upload endpoint: ${json.message}`);
  }

  const expirationDate = new Date();
  expirationDate.setHours(expirationDate.getHours() + 1);

  return {
    url: makeDownloadUrl(json.data.url),
    expires: expirationDate
  }
}
