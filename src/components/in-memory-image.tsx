import { ImageRef } from '@modules/image-loader';
import { Image, ImageProps } from 'expo-image';
import * as React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { loadImageInMemoryAsync } from '@/business-logic';
import { ThemedText } from '@/components/themed-text';
import { messageForException } from '@/utils/error';

const loadImage = async (imageData: Uint8Array) => {
  // artificial delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // dummy error
  // throw new Error('test error');

  const image = await loadImageInMemoryAsync(imageData);
  const { width, height } = image;
  console.log('Loaded image dimensions:', { width, height });
  return image;
};

const onError = (error: Error, info: React.ErrorInfo) => {
  console.warn('Failed to load image in memory:', error, info);
};

function ErrorMessage({ error }: { error: unknown }) {
  const errorMessage = messageForException(error) ?? 'Unknown error';

  return (
    <ThemedText style={{ color: 'red', textAlign: 'center' }}>
      Failed to load image in memory: {errorMessage}
    </ThemedText>
  );
}

function LoadingMessage() {
  return (
    <ThemedText style={{ textAlign: 'center', fontStyle: 'italic' }}>
      Loading image in memory...
    </ThemedText>
  );
}

function InnerImage({ promise, ...props }: { promise: Promise<ImageRef> } & ImageProps) {
  const imageRef = React.use(promise);

  return <Image source={imageRef} {...props} />;
}

export function InMemoryImage({ imageData, ...props }: { imageData: Uint8Array } & ImageProps) {
  const loadPromise = loadImage(imageData);

  return (
    <ErrorBoundary FallbackComponent={ErrorMessage} onError={onError}>
      <React.Suspense fallback={<LoadingMessage />}>
        <InnerImage promise={loadPromise} {...props} />
      </React.Suspense>
    </ErrorBoundary>
  );
}
