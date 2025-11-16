import { Blob as ExpoBlob } from 'expo-blob';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Alert, GestureResponderEvent, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TextInputSubmitEditingEvent } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import Button from '@/components/ui/button';
import { Collapsible } from '@/components/ui/collapsible';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { useHostingContext } from '@/context/app-context';
import React from 'react';


import SelectList from '@/components/ui/select-list';
import { useOnAppForegrounded } from '@/hooks/use-app-active';
import { extractFilename, humanFileSize } from '@/utils/common';
import { messageForException } from '@/utils/error';
import { Sha256Kdf } from '@/utils/password';
import { runCatching } from '@/utils/result';
import AesCrypto from '@modules/aes-crypto';
import { benchmarked } from '@/utils/benchmarks';

interface ImageInfo {
  uri: string;
  width: number;
  height: number;
}

// TODO: Check if pure native b64 impl wouldnt be faster
function base64toUintArray(b64string: string): Uint8Array {
  const binaryString = atob(b64string);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
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

async function pickImageFromFilesystem(): Promise<ImageInfo> {
  const result = await FileSystem.File.pickFileAsync();
  const file = Array.isArray(result) ? result[0] : result;
  if (!file.type.startsWith("image/")) {
    throw new Error('Not an image MIME type:' + file.type);
  }
  const image = await Image.loadAsync(file.uri);
  return { uri: file.uri, width: image.width, height: image.height };
}

type EncryptionStatus = 'not started' | 'in progress' | 'failed' | `finished in ${number} ms`;

const items = [
  { key: 'sha256', value: 'SHA-256 (unsafe)' },
  { key: 'argon2', value: 'Argon2id (not implemented)', disabled: true },
  { key: 'pbkdf2', value: 'PBKDF2 (not implemented)', disabled: true },
];

function useClipboardImageAvailable(): boolean {
  const listenerRef = React.useRef<Clipboard.Subscription | null>(null);
  const [clipboardAvailable, setClipbloardAvailable] = React.useState(false);

  React.useEffect(() => {
    // initial check
    Clipboard.hasImageAsync().then(setClipbloardAvailable);

    listenerRef.current = Clipboard.addClipboardListener(({ contentTypes }) => {
      console.log('Content types:', contentTypes);
      const hasImage = contentTypes.includes(Clipboard.ContentType.IMAGE);
      setClipbloardAvailable(hasImage);
    });

    return () => {
      if (listenerRef.current) {
        // FIXME: Shouldn't the following be deprecated?:
        // Clipboard.removeClipboardListener(listenerRef.current);
        listenerRef.current.remove()
      }
    }
  }, []);

  // Clipboard listener doesn't work when app is in background
  useOnAppForegrounded(() => {
    console.log('App foregrounded');
    Clipboard.hasImageAsync().then(setClipbloardAvailable);
  });

  return clipboardAvailable;
}

export default function UploadScreen() {
  const hosting = useHostingContext();

  const [image, setImage] = React.useState<ImageInfo | null>(null);
  const [password, setPassword] = React.useState('');
  const [encryptedBlob, setEncryptedBlob] = React.useState<ExpoBlob | null>(null);

  const clipboardAvailable = useClipboardImageAvailable();

  const pickImageAsync = async () => {
    const permissions = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissions.granted) {
      Alert.alert('No permissions', 'Open settings and grant media lib permissions');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({});
    if (result.canceled || result.assets.length === 0) {
      return;
    }

    const { uri, width, height } = result.assets[0];
    setImage({ uri, width, height });
    setEncryptionStatus('not started');
    console.log('Selected image:', { uri, width, height });
  }

  const loadFromFsAsync = async () => {
    const imageResult = await runCatching(pickImageFromFilesystem);

    if (imageResult.success) {
      setImage(imageResult.value);
      setEncryptionStatus('not started');
    } else {
      Alert.alert('Picking failed', imageResult.reason);
    }
  };

  const pasteFromClipboardAsync = async () => {
    const result = await runCatching(async () => {
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
    });

    if (!result.success) {
      console.warn('Clipboard err:', result.error);
      Alert.alert('Clipboard failed', result.reason);
    } else if (result.value) {
      setImage(result.value);
      setEncryptionStatus('not started');
    }
  };

  const [uploadInProgress, setUploadInProgress] = React.useState(false);
  const uploadEncryptedImageAsync = async () => {
    if (!encryptedBlob || !image) {
      return;
    }

    setUploadInProgress(true);

    const { width, height } = image;
    const metadata = { width, height, filename: extractFilename(image.uri) ?? 'image.jpg' }
    const result = await hosting.uploadFile(encryptedBlob, metadata);

    if (result.success) {
      Alert.alert('Upload successful', `${result.value.webpageURL}`);
    } else {
      console.warn('Upload failed:', result.error);
      Alert.alert('Upload failed', result.reason);
    }

    setUploadInProgress(false);
  }

  const [savingInProgress, setSavingInProgress] = React.useState(false);
  const saveEncryptedImageAsync = async () => {
    if (!encryptedBlob || !image) {
      return;
    }

    setSavingInProgress(true);
    const result = await runCatching(async () => {
      const filename = 'encrypted_image.dat';
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

      // TODO: Check why this is slow af
      // await benchmarked('Write blob to file using stream', async () => {
      //   const fileStream = file.writableStream();
      //   const blobStream = encryptedBlob.stream();
      //   await blobStream.pipeTo(fileStream);
      // });

      await benchmarked('Write blob to file directly', async () => {
        const buffer = await encryptedBlob.arrayBuffer();
        file.write(new Uint8Array(buffer));
      })

      return file.uri;
    });

    if (!result.success) {
      console.warn('Save failed:', result.error);
      Alert.alert('Save failed', result.reason);
    } else if (result.value !== null) {
      Alert.alert('Save successful', result.value);
    }
    setSavingInProgress(false);
  }

  const [encryptionStatus, setEncryptionStatus] = React.useState<EncryptionStatus>('not started');
  const [kdfAlgorithm, setKDF] = React.useState<'sha256' | 'argon2' | 'pbkdf2'>('sha256');

  async function encryptWithPassword(e?: TextInputSubmitEditingEvent | GestureResponderEvent) {
    const nativeEvent = e?.nativeEvent;
    const encryptionPassword = nativeEvent && 'text' in nativeEvent ? nativeEvent.text : password;

    if (!image || !encryptionPassword) {
      return;
    }

    try {
      setEncryptionStatus('in progress');
      const timeStart = Date.now();
      const keyBytes = await Sha256Kdf.digest(encryptionPassword);
      const key = await AesCrypto.importKey(keyBytes);

      const plainImageBuffer = await readUriToArrayBufferAsync(image.uri);

      const sealedData = await AesCrypto.encryptAsync(key, plainImageBuffer);
      const sealedDataBytes = sealedData.combined();

      const blob = new ExpoBlob([sealedDataBytes]);

      const timeEnd = Date.now();
      const statusMessage: EncryptionStatus = `finished in ${timeEnd - timeStart} ms`;
      setEncryptionStatus(statusMessage);
      setEncryptedBlob(blob);
    } catch (e) {
      console.warn(e);
      Alert.alert('Encryption failed!', messageForException(e) ?? 'Unknown error');
      setEncryptionStatus('failed');
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={10}>
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#00D000', dark: '#353636' }}
        headerImage={
          <IconSymbol
            size={310}
            color="#008000"
            name="arrow.up.circle.fill"
            style={styles.headerImage}
          />
        }>
        <ThemedView style={styles.titleContainer}>
          <ThemedText
            type="title"
            style={{
              fontFamily: Fonts.rounded,
            }}>
            Photo upload
          </ThemedText>
        </ThemedView>
        <ThemedText>This section is about picking, encrypting, and uploading a photo.</ThemedText>
        <Collapsible title="Pick a photo" startOpen>
          <ScrollView horizontal>
            <ThemedView style={{ flexDirection: 'row', gap: 12 }} >
              <Button title="Open gallery" onPress={pickImageAsync} />
              <Button title="Pick file" onPress={loadFromFsAsync} />
              <Button title="Paste from clipboard" onPress={pasteFromClipboardAsync} disabled={!clipboardAvailable} />
            </ThemedView>
          </ScrollView>

          {image &&
            <>
              <ThemedText>Currently selected image:</ThemedText>
              <Image source={image}
                style={{ width: 200, height: 200, alignSelf: 'center' }}
              />
            </>
          }
        </Collapsible>

        {image &&
          <Collapsible title="Encrypt image">
            <ThemedText>Password:</ThemedText>
            <TextInput
              editable
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={encryptWithPassword}
              style={styles.passwordInput}
              placeholder="Password" />

            <ThemedText>Key derivation algorithm:</ThemedText>
            <SelectList data={items} setSelected={setKDF} save='key' defaultOption={items[0]} />

            <Button title="Encrypt" onPress={encryptWithPassword} loading={encryptionStatus === 'in progress'} style={{ marginTop: 8 }} />
            <ThemedText>Status: {encryptionStatus}</ThemedText>
          </Collapsible>
        }

        {encryptedBlob &&
          <Collapsible title="Upload encrypted image">
            <ThemedText>Data size: {humanFileSize(encryptedBlob.size, true)}</ThemedText>
            <ThemedView style={{ flexDirection: 'row', gap: 12 }} >
              <Button title="Upload" onPress={uploadEncryptedImageAsync} loading={uploadInProgress} />
              <Button title="Save to files" onPress={saveEncryptedImageAsync} loading={savingInProgress} />
            </ThemedView>
          </Collapsible>
        }


      </ParallaxScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  passwordInput: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10, borderRadius: 10, borderColor: 'gray',
  },
});
