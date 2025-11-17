
export function useClipboardImageAvailable(): boolean {
  // Web has this weird permissions, so any clipboard actions should be
  // user-initiated, so we cannot rely on automatic/background effects.
  // Optimistically say it's always available and handle this in pasting code.
  return true;

  // FIXME: Also, for some reason, '`Clipboard.addClipboardListener` is not
  // a function' on web. Investigate
}

