import { Image } from 'expo-image';
import { Alert, Platform, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Blob as ExpoBlob } from 'expo-blob';

import { Collapsible } from '@/components/ui/collapsible';
import { ExternalLink } from '@/components/external-link';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import Button from '@/components/ui/button';
import { useAppContext } from '@/context/app-context';
import React from 'react';

import { uploadBlobAsync } from '@/utils/tmpfiles';

interface ImageInfo {
  uri: string;
  width: number;
  height: number;
}

async function readUriToArrayBufferAsync(uri: string): Promise<Uint8Array> {
  const file = new FileSystem.File(uri);
  // const buffer = await file.arrayBuffer();
  // return new Uint8Array(buffer);
  return await file.bytes();
}

async function uploadBufferAsync(data: Uint8Array): Promise<string> {
  const blob = new ExpoBlob([data]);
  const result = await uploadBlobAsync(blob);
  return result.url;
}

export default function UploadScreen() {
  const appCtx = useAppContext();

  const [image, setImage] = React.useState<ImageInfo | null>(null);

  const pickImage = async () => {
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
    appCtx.setAppState({ state: 'image_selected', uri });
    setImage({ uri, width, height });
    console.log('Selected image:', { uri, width, height });
  }

  const uploadImage = async () => {
    if (!image) {
      return;
    }

    const buffer = await readUriToArrayBufferAsync(image.uri);
    const uploadedUri = await uploadBufferAsync(buffer);

    appCtx.setAppState({ state: 'image_uploaded', uri: uploadedUri })
    Alert.alert('Upload successful', uploadedUri ?? 'null');
  }

  return (
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
      <Collapsible title="Pick a photo">
        <Button title="Open image picker" onPress={pickImage} />

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
        <Collapsible title="Upload image">
          <Button title="Upload image" onPress={uploadImage} />
        </Collapsible>
      }


      <Collapsible title="File-based routing">
        <ThemedText>
          This app has two screens:{' '}
          <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> and{' '}
          <ThemedText type="defaultSemiBold">app/(tabs)/explore.tsx</ThemedText>
        </ThemedText>
        <ThemedText>
          The layout file in <ThemedText type="defaultSemiBold">app/(tabs)/_layout.tsx</ThemedText>{' '}
          sets up the tab navigator.
        </ThemedText>
        <ExternalLink href="https://docs.expo.dev/router/introduction">
          <ThemedText type="link">Learn more</ThemedText>
        </ExternalLink>
      </Collapsible>
      <Collapsible title="Android, iOS, and web support">
        <ThemedText>
          You can open this project on Android, iOS, and the web. To open the web version, press{' '}
          <ThemedText type="defaultSemiBold">w</ThemedText> in the terminal running this project.
        </ThemedText>
      </Collapsible>
      <Collapsible title="Images">
        <ThemedText>
          For static images, you can use the <ThemedText type="defaultSemiBold">@2x</ThemedText> and{' '}
          <ThemedText type="defaultSemiBold">@3x</ThemedText> suffixes to provide files for
          different screen densities
        </ThemedText>
        <Image
          source={require('@assets/images/react-logo.png')}
          style={{ width: 100, height: 100, alignSelf: 'center' }}
        />
        <ExternalLink href="https://reactnative.dev/docs/images">
          <ThemedText type="link">Learn more</ThemedText>
        </ExternalLink>
      </Collapsible>
      <Collapsible title="Light and dark mode components">
        <ThemedText>
          This template has light and dark mode support. The{' '}
          <ThemedText type="defaultSemiBold">useColorScheme()</ThemedText> hook lets you inspect
          what the user&apos;s current color scheme is, and so you can adjust UI colors accordingly.
        </ThemedText>
        <ExternalLink href="https://docs.expo.dev/develop/user-interface/color-themes/">
          <ThemedText type="link">Learn more</ThemedText>
        </ExternalLink>
      </Collapsible>
      <Collapsible title="Animations">
        <ThemedText>
          This template includes an example of an animated component. The{' '}
          <ThemedText type="defaultSemiBold">components/HelloWave.tsx</ThemedText> component uses
          the powerful{' '}
          <ThemedText type="defaultSemiBold" style={{ fontFamily: Fonts.mono }}>
            react-native-reanimated
          </ThemedText>{' '}
          library to create a waving hand animation.
        </ThemedText>
        {Platform.select({
          ios: (
            <ThemedText>
              The <ThemedText type="defaultSemiBold">components/ParallaxScrollView.tsx</ThemedText>{' '}
              component provides a parallax effect for the header image.
            </ThemedText>
          ),
        })}
      </Collapsible>
    </ParallaxScrollView>
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
});
