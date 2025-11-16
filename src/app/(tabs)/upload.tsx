import { Blob as ExpoBlob } from 'expo-blob';
import { Image } from 'expo-image';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedScrollView, ThemedView } from '@/components/themed-view';
import Button from '@/components/ui/button';
import { useHostingContext } from '@/context/app-context';
import React from 'react';


import { encryptImageWithPasswordAsync, pasteImageFromClipboardAsync, PickedImage, pickImageFromFilesystemAsync, pickImageFromGalleryAsync, saveFileToFileSystemAsync } from '@/business-logic';
import { KdfAlgorithmPicker } from '@/components/kdf-picker';
import { StepIndicator, StepItem, StepNavigation } from '@/components/step-based-flow';
import { Card, InfoRow, SectionCard } from '@/components/ui/cards';
import { useClipboardImageAvailable } from '@/hooks/use-clipboard-available';
import { extractFilename, humanFileSize } from '@/utils/common';
import { messageForException } from '@/utils/error';
import { KeyDerivationAlgorithm } from '@/utils/password';
import { runCatching } from '@/utils/result';

type UploadStep = 'pick' | 'encrypt' | 'save';

type UploadState =
  | { step: 'pick'; image: PickedImage | null }
  | { step: 'encrypt'; image: PickedImage, encryptedBlob?: ExpoBlob }
  | { step: 'save'; image: PickedImage; encryptedBlob: ExpoBlob };

type EncryptionStatus = 'not started' | 'in progress' | 'failed' | `finished in ${number} ms`;

const steps: StepItem<UploadStep>[] = [
  { key: 'pick', label: 'Pick' },
  { key: 'encrypt', label: 'Encrypt' },
  { key: 'save', label: 'Save' }
];

// Step Components

interface PickStepProps {
  image: PickedImage | null;
  onImagePicked: (pickedImage: PickedImage) => void;
}
function ImagePickStep({ image, onImagePicked }: PickStepProps) {
  const clipboardAvailable = useClipboardImageAvailable();

  const pickImage = async () => {
    const image = await pickImageFromGalleryAsync();
    if (!image) {
      return;
    }
    console.log('Selected image:', image);
    onImagePicked(image);
  }

  const loadFromFs = async () => {
    const imageResult = await runCatching(pickImageFromFilesystemAsync);

    if (!imageResult.success) {
      Alert.alert('Picking failed', imageResult.reason);
    } else if (imageResult.value) {
      onImagePicked(imageResult.value);
    }
  };

  const pasteFromClipboard = async () => {
    const result = await runCatching(pasteImageFromClipboardAsync);

    if (!result.success) {
      console.warn('Clipboard err:', result.error);
      Alert.alert('Clipboard failed', result.reason);
    } else if (result.value) {
      onImagePicked(result.value);
    }
  };

  return (
    <ThemedView>
      <ThemedText type="subtitle" style={{ marginBottom: 16 }}>Pick a photo</ThemedText>

      <SectionCard
        title="Choose image source"
        description="Select an image from your gallery, files, or clipboard"
        variant="default"
      >
        <ScrollView horizontal>
          <ThemedView style={{ flexDirection: 'row', gap: 12 }} >
            <Button title="Open gallery" onPress={pickImage} />
            <Button title="Pick file" onPress={loadFromFs} />
            <Button title="Paste from clipboard" onPress={pasteFromClipboard} disabled={!clipboardAvailable} />
          </ThemedView>
        </ScrollView>
      </SectionCard>

      {image && (
        <SectionCard title="Selected image" variant="success">
          <Image source={image} style={{ width: 200, height: 200, alignSelf: 'center' }} />
          <InfoRow
            label="Size:"
            value={`${image.width} × ${image.height} px`}
            valueStyle={{ fontWeight: '600' }}
          />
        </SectionCard>
      )}
    </ThemedView>
  );
}

interface EncryptionStepProps {
  image: PickedImage;
  onEncrypted: (blob: ExpoBlob) => void;
}
function EncryptionStep({ image, onEncrypted }: EncryptionStepProps) {
  const [password, setPassword] = React.useState('');
  const [encryptionStatus, setEncryptionStatus] = React.useState<EncryptionStatus>('not started');
  const [kdfAlgorithm, setKDF] = React.useState<KeyDerivationAlgorithm>('sha256');

  const handleEncrypt = async () => {
    if (!password) return;

    try {
      setEncryptionStatus('in progress');
      const timeStart = Date.now();

      const blob = await encryptImageWithPasswordAsync(image, password, kdfAlgorithm);

      const timeEnd = Date.now();
      const statusMessage: EncryptionStatus = `finished in ${timeEnd - timeStart} ms`;
      setEncryptionStatus(statusMessage);
      onEncrypted(blob);
    } catch (e) {
      console.warn(e);
      Alert.alert('Encryption failed!', messageForException(e) ?? 'Unknown error');
      setEncryptionStatus('failed');
    }
  };

  return (
    <ThemedView>
      <ThemedText type="subtitle" style={{ marginBottom: 16 }}>Encrypt image</ThemedText>

      <Card variant="info">
        <ThemedText>Password:</ThemedText>
        <TextInput
          editable
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleEncrypt}
          style={styles.passwordInput}
          placeholder="Password"
          secureTextEntry
        />

        <KdfAlgorithmPicker onPicked={setKDF} />

        <Button
          title="Encrypt"
          onPress={handleEncrypt}
          loading={encryptionStatus === 'in progress'}
          style={{ marginTop: 8 }}
        />

        <InfoRow label="Status:" value={encryptionStatus} />
      </Card>
    </ThemedView>
  );
};

interface SaveStepProps {
  encryptedBlob: ExpoBlob;
  image: PickedImage;
}
function SaveStep({ encryptedBlob, image }: SaveStepProps) {
  const hosting = useHostingContext();

  const [uploadInProgress, setUploadInProgress] = React.useState(false);
  const [savingInProgress, setSavingInProgress] = React.useState(false);

  const handleUpload = async () => {
    setUploadInProgress(true);

    const { width, height } = image;
    const metadata = {
      width,
      height,
      filename: extractFilename(image.uri) ?? 'image.jpg'
    }
    const result = await hosting.uploadFile(encryptedBlob, metadata);

    setUploadInProgress(false);

    if (result.success) {
      Alert.alert('Upload successful', `${result.value.webpageURL}`);
    } else {
      console.warn('Upload failed:', result.error);
      Alert.alert('Upload failed', result.reason);
    }
  }

  const handleSave = async () => {
    setSavingInProgress(true);
    const result = await runCatching(
      async () => saveFileToFileSystemAsync(encryptedBlob, 'encrypted_image.dat')
    );
    setSavingInProgress(false);

    if (!result.success) {
      console.warn('Save failed:', result.error);
      Alert.alert('Save failed', result.reason);
    } else if (result.value !== null) {
      Alert.alert('Save successful', result.value.uri);
    }
  }

  return (
    <ThemedView>
      <ThemedText type="subtitle" style={{ marginBottom: 16 }}>Save encrypted image</ThemedText>

      <SectionCard title="Encrypted data ready" variant="success">
        <InfoRow
          label="Data size:"
          value={humanFileSize(encryptedBlob.size, true)}
          valueStyle={{ fontWeight: '600', color: '#059669' }}
        />
      </SectionCard>

      <SectionCard
        title="Choose destination"
        description="Upload to hosting service or save to your device"
        variant="default"
      >
        <ThemedView style={{ flexDirection: 'row', gap: 12 }} >
          <Button title="Upload" onPress={handleUpload} loading={uploadInProgress} />
          <Button
            title="Save to files"
            onPress={handleSave}
            loading={savingInProgress}
          />
        </ThemedView>
      </SectionCard>
    </ThemedView>
  );
};

export default function UploadScreen() {
  const hosting = useHostingContext();

  const [uploadState, setUploadState] = React.useState<UploadState>({ step: 'pick', image: null });

  // Navigation logic
  const canGoNext = () => {
    switch (uploadState.step) {
      case 'pick': return uploadState.image !== null;
      case 'encrypt': return !!uploadState.encryptedBlob;
      case 'save': return false;
      default: return false;
    }
  };

  const handleNext = () => {
    switch (uploadState.step) {
      case 'pick':
        if (uploadState.image) {
          setUploadState({ step: 'encrypt', image: uploadState.image });
        }
        break;
      case 'encrypt':
        if (uploadState.encryptedBlob) {
          setUploadState({
            step: 'save',
            image: uploadState.image,
            encryptedBlob: uploadState.encryptedBlob
          });
        }
        break;
    }
  };

  const handlePrevious = () => {
    switch (uploadState.step) {
      case 'encrypt':
        setUploadState({ step: 'pick', image: uploadState.image });
        break;
      case 'save':
        setUploadState({ step: 'encrypt', image: uploadState.image });
        break;
    }
  };

  const handleReset = () => {
    setUploadState({ step: 'pick', image: null });
    hosting.clearUpload();
  };

  const handleImagePicked = (image: PickedImage) => {
    setUploadState({ step: 'pick', image });
  }

  const handleEncrypted = (blob: ExpoBlob) => {
    if (uploadState.step === 'encrypt') {
      setUploadState({
        step: 'encrypt',
        image: uploadState.image,
        encryptedBlob: blob
      });
    }
  };

  // Render current step
  const renderCurrentStep = () => {
    switch (uploadState.step) {
      case 'pick':
        return (
          <ImagePickStep
            image={uploadState.image}
            onImagePicked={handleImagePicked}
          />
        );
      case 'encrypt':
        return (
          <EncryptionStep
            image={uploadState.image}
            onEncrypted={handleEncrypted}
          />
        );
      case 'save':
        return (
          <SaveStep
            encryptedBlob={uploadState.encryptedBlob}
            image={uploadState.image}
          />
        );
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={10}>
      <StepIndicator currentStep={uploadState.step} steps={steps} />
      <ThemedScrollView style={styles.container}>

        {renderCurrentStep()}

      </ThemedScrollView>
      <StepNavigation
        steps={steps}
        currentStep={uploadState.step}
        canGoNext={canGoNext()}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onReset={handleReset}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    gap: 16,
    overflow: 'hidden',
  },
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
