import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';
import { Collapsible } from '@/components/ui/collapsible';
import { LinkButton } from '@/components/link-button';

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>
      <Collapsible startOpen title="Dev tools">
        <ThemedView style={styles.stepContainer}>
          <LinkButton href="/aes" title="AES Playground" />
          <LinkButton href="/explore" title="Explore screen" />
        </ThemedView>
      </Collapsible>
      <Collapsible title="About this app">
        <ThemedText>
          The purpose of this app is to demonstrate possibilities of manipulating
          binary data across various Expo libraries. Image data is used as an example.
          {'\n'}
          {'\n'}
          The demo shows the following use case scenario:{'\n'}
          1. User picks an image, then encrypts it with password before uploading it to an external server.{'\n'}
          2. User downloads the image, and enters password. Decrypted image is displayed on the screen.{'\n'}
          {'\n'}
          The app extensively uses blobs and array buffers, and integrates many Expo libraries, including FileSystem, Image, Blob, and more.
          It also shows some basic cryptography techniques, like key derivation functions and AES encryption.
        </ThemedText>

        <ThemedText style={{ marginTop: 8 }}>P.S. UI styling is vibe-coded. Looking pretty is not the main purpose of this app.</ThemedText>
      </Collapsible>
      <Collapsible title="Starter template Bacon stuff">
        <ExpoTemplateStarterStuff />
      </Collapsible>
    </ParallaxScrollView>
  );
}

function ExpoTemplateStarterStuff() {
  return <>
    <ThemedText>I left this here because I{'\''}m noob at React and this is a good source of copy-paste 😜</ThemedText>
    <ThemedText>
      Press{' '}
      <ThemedText type="defaultSemiBold">
        {Platform.select({
          ios: 'cmd + d',
          android: 'cmd + m',
          web: 'F12',
        })}
      </ThemedText>{' '}
      to open developer tools.
    </ThemedText>
    <ThemedView style={styles.stepContainer}>
      <ThemedText>Press <ThemedText type="defaultSemiBold"><Link href="/explore">this link</Link></ThemedText> to open the explore page from the starter template.</ThemedText>
      <Link href="/modal">
        <Link.Trigger>
          <ThemedText type="subtitle">Step 2: Press this to open modal</ThemedText>
        </Link.Trigger>
        <Link.Preview />
        <Link.Menu>
          <Link.MenuAction title="Action" icon="cube" onPress={() => alert('Action pressed')} />
          <Link.MenuAction
            title="Share"
            icon="square.and.arrow.up"
            onPress={() => alert('Share pressed')}
          />
          <Link.Menu title="More" icon="ellipsis">
            <Link.MenuAction
              title="Delete"
              icon="trash"
              destructive
              onPress={() => alert('Delete pressed')}
            />
          </Link.Menu>
        </Link.Menu>
      </Link>

      <ThemedText>
        {`TIL: Press above title longer to do the magic from the <Link /> subcomponents.`}
      </ThemedText>
    </ThemedView>
    <ThemedView style={styles.stepContainer}>
      <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
      <ThemedText>
        {`When you're ready, run `}
        <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
        <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the current{' '}
        <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
        <ThemedText type="defaultSemiBold">app-example</ThemedText>.
      </ThemedText>
    </ThemedView>
  </>;
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
