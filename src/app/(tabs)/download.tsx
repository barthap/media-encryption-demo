import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as React from 'react';

import { Collapsible } from '@/components/ui/collapsible';
import { ExternalLink } from '@/components/external-link';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { useAppContext } from '@/context/app-context';
import Button from '@/components/ui/button';

import ImageLoader, { ImageRef } from '@modules/image-loader';

export default function DownloadScreen() {
  const appCtx = useAppContext();

  const imageUrl = appCtx.appState.state === 'image_uploaded' ? appCtx.appState.uri : null;

  const [savedImageUrl, setSavedImage] = React.useState<string | null>(null);
  const [imageRef, setImageRef] = React.useState<ImageRef | null>(null);

  const downloadImageAsync = async () => {
    if (!imageUrl) { return; }

    const response = await fetch(imageUrl);
    if (response.status !== 200) { return; }

    const buffer = await response.arrayBuffer();
    const imageData = new Uint8Array(buffer);

    void (async () => {
      try {
        const image = await ImageLoader.loadImageAsync(imageData);
        setImageRef(image);

        const { width, height } = image;
        console.log({ width, height });
      } catch (e) {
        console.warn('Failed to load image ref:', e);
      }
    })();

    // TODO: Image from raw buffer
    const pathSegments = imageUrl.split('/');
    const filename = pathSegments[pathSegments.length - 1] || "downloaded.jpg";
    const imageFile = new FileSystem.File(FileSystem.Paths.cache, filename);
    imageFile.write(imageData, {});
    setSavedImage(imageFile.uri);
  }

  const imageSection = imageUrl ?
    <><ThemedText>URL: {imageUrl}</ThemedText>
      <Image source={imageUrl} style={{ width: 200, height: 200, alignSelf: 'center' }} />
      <ExternalLink href={imageUrl as any}>
        <ThemedText type="link">Open in browser</ThemedText>
      </ExternalLink>
      <Button title="Save to filesystem" onPress={downloadImageAsync} />
    </>
    : <ThemedText>No image uploaded.</ThemedText>;

  return (
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
          Explore
        </ThemedText>
      </ThemedView>
      <ThemedText>This app includes example code to help you get started.</ThemedText>
      <Collapsible title="Uploaded image">
        {imageSection}
      </Collapsible>
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
