import { KeyDerivationAlgorithm } from "@/utils/password";
import { Host, Picker, Text, VStack } from '@expo/ui/swift-ui';
import { disabled, pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import React from "react";

const kdfAlgorithms: { key: KeyDerivationAlgorithm, value: string, disabled?: boolean }[] = [
  { key: 'argon2', value: 'Argon2id' },
  { key: 'sha256', value: 'SHA-256' },
  { key: 'pbkdf2', value: 'PBKDF2', disabled: true },
];

interface KdfAlgorithmPickerProps {
  onPicked: (algorithm: KeyDerivationAlgorithm) => void;
}
export function KdfAlgorithmPicker({ onPicked }: KdfAlgorithmPickerProps) {
  const [selection, setSelection] = React.useState(kdfAlgorithms[0].key)
  return <Host matchContents>
    <VStack >
      <Text>Key derivation algorithm:</Text>
      <Picker
        selection={selection}
        onSelectionChange={({ nativeEvent: { selection } }) => {
          console.log('sel:', selection);
          setSelection(selection as KeyDerivationAlgorithm);
          onPicked(selection as KeyDerivationAlgorithm);
        }}
        modifiers={[pickerStyle('segmented')]}
      // systemImage="lock.fill"
      >
        {kdfAlgorithms.map(algorithm => (
          <Text
            key={algorithm.key}
            modifiers={[tag(algorithm.key), disabled(algorithm.disabled)]}
            {...(algorithm.disabled ? { color: 'gray' } : undefined)}
          >
            {algorithm.value}
          </Text>
        ))}
      </Picker>
    </VStack>
  </Host>
}
