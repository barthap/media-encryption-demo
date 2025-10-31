import React, { PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableHighlight,
  TouchableHighlightProps,
  View,
  ViewStyle,
} from 'react-native';

import { UnthemedColors } from '@/constants/theme';

type Props = PropsWithChildren<
  TouchableHighlightProps & {
    loading?: boolean;
    title?: string;
    buttonStyle?: ViewStyle;
  }
>;

function Button({
  disabled,
  loading,
  title,
  onPress,
  style,
  buttonStyle,
  children,
}: Props) {
  return (
    <View style={[styles.container, style]}>
      <TouchableHighlight
        style={[styles.button, disabled && styles.disabledButton, buttonStyle]}
        disabled={disabled || loading}
        onPress={onPress}
        underlayColor={UnthemedColors.highlightColor}>
        {children ||
          (loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.label}>{title}</Text>
          ))}
      </TouchableHighlight>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: UnthemedColors.tintColor,
  },
  disabledButton: {
    backgroundColor: UnthemedColors.disabled,
  },
  label: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

export default Button;
