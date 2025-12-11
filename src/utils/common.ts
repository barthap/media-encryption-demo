export function extractFilename(path: string): string | null {
  const pathSegments = path.split('/');
  const filename = pathSegments[pathSegments.length - 1];
  return filename;
}

/**
 * Format bytes as human-readable text.
 *
 * Stolen from [StackOverflow](https://stackoverflow.com/a/14919494)
 *
 * @param bytes Number of bytes.
 * @param si True to use metric (SI) units, aka powers of 1000. False to use
 *           binary (IEC), aka powers of 1024.
 * @param dp Number of decimal places to display.
 *
 * @return Formatted string.
 */
export function humanFileSize(bytes: number, si = false, dp = 1): string {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10 ** dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

  return bytes.toFixed(dp) + ' ' + units[u];
}

export function hexToUintArray(hexString: string): Uint8Array {
  const byteLength = hexString.length / 2;
  const bytes = new Uint8Array(byteLength);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i >>> 1] = parseInt(hexString.substring(i, i + 2), 16);
  }
  return bytes;
}

// TODO: Check if pure native b64 impl wouldnt be faster
export function base64toUintArray(b64string: string): Uint8Array {
  const binaryString = atob(b64string);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// TODO: Check if pure native b64 impl wouldnt be faster
export function uint8ArrayToBase64(uint8Array: Uint8Array) {
  let binaryString = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binaryString += String.fromCharCode(uint8Array[i]);
  }

  return btoa(binaryString);
}
