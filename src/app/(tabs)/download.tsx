import { Image } from 'expo-image';
import * as React from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedScrollView, ThemedView } from '@/components/themed-view';
import Button from '@/components/ui/button';
import { useHostingContext } from '@/context/app-context';

import { ImageRef } from '@modules/image-loader';

import {
  downloadEncryptedDataAsync,
  loadEncryptedDataFromFileAsync,
  decryptDataWithPasswordAsync,
  loadImageInMemoryAsync,
  saveTempFileAsync,
  copyImageToClipboardAsync,
  saveImageToGalleryAsync
} from '@/business-logic';
import { KdfAlgorithmPicker } from '@/components/kdf-picker';
import { StepIndicator, StepItem, StepNavigation } from '@/components/step-based-flow';
import { Card, SectionCard, InfoRow, SuccessCard, Divider } from '@/components/ui/cards';
import { humanFileSize } from '@/utils/common';
import { messageForException } from '@/utils/error';
import { KeyDerivationAlgorithm } from '@/utils/password';
import { runCatching } from '@/utils/result';

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

type DownloadStep = 'load' | 'decrypt' | 'display';

type DownloadState =
  | { step: 'load'; encryptedData: Uint8Array | null }
  | { step: 'decrypt'; encryptedData: Uint8Array; decryptedData?: Uint8Array }
  | { step: 'display'; encryptedData: Uint8Array; decryptedData: Uint8Array };

type DecryptionStatus = 'not started' | 'in progress' | 'failed' | `finished in ${number} ms`;

const steps: StepItem<DownloadStep>[] = [
  { key: 'load', label: 'Load' },
  { key: 'decrypt', label: 'Decrypt' },
  { key: 'display', label: 'Display' }
];

// Step Components

interface LoadStepProps {
  encryptedData: Uint8Array | null;
  onDataLoaded: (data: Uint8Array) => void;
}
function LoadStep({ encryptedData, onDataLoaded }: LoadStepProps) {
  const hosting = useHostingContext();

  const uploadedImage = hosting.uploadState.status === 'image_uploaded' ? hosting.uploadState : null;
  const uploadedDataUrl = uploadedImage?.info.directURL;
  const expiresIn = useExpirationTime(uploadedImage?.info.expires ?? null);

  const [downloadInProgress, setDownloadInProgress] = React.useState(false);
  const [loadInProgress, setLoadInProgress] = React.useState(false);

  const downloadFromHosting = async () => {
    if (!uploadedDataUrl) return;

    setDownloadInProgress(true);
    try {
      const data = await downloadEncryptedDataAsync(uploadedDataUrl);
      onDataLoaded(data);
    } catch (e) {
      console.warn('Download failed:', e);
      Alert.alert('Download failed', messageForException(e) ?? 'Unknown error');
    }
    setDownloadInProgress(false);
  };

  const loadFromFileSystem = async () => {
    setLoadInProgress(true);
    const result = await runCatching(loadEncryptedDataFromFileAsync);
    setLoadInProgress(false);

    if (!result.success) {
      Alert.alert('Loading failed', result.reason);
    } else if (result.value) {
      onDataLoaded(result.value);
    }
  };

  const encryptedDataSection = uploadedImage ? (
    <SectionCard title="From hosting service" variant="default">
      <InfoRow
        label="URL:"
        value={uploadedDataUrl || ''}
        valueStyle={{ fontSize: 12 }}
        numberOfLines={2}
        ellipsizeMode="middle"
      />
      <InfoRow
        label="Expires:"
        value={expiresIn || 'Unknown'}
        valueStyle={{
          fontWeight: '600',
          color: expiresIn === 'expired' ? 'red' : 'orange'
        }}
      />

      <ThemedView style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
        <Button
          title="Download"
          onPress={downloadFromHosting}
          loading={downloadInProgress}
          style={{ flex: 1 }}
        />
        <ExternalLink href={uploadedImage.info.webpageURL as any} style={{ flex: 1 }} asChild>
          <Button title="Open in browser" />
        </ExternalLink>
      </ThemedView>
    </SectionCard>
  ) : (
    <Card variant="dashed">
      <ThemedText style={{ textAlign: 'center', color: '#9ca3af' }}>
        No image uploaded from hosting service
      </ThemedText>
    </Card>
  );

  return (
    <ThemedView>
      <ThemedText type="subtitle" style={{ marginBottom: 16 }}>Load encrypted data</ThemedText>

      {encryptedDataSection}

      <Divider text="OR" />

      <SectionCard
        title="From device files"
        description="Load encrypted data file from your device storage"
        variant="success"
      >
        <Button
          title="Load from files"
          onPress={loadFromFileSystem}
          loading={loadInProgress}
        />
      </SectionCard>

      {encryptedData && (
        <SuccessCard message={`Encrypted data loaded (${humanFileSize(encryptedData.length, true)})`} />
      )}
    </ThemedView>
  );
}

interface DecryptStepProps {
  encryptedData: Uint8Array;
  onDecrypted: (data: Uint8Array) => void;
}
function DecryptStep({ encryptedData, onDecrypted }: DecryptStepProps) {
  const [password, setPassword] = React.useState('');
  const [decryptionStatus, setDecryptionStatus] = React.useState<DecryptionStatus>('not started');
  const [kdfAlgorithm, setKDF] = React.useState<KeyDerivationAlgorithm>('sha256');

  const handleDecrypt = async () => {
    if (!password) return;

    try {
      setDecryptionStatus('in progress');
      const timeStart = Date.now();

      const decryptedData = await decryptDataWithPasswordAsync(encryptedData, password, kdfAlgorithm);

      const timeEnd = Date.now();
      const statusMessage: DecryptionStatus = `finished in ${timeEnd - timeStart} ms`;
      setDecryptionStatus(statusMessage);
      onDecrypted(decryptedData);
    } catch (e) {
      console.warn(e);
      Alert.alert('Decryption failed!', messageForException(e) ?? 'Unknown error');
      setDecryptionStatus('failed');
    }
  };

  return (
    <ThemedView>
      <ThemedText type="subtitle" style={{ marginBottom: 16 }}>Decrypt image</ThemedText>

      <Card variant="info">
        <ThemedText>Password:</ThemedText>
        <TextInput
          editable
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleDecrypt}
          style={styles.passwordInput}
          placeholder="Password"
          secureTextEntry
        />

        <KdfAlgorithmPicker onPicked={setKDF} />

        <Button
          title="Decrypt"
          onPress={handleDecrypt}
          loading={decryptionStatus === 'in progress'}
          style={{ marginTop: 8 }}
        />

        <InfoRow label="Status:" value={decryptionStatus} />
      </Card>
    </ThemedView>
  );
}

interface DisplayStepProps {
  decryptedData: Uint8Array;
  uploadedImageMetadata?: { filename?: string };
}
function DisplayStep({ decryptedData, uploadedImageMetadata }: DisplayStepProps) {
  const [imageRef, setImageRef] = React.useState<ImageRef | null>(null);
  const [savedImageUrl, setSavedImageUrl] = React.useState<string | null>(null);
  const [loadingInMemory, setLoadingInMemory] = React.useState(true);
  const [savingToFs, setSavingToFs] = React.useState(false);

  // Load image in memory when component mounts
  React.useEffect(() => {
    const loadInMemory = async () => {
      setLoadingInMemory(true);
      try {
        const image = await loadImageInMemoryAsync(decryptedData);
        setImageRef(image);
        const { width, height } = image;
        console.log('Loaded image dimensions:', { width, height });
      } catch (e) {
        console.warn('Failed to load image in memory:', e);
        Alert.alert('Loading failed', messageForException(e) ?? 'Unknown error');
      }
      setLoadingInMemory(false);
    };

    loadInMemory();
  }, [decryptedData]);

  const saveToFileSystem = async () => {
    setSavingToFs(true);
    try {
      const filename = uploadedImageMetadata?.filename || 'decrypted_image.jpg';
      const savedFile = await saveTempFileAsync(decryptedData, filename);
      setSavedImageUrl(savedFile.uri);
      Alert.alert('Save successful', savedFile.uri);
    } catch (e) {
      console.warn('Save to filesystem failed:', e);
      Alert.alert('Save failed', messageForException(e) ?? 'Unknown error');
    }
    setSavingToFs(false);
  };

  const saveToMediaLib = async () => {
    if (!savedImageUrl) {
      return;
    }
    await saveImageToGalleryAsync(savedImageUrl);
  }

  const copyToClipboard = async () => {
    await copyImageToClipboardAsync(savedImageUrl ?? decryptedData);
  };

  return (
    <ThemedView>
      <ThemedText type="subtitle" style={{ marginBottom: 16 }}>Display decrypted image</ThemedText>

      <SectionCard title="In-memory image" variant="info">
        {loadingInMemory ? (
          <ThemedText style={{ textAlign: 'center', fontStyle: 'italic' }}>Loading image in memory...</ThemedText>
        ) : imageRef ? (
          <Image
            source={imageRef}
            style={{ width: 200, height: 200, alignSelf: 'center', marginVertical: 12 }}
          />
        ) : (
          <ThemedText style={{ color: 'red', textAlign: 'center' }}>Failed to load image in memory</ThemedText>
        )}
      </SectionCard>

      <SectionCard
        title="Save to device"
        description="Save the decrypted image to your device storage"
      >
        <ScrollView horizontal>
          <ThemedView style={{ flexDirection: 'row', gap: 12 }} >
            <Button
              title="Save to cache dir"
              onPress={saveToFileSystem}
              loading={savingToFs}
            />
            <Button
              title="Save to gallery"
              disabled={!savedImageUrl}
              onPress={saveToMediaLib}
            />
            <Button
              title="Copy to clipboard"
              onPress={copyToClipboard}
            />
          </ThemedView>
        </ScrollView>
      </SectionCard>

      {savedImageUrl && (
        <SectionCard title="Saved image" variant="success">
          <ThemedText style={styles.description}>Saved to filesystem{'\''}s cache dir</ThemedText>
          <ThemedText
            style={[styles.description, { fontSize: 12 }]}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            <ThemedText type='defaultSemiBold' style={{ fontSize: 12 }}>uri:</ThemedText>
            {' '}{savedImageUrl}
          </ThemedText>
          <Image
            source={savedImageUrl}
            style={{ width: 200, height: 200, alignSelf: 'center' }}
          />
        </SectionCard>
      )}
    </ThemedView>
  );
}

export default function DownloadScreen() {
  const hosting = useHostingContext();

  const [downloadState, setDownloadState] = React.useState<DownloadState>({ step: 'load', encryptedData: null });

  const uploadedImage = hosting.uploadState.status === 'image_uploaded' ? hosting.uploadState : null;
  const uploadedImageMetadata = uploadedImage?.metadata;

  // Navigation logic
  const canGoNext = () => {
    switch (downloadState.step) {
      case 'load': return downloadState.encryptedData !== null;
      case 'decrypt': return !!downloadState.decryptedData;
      case 'display': return false;
      default: return false;
    }
  };

  const handleNext = () => {
    switch (downloadState.step) {
      case 'load':
        if (downloadState.encryptedData) {
          setDownloadState({ step: 'decrypt', encryptedData: downloadState.encryptedData });
        }
        break;
      case 'decrypt':
        if (downloadState.decryptedData) {
          setDownloadState({
            step: 'display',
            encryptedData: downloadState.encryptedData,
            decryptedData: downloadState.decryptedData
          });
        }
        break;
    }
  };

  const handlePrevious = () => {
    switch (downloadState.step) {
      case 'decrypt':
        setDownloadState({ step: 'load', encryptedData: downloadState.encryptedData });
        break;
      case 'display':
        setDownloadState({ step: 'decrypt', encryptedData: downloadState.encryptedData });
        break;
    }
  };

  const handleReset = () => {
    setDownloadState({ step: 'load', encryptedData: null });
  };

  const handleDataLoaded = (data: Uint8Array) => {
    setDownloadState({ step: 'load', encryptedData: data });
  };

  const handleDecrypted = (decryptedData: Uint8Array) => {
    if (downloadState.step === 'decrypt') {
      setDownloadState({
        step: 'decrypt',
        encryptedData: downloadState.encryptedData,
        decryptedData
      });
    }
  };

  // Render current step
  const renderCurrentStep = () => {
    switch (downloadState.step) {
      case 'load':
        return (
          <LoadStep
            encryptedData={downloadState.encryptedData}
            onDataLoaded={handleDataLoaded}
          />
        );
      case 'decrypt':
        return (
          <DecryptStep
            encryptedData={downloadState.encryptedData}
            onDecrypted={handleDecrypted}
          />
        );
      case 'display':
        return (
          <DisplayStep
            decryptedData={downloadState.decryptedData}
            uploadedImageMetadata={uploadedImageMetadata}
          />
        );
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={10}>
      <StepIndicator currentStep={downloadState.step} steps={steps} />
      <ThemedScrollView style={styles.container}>

        {renderCurrentStep()}

      </ThemedScrollView>
      <StepNavigation
        steps={steps}
        currentStep={downloadState.step}
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
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  passwordInput: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    borderColor: 'gray',
  },
  description: {
    color: '#6b7280',
    fontSize: 14,
    marginBottom: 4,
  },
});
