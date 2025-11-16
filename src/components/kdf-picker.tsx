import { KeyDerivationAlgorithm } from "@/utils/password";
import { ThemedText } from "./themed-text";
import SelectList from "./ui/select-list";

const kdfAlgorithms: { key: KeyDerivationAlgorithm, value: string, disabled?: boolean }[] = [
  { key: 'sha256', value: 'SHA-256 (unsafe)' },
  { key: 'argon2', value: 'Argon2id (not implemented)', disabled: true },
  { key: 'pbkdf2', value: 'PBKDF2 (not implemented)', disabled: true },
];

interface KdfAlgorithmPickerProps {
  onPicked: (algorithm: KeyDerivationAlgorithm) => void;
}
export function KdfAlgorithmPicker({ onPicked }: KdfAlgorithmPickerProps) {
  return <>
    <ThemedText>Key derivation algorithm:</ThemedText>
    <SelectList
      data={kdfAlgorithms}
      setSelected={onPicked}
      save='key'
      defaultOption={kdfAlgorithms[0]}
    />
  </>
}
