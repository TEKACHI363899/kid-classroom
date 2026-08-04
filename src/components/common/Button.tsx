import React from 'react';
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
  style,
  textStyle,
  size = 'md',
  activeOpacity = 0.85,
}) => {
  const { isMobile } = useResponsiveLayout();
  const minHeight = isMobile ? BUTTON_MIN_HEIGHT_MOBILE : BUTTON_MIN_HEIGHT_DESKTOP;

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
      onPress={onPress}
      disabled={disabled}
      activeOpacity={activeOpacity}
      style={[
        styles.base,
        {
          minHeight,
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 2 : 0,
          borderRadius: BUTTON_BORDER_RADIUS,
          paddingHorizontal: size === 'sm' ? 16 : size === 'lg' ? 28 : 22,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  text: {
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  iconLeft: {
    marginRight: 10,
  },
  iconRight: {
    marginLeft: 10,
  },
});
