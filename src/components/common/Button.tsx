import React, { useRef, useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react';
import { COLORS, BUTTON_MIN_HEIGHT_MOBILE, BUTTON_MIN_HEIGHT_DESKTOP, BUTTON_BORDER_RADIUS, ICON_SIZES } from '../../constants';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'outline' | 'secondary';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  throttleMs?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'md' | 'lg';
  activeOpacity?: number;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  icon: Icon,
  iconPosition = 'left',
  disabled = false,
  throttleMs = 350,
  style,
  textStyle,
  size = 'md',
  activeOpacity = 0.85,
}) => {
  const { isMobile } = useResponsiveLayout();
  const minHeight = isMobile ? BUTTON_MIN_HEIGHT_MOBILE : BUTTON_MIN_HEIGHT_DESKTOP;
  const lastPressTimeRef = useRef<number>(0);

  const handlePress = useCallback(() => {
    if (disabled) return;
    const now = Date.now();
    if (throttleMs > 0 && now - lastPressTimeRef.current < throttleMs) {
      return;
    }
    lastPressTimeRef.current = now;
    onPress();
  }, [disabled, throttleMs, onPress]);

  const getBackgroundColor = (): string => {
    if (disabled) return COLORS.gray200;
    switch (variant) {
      case 'primary': return COLORS.primary;
      case 'success': return COLORS.success;
      case 'danger': return COLORS.danger;
      case 'warning': return COLORS.warning;
      case 'secondary': return COLORS.purple;
      case 'outline': return COLORS.white;
      default: return COLORS.primary;
    }
  };

  const getTextColor = (): string => {
    if (disabled) return COLORS.gray400;
    if (variant === 'outline') return COLORS.primary;
    return COLORS.white;
  };

  const getBorderColor = (): string => {
    if (variant === 'outline') return disabled ? COLORS.gray200 : COLORS.primary;
    return 'transparent';
  };

  const iconSize = size === 'sm' ? ICON_SIZES.sm : size === 'lg' ? ICON_SIZES.lg : ICON_SIZES.md;

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={activeOpacity}
      style={[
        styles.base,
        {
          minHeight,
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderRadius: BUTTON_BORDER_RADIUS,
          paddingHorizontal: size === 'sm' ? 14 : size === 'lg' ? 24 : 20,
        },
        style,
      ]}
    >
      {Icon && iconPosition === 'left' && (
        <Icon size={iconSize} color={getTextColor()} style={styles.iconLeft} />
      )}
      <Text
        style={[
          styles.text,
          {
            color: getTextColor(),
            fontSize: isMobile ? 18 : 20,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
      {Icon && iconPosition === 'right' && (
        <Icon size={iconSize} color={getTextColor()} style={styles.iconRight} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  iconLeft: {
    marginRight: 10,
  },
  iconRight: {
    marginLeft: 10,
  },
});
