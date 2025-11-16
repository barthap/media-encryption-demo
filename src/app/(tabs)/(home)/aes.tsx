import { Image } from 'expo-image';
import { Alert, Platform, StyleSheet } from 'react-native';

import { Collapsible } from '@/components/ui/collapsible';
import { ExternalLink } from '@/components/external-link';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import Button from '@/components/ui/button';

import AesCrypto from '@modules/aes-crypto';
import { messageForException } from '@/utils/error';

async function encryptionTest() {
  const data = new Uint8Array([1, 2, 3, 4, 5]);
  const aad = new Uint8Array([4, 6, 6]);

  try {
    const encryptionKey = await AesCrypto.generateKey();
    // const encryptionKey = new AesCrypto.SymmetricKey(128);
    const encrypted = await AesCrypto.encryptAsync(encryptionKey, data, aad);

    console.log('Key:', { bytes: encryptionKey.bytes, size: encryptionKey.size })

    const { tagSize, combinedSize, ivSize } = encrypted;
    const combined = encrypted.combined();
    console.log('Encryptiion:', {
      tagSize, combined, combinedSize, ivSize
    });

    const iv = encrypted.iv();
    const ciphertextWithTag = encrypted.ciphertext(true);
    console.log('Ingredients', { iv, ciphertextWithTag })

    // const sealed = new AesCrypto.SealedData(combined, ivSize, tagSize);
    const sealed = new AesCrypto.SealedData(iv, ciphertextWithTag, 16);

    // const decryptionKey = new AesCrypto.SymmetricKey(encryptionKey.bytes);
    const decryptionKey = encryptionKey;

    const decrypted = await AesCrypto.decryptAsync(decryptionKey, sealed, aad);

    console.log('Decrypted! Data:', decrypted.toString());
    Alert.alert('Decrypted!', `Data: ${decrypted}`);
  } catch (e) {
    console.warn('AES Err:', e);
    Alert.alert('Error!', messageForException(e) ?? undefined);
  }
}


export default function AesPlayground() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}>
          AES Playground
        </ThemedText>
      </ThemedView>
      <ThemedText>Playing with AES crypto module.</ThemedText>

      <Collapsible title="Encryption test" startOpen>
        <Button title="Do test" onPress={encryptionTest} />
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
