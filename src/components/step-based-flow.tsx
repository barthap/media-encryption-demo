import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import Button from '@/components/ui/button';
import React from 'react';

export type StepItem<S> = { key: S; label: string }

// Navigation Components
interface StepIndicatorProps<S> {
  steps: StepItem<S>[];
  currentStep: S;
}
export function StepIndicator<S extends string>({ steps, currentStep }: StepIndicatorProps<S>) {
  return (
    <ThemedView style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#ccc' }}>
      {steps.map((step, index) => {
        const isActive = step.key === currentStep;
        const isCompleted = steps.findIndex(s => s.key === currentStep) > index;

        return (
          <ThemedView key={step.key} style={{ alignItems: 'center', gap: 4 }}>
            <ThemedView style={[
              {
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: isActive ? '#0a7ea4' : isCompleted ? '#00D000' : '#ccc',
                justifyContent: 'center',
                alignItems: 'center'
              }
            ]}>
              <ThemedText style={{ color: 'white', fontWeight: 'bold' }}>{index + 1}</ThemedText>
            </ThemedView>
            <ThemedText style={{ fontSize: 12 }}>{step.label}</ThemedText>
          </ThemedView>
        );
      })}
    </ThemedView>
  );
};

interface StepNavigationProps<S> {
  steps: StepItem<S>[];
  currentStep: S;
  canGoNext: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onReset: () => void;
}
export function StepNavigation<S extends string>({
  steps,
  currentStep,
  canGoNext,
  onNext,
  onPrevious,
  onReset
}: StepNavigationProps<S>) {
  const firstStep = steps[0].key;
  const lastStep = steps[steps.length - 1].key;

  return (
    <ThemedView style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderColor: '#ccc', borderTopWidth: 1, }}>
      <Button
        title="← Prev"
        onPress={onPrevious}
        disabled={currentStep === firstStep}
        style={{ opacity: currentStep === firstStep ? 0.5 : 1 }}
      />
      <Button title="Reset" onPress={onReset} />
      <Button
        title="Next →"
        onPress={onNext}
        disabled={!canGoNext || currentStep === lastStep}
        style={{ opacity: !canGoNext || currentStep === lastStep ? 0.5 : 1 }}
      />
    </ThemedView>
  );
}
