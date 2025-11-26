# Media Encryption Demo

A demonstration app showcasing binary data manipulation across various Expo libraries using image data as an example. The app demonstrates encrypted image workflows, from client-side encryption to secure storage on external hosting and later retrieval.

<https://github.com/user-attachments/assets/25ff87c3-a5b1-4c5c-a0ec-67aeac73bf67>

## Overview

The app implements the following workflow:

1. **Upload Flow**: User picks an image, encrypts it with a password before uploading to an external server
2. **Download Flow**: User downloads the encrypted image, enters password, and the decrypted image is displayed

The demo extensively uses blobs and array buffers, integrating many Expo libraries including FileSystem, Image, Blob, Clipboard, ImagePicker, MediaLibrary, and more. It also demonstrates basic cryptography techniques like key derivation functions and AES-256-GCM encryption.

_Note: UI styling is vibe-coded. Looking pretty is not the main purpose of this app._

## Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   bun install
   ```

3. Build the app and start the development server:

   ```bash
   bun ios
   # or
   bun android
   ```

### Platform-specific commands

- **iOS**: `bun ios`
- **Android**: `bun android`
- **Web**: `bun web` (automatically starts CORS proxy)

## Usage

The app provides two main screens accessible via tabs:

- **Upload**: Pick an image from gallery, encrypt it with a password, and upload to a server
- **Download**: Download and decrypt previously uploaded encrypted images
- **AES Playground**: Direct testing of AES encryption/decryption functionality

## Repository Structure

Most of the relevant code is in the
[`src/business-logic/`](https://github.com/barthap/media-encryption-demo/blob/9ea8b51f5943d40c5b1df8989e193c78c2996e32/src/business-logic/index.ts)
to keep all the interesting code in one place.

```
├── src/
│   ├── app/                   # Expo Router app structure
│   │   ├── (tabs)/            # Tab-based navigation
│   │   │   ├── upload.tsx     # Upload workflow screen
│   │   │   └── download.tsx   # Download workflow screen
│   ├── business-logic/        # Core app logic
│   ├── components/            # Reusable UI components
│   ├── hooks/                 # Custom React hooks
│   ├── utils/                 # Utility functions
│   └── imports/               # Platform-specific imports with web workarounds
├── modules/
│   ├── aes-crypto/            # Custom AES encryption Expo module
│   └── image-loader/          # Custom image loading utilities
├── cors-proxy/                # CORS proxy server for web downloads
└── assets/                    # Static assets (images, etc.)
```

## Custom Modules

### AES Crypto Module

Since `expo-crypto` doesn't include AES encryption, this project includes a
custom native module providing:

- Secure random key generation and import/export
- AES 128/192/256 GCM encryption/decryption with AAD authentication
- Portable `SealedData` format for encrypted data
- Platform support: iOS (CryptoKit), Android (javax.crypto.Cipher), Web (SubtleCrypto)

See [modules/aes-crypto/README.md](modules/aes-crypto/README.md)
for detailed API documentation.

### Image Loader Module

Custom module for converting `Uint8Array` to `SharedRef<'image'>`, enabling
direct image manipulation from binary data. Neither `expo-image`
or `expo-image-manipulator` is able to do that directly, without filesystem-
or base64-data-url-intermediates, or other workarounds.

## Known Issues and Development Notes

Based on development experience and code analysis, several issues and limitations have been identified:

### Platform-Specific Issues

- **iOS/Android**:
  - FileSystem file creation for user-picked directory (outside documents/cache dir) [differ significantly](https://github.com/barthap/media-encryption-demo/blob/9ea8b51f5943d40c5b1df8989e193c78c2996e32/src/business-logic/index.ts#L177). Probably due to SAF. It might be good to create some documentation / examples.
- **iOS**:
  - `expo-image` enforces ATS (App Transport Security) - `Image.loadAsync()` with `http://` URLs doesn't work. Only `https://` URLs accepted. I have not found any documentation about this. Bad thing is that the image just silently fails to render, there's no developer warning.
- **Android**:

  - `FileSystem.Directory.createFile()`, when `mimeType` argument is null, ignores file extension, forces `text/plain` → `.txt` extension regardless of filename like `image.jpg`. SAF (Storage Access Framework) limitation, but perhaps we could best-effort determine MIME type?. ([code link](https://github.com/barthap/media-encryption-demo/blob/9ea8b51f5943d40c5b1df8989e193c78c2996e32/src/business-logic/index.ts#L196))
  - **MediaLibrary asset creation permissions**: `MediaLibrary.Asset.create()` [doesn't work](https://github.com/barthap/media-encryption-demo/blob/9ea8b51f5943d40c5b1df8989e193c78c2996e32/src/business-logic/index.ts#L133) with `writeOnly: true, granularPermissions: ['photo']`. It requires `writeOnly: false` which is counter-intuitive since I want only to create asset, not read it. Perhaps should be better documented.

- **Web**:
  - ~~`expo-blob` import fails: `TypeError: _expoBlob.Blob is not a constructor`.~~ Fixed in [#41195](https://github.com/expo/expo/pull/41195). Until the fix is released, `bun patch` is used in this repo.
  - `ExpoClipboard` listener on web. Error: `TypeError: ExpoClipboard.default.addListener is not a function`. Not sure if this is my mistake or some other issue.
    - Interesting fact is that the function is named [`addClipboardListener`](https://github.com/expo/expo/blob/c50194ee47cc9f0f8bc30ce12442db81bb14d8f2/packages/expo-clipboard/src/web/ClipboardModule.ts#L177) but it's somewhere translated to `addListener` which doesn't exist.
  - `expo-media-library/next` has no web implementation, causing bundler errors when imported.

### Performance Issues

- **Base64 UTF-16 conversion bottleneck**: `atob()` returns UTF-16 string, `String.split('').map(c => c.charCodeAt(0))` creates intermediate array + function calls for each character. For 1MB base64 (~1.33MB string), this creates 1.33M temporary objects. Optimized `for(let i=0; i<len; i++) bytes[i] = str.charCodeAt(i)` reduces to ~35-40ms but still 2-3x slower than hypothetical native `atob()` → `Uint8Array` conversion.
  - Possible solution: try implementing Uint8Array base64 encode-decode in native code.
- **Streams API regression** (expo-blob, expo-file-system): `ReadableStream.pipeTo(WritableStream)` processes in chunks with async coordination overhead. Each chunk requires: `await reader.read()` → `await writer.write()` → yield to event loop. For 3MB blob = ~7s processing time. Direct `blob.arrayBuffer()` + `file.write(buffer)` bypasses chunking: single allocation + native write = ~11ms.

### API Limitations

**Binary Data Conversion Issues:**

- **Expo-fetch `FormData` doesn't support `expo-blob` filenames.** A [workaround with `.name`](https://github.com/barthap/media-encryption-demo/blob/570fe289e6be2b487f81eb473dde3e50290afe30/src/utils/tmpfiles.ts#L27) is required. This was noted in [#40586](https://github.com/expo/expo/pull/40586#discussion_r2478885133) too.
- **No native `Uint8Array` → `SharedRef<'image'>` conversion**: Expo's architecture lacks direct binary-to-ImageRef conversion. The `expo-image` module only accepts URIs or assets, not raw binary data. Custom [ImageLoader module](#image-loader-module) was necessary to fs/data-url workarounds.
- **Limited base64 ecosystem support**:
  - Legacy `FileSystem.writeAsStringAsync()` requires `encoding: FileSystem.EncodingType.Base64` but many APIs don't accept this parameter
  - No easy obvious way of converting base64 string into blob or array buffer, and vice versa. And, as mentioned above, `atob()` / `btoa()` lack performance.
- `expo-clipboard` could accept `ImageRef` for copying and allow pasting as `ImageRef` too. It would be more convenient than base64.

**File System Limitations:**

- **No save-as dialog equivalent**: `FileSystem.File.pickFile()` is read-only. No write equivalent to `input[type="file"]` save behavior. Workaround: `FileSystem.Directory.pickAsync()` + hardcoded filename, but user cannot specify filename.

**Platform Integration Issues:**

- **`SharedRef` isolation between modules**: Expo modules use opaque `SharedRef<T>` pointers. Each module has its own native `SharedRef<'image'>` implementation, that differs slightly in terms of member methods/properties.
  - For instance:
    - expo-image's ImageRef has `loadAsync()` method, which is missing in expo-image-manipulator.
    - expo-image-manipulator implementation has `saveAsync()` which is missing in expo-image.
  - It would be nice to have a way to somehow move between implementations from JS code.
- **Inconsistent MIME type detection**:
  - `FileSystem.File.type` property returns `null` for newly created files (also after `file.write()`) until platform file system updates metadata. Is there a way to force-flush written content and trigger MIME detection? Something like `File.reload()` could be helpful.
  - `ExpoImage.loadAsync().mediaType` is unavailable on Android ([expected](https://github.com/expo/expo/blob/080fe0db96b352ff3aeddc0e4a8c2c1d84e02f1d/packages/expo-image/android/src/main/java/expo/modules/image/ExpoImageModule.kt#L180)).
  - When working with array buffers, often manual magic byte detection is required to infer MIME type or file extension. ([this function](https://github.com/search?q=repo:barthap/media-encryption-demo%20inferFileExtensionFromMagicBytes&type=code))
    - In this demo, this is more an app-specific issue: it's caused by the fact that original image metadata is lost when saving encrypted data to file, instead of uploading it to tmpfiles (there metadata is held in the context value).

### Additional Code Comments Requiring Attention

The following TODO/FIXME comments address issues not necessarily covered in the limitations above:

**[See all](<https://github.com/search?q=repo:barthap/media-encryption-demo+/(TODO%7CFIXME)/&type=code>)**

**Potential subjects to deprecation:**

- Clipboard event's `content` property has been deprecated for very long. Should it be finally removed?
- Clipboard has the `Clipboard.removeClipboardListener(listener)` function. AFAIK, APIs generally migrate from this syntax to the `subsciption.remove()`. Should this one be deprecated too?

## CORS Proxy

The demo uses a file hosting service missing CORS headers, causing web downloads to fail. A CORS proxy server resolves this issue.

### Web Development

When running the web version (`bun web`), the CORS proxy is automatically started alongside the Expo bundler using concurrently. This ensures seamless web development without manual proxy setup.

See [cors-proxy/README.md](cors-proxy/README.md) for detailed setup and usage instructions.

## License

This is a demonstration project. Check individual dependencies for their respective licenses.
