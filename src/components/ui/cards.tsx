import React from 'react';
import { StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';

// Base card component
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'success' | 'info' | 'dashed';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  const cardStyle = [
    styles.baseCard,
    styles[`${variant}Card` as keyof typeof styles] as ViewStyle,
    style,
  ];

  return <ThemedView style={cardStyle}>{children}</ThemedView>;
}

// Section card with header
interface SectionCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'info' | 'dashed';
  style?: ViewStyle;
}

export function SectionCard({
  title,
  description,
  children,
  variant = 'default',
  style,
}: SectionCardProps) {
  return (
    <Card variant={variant} style={style}>
      <ThemedText type="defaultSemiBold" style={{ marginBottom: 8 }}>
        {title}
      </ThemedText>
      {description && <ThemedText style={styles.description}>{description}</ThemedText>}
      {children}
    </Card>
  );
}

// Info row for displaying label-value pairs
interface InfoRowProps {
  label: string;
  value: string;
  valueStyle?: TextStyle;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
}

export function InfoRow({ label, value, valueStyle, numberOfLines, ellipsizeMode }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <ThemedText
        style={[styles.value, valueStyle]}
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
      >
        {value}
      </ThemedText>
    </View>
  );
}

// Success feedback card
interface SuccessCardProps {
  message: string;
  style?: ViewStyle;
}

export function SuccessCard({ message, style }: SuccessCardProps) {
  const combinedStyle = { marginTop: 16, ...style };

  return (
    <Card variant="success" style={combinedStyle}>
      <ThemedText style={styles.successText}>✓ {message}</ThemedText>
    </Card>
  );
}

// Divider with text
interface DividerProps {
  text: string;
  style?: ViewStyle;
}

export function Divider({ text, style }: DividerProps) {
  return (
    <ThemedView style={[styles.divider, style]}>
      <ThemedText style={styles.dividerText}>{text}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  baseCard: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
  },
  defaultCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  successCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  dashedCard: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  infoRow: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-start',
  },
  label: {
    fontWeight: '600',
    minWidth: 60,
    color: '#374151',
  },
  value: {
    flex: 1,
    marginLeft: 8,
    color: '#6b7280',
  },
  description: {
    color: '#6b7280',
    fontSize: 14,
    marginBottom: 12,
  },
  successText: {
    color: '#15803d',
    fontWeight: '600',
    textAlign: 'center',
  },
  divider: {
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'white',
    paddingHorizontal: 12,
  },
});
