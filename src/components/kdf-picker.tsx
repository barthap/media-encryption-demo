import { Platform } from 'react-native';

import { KeyDerivationAlgorithm } from '@/utils/password';
import { ThemedText } from './themed-text';
import SelectList from './ui/select-list';

const kdfAlgorithms: { key: KeyDerivationAlgorithm; value: string; disabled?: boolean }[] = [
  { key: 'argon2', value: 'Argon2id', disabled: Platform.OS === 'web' },
  { key: 'sha256', value: 'SHA-256 (unsafe)' },
  { key: 'pbkdf2', value: 'PBKDF2 (not implemented)', disabled: true },
];

// find first non-disabled
const defaultAlrogithm = kdfAlgorithms.find((it) => !it.disabled) ?? kdfAlgorithms[0];

interface KdfAlgorithmPickerProps {
  onPicked: (algorithm: KeyDerivationAlgorithm) => void;
}
export function KdfAlgorithmPicker({ onPicked }: KdfAlgorithmPickerProps) {
  return (
    <>
      <ThemedText>Key derivation algorithm:</ThemedText>
      <SelectList
        data={kdfAlgorithms}
        setSelected={onPicked}
        save="key"
        defaultOption={defaultAlrogithm}
      />
    </>
  );
}
