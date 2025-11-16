import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import * as React from 'react';
import { Alert, GestureResponderEvent, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TextInputSubmitEditingEvent } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import Button from '@/components/ui/button';
import { Collapsible } from '@/components/ui/collapsible';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { useHostingContext } from '@/context/app-context';

import ImageLoader, { ImageRef } from '@modules/image-loader';

import { messageForException } from '@/utils/error';
import { Sha256Kdf } from '@/utils/password';
import { runCatching } from '@/utils/result';
import AesCrypto from '@modules/aes-crypto';

function useExpirationTime(expirationDate: Date | null): `${string}:${string}` | 'expired' | null {
  const [expiresIn, setExpiration] = React.useState<`${string}:${string}` | 'expired' | null>(null);

  React.useEffect(() => {
    if (!expirationDate) {
      setExpiration(null);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const duration = Math.floor((expirationDate.getTime() - now.getTime()) / 1000);

      if (duration <= 0) {
        setExpiration('expired');
        clearInterval(interval);
        return;
      }

      const minutes = Math.floor(duration / 60).toLocaleString(undefined, { minimumIntegerDigits: 2 });
      const seconds = (duration % 60).toLocaleString(undefined, { minimumIntegerDigits: 2 });
      setExpiration(`${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [expirationDate]);

  return expiresIn;
}

type DecryptionStatus = 'not started' | 'in progress' | 'failed' | `finished in ${number} ms`;

export default function DownloadScreen() {
  const hosting = useHostingContext();

  const uploadedImage = hosting.uploadState.status === 'image_uploaded' ? hosting.uploadState : null;
  const uploadedDataUrl = uploadedImage?.info.directURL;
  const uploadedImageMetadata = uploadedImage?.metadata;

  const [decryptionStatus, setDecryptionStatus] = React.useState<DecryptionStatus>('not started');
  const [encryptedData, setDecryptedData] = React.useState<Uint8Array | null>(null);

  const [password, setPassword] = React.useState('');

  const [savedImageUrl, setSavedImage] = React.useState<string | null>(null);
  const [imageRef, setImageRef] = React.useState<ImageRef | null>(null);

  const expiresIn = useExpirationTime(uploadedImage?.info.expires ?? null);

  const downloadEncryptedImageAsync = async () => {
    if (!uploadedDataUrl) { return; }

    const response = await fetch(uploadedDataUrl);
    if (response.status !== 200) {
      // TODO: Handle this
      return;
    }

    const buffer = await response.arrayBuffer();
    const data = new Uint8Array(buffer);
    setDecryptionStatus('not started');
    setDecryptedData(data);
  };

  const loadEncryptedFromFsAsync = async () => {
    const result = await runCatching(async () => {
      const result = await FileSystem.File.pickFileAsync();
      const file = Array.isArray(result) ? result[0] : result;
      return file.bytes();
    });

    if (result.success) {
      setDecryptionStatus('not started');
      setDecryptedData(result.value);
    } else {
      const { reason, error } = result;
      console.warn('Load from FS failed:', error);
      Alert.alert('Picking failed', reason);
    }
  }

  const saveEncryptedFileToFsAsync = async () => {
    if (!uploadedDataUrl || !encryptedData) { return; }

    const pathSegments = uploadedDataUrl.split('/');
    const filename = pathSegments[pathSegments.length - 1] || "downloaded_encrypted.dat";
    const imageFile = new FileSystem.File(FileSystem.Paths.cache, filename);
    imageFile.write(encryptedData, {});
  }

  const processDecryptedImageAsync = async (imageData: Uint8Array) => {
    const inMemoryPromise = (async () => {
      try {
        const image = await ImageLoader.loadImageAsync(imageData);
        setImageRef(image);

        const { width, height } = image;
        console.log({ width, height });
      } catch (e) {
        console.warn('Failed to load image ref:', e);
        throw e;
      }
    })();

    const fileSystemPromise = (async () => {
      const filename = uploadedImageMetadata?.filename || "decrypted_image.jpg";
      const imageFile = new FileSystem.File(FileSystem.Paths.cache, filename);
      imageFile.write(imageData, {});
      setSavedImage(imageFile.uri);
    })();

    const [memResult, fsResult] = await Promise.allSettled([inMemoryPromise, fileSystemPromise]);
    if (memResult.status === 'rejected') {
      Alert.alert('Loading in-memory image failed', messageForException(memResult.reason) ?? 'Unknown error');
    }
    if (fsResult.status === 'rejected') {
      console.warn(fsResult.reason);
      Alert.alert('Saving image to fs failed', messageForException(fsResult.reason) ?? 'Unknown error');
    }
  }

  async function decryptWithPasswordAsync(e?: TextInputSubmitEditingEvent | GestureResponderEvent) {
    const nativeEvent = e?.nativeEvent;
    const encryptionPassword = nativeEvent && 'text' in nativeEvent ? nativeEvent.text : password;

    if (!encryptedData || !encryptionPassword) {
      return;
    }

    try {
      setDecryptionStatus('in progress');
      const timeStart = Date.now();

      const keyBytes = await Sha256Kdf.digest(encryptionPassword);
      const key = await AesCrypto.importKey(keyBytes);

      const sealedData = new AesCrypto.SealedData(encryptedData, 12);
      const plaintextData = await AesCrypto.decryptAsync(key, sealedData);

      const timeEnd = Date.now();
      const statusMessage: DecryptionStatus = `finished in ${timeEnd - timeStart} ms`;
      setDecryptionStatus(statusMessage);

      await processDecryptedImageAsync(plaintextData);
    } catch (e) {
      console.warn(e);
      Alert.alert('Decryption failed!', messageForException(e) ?? 'Unknown error');
      setDecryptionStatus('failed');
    }
  }

  const encryptedDataSection = uploadedImage ?
    <><ThemedText>URL: {uploadedDataUrl}</ThemedText>
      <ExternalLink href={uploadedImage.info.webpageURL as any}>
        <ThemedText type="link">Open in browser</ThemedText>
      </ExternalLink>
      <ThemedText>Expires in: {expiresIn}</ThemedText>
      <Button title="Download" onPress={downloadEncryptedImageAsync} />
      {encryptedData && <Button title="Save to filesystem" onPress={saveEncryptedFileToFsAsync} />}
    </>
    : <ThemedText>No image uploaded.</ThemedText>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={10}>
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#D07000', dark: '#353636' }}
        headerImage={
          <IconSymbol
            size={310}
            color="#804000"
            name="arrow.down.circle.fill"
            style={styles.headerImage}
          />
        }>
        <ThemedView style={styles.titleContainer}>
          <ThemedText
            type="title"
            style={{
              fontFamily: Fonts.rounded,
            }}>
            Photo decryption
          </ThemedText>
        </ThemedView>
        <ThemedText>This app includes example code to help you get started.</ThemedText>
        <Collapsible title="Download encrypted image" startOpen>
          {encryptedDataSection}
          <Button title="From files" onPress={loadEncryptedFromFsAsync} />
        </Collapsible>
        {encryptedData &&
          <Collapsible title="Decrypt image">
            <TextInput
              editable
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={decryptWithPasswordAsync}
              style={styles.passwordInput}
              placeholder="Password" />
            <Button title="Decrypt" onPress={decryptWithPasswordAsync} />
            <ThemedText>Status: {decryptionStatus}</ThemedText>
          </Collapsible>
        }
        {savedImageUrl &&
          <Collapsible title="Saved image (file)">
            <Image source={savedImageUrl} style={{ width: 200, height: 200, alignSelf: 'center' }} />
          </Collapsible>
        }
        {imageRef &&
          <Collapsible title="Downloaded image (data)">
            <Image source={imageRef} style={{ width: 200, height: 200, alignSelf: 'center' }} />
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
    padding: 10,
  },
});
