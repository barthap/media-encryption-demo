import { useEffect } from 'react';
import { AppState } from 'react-native';

/**
 * Called when the application switches from the background to the foreground
 * @public
 */
export function useOnAppForegrounded(fn: () => void): void {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        fn();
      }
    });

    return subscription.remove;
  }, [fn]);
}
