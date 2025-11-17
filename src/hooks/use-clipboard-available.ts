import React from "react";
import * as Clipboard from 'expo-clipboard';
import { useOnAppForegrounded } from "./use-app-active";

export function useClipboardImageAvailable(): boolean {
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
    Clipboard.hasImageAsync().then(setClipbloardAvailable);
  });

  return clipboardAvailable;
}

