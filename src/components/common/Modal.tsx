import React from 'react';
import { View, Text, StyleSheet, Modal as RNModal, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { COLORS, ICON_SIZES } from '../../constants';
import { Button } from './Button';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'success' | 'danger' | 'warning' | 'secondary';
  onConfirm?: () => void;
  cancelLabel?: string;
  onCancel?: () => void;
  children?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  description,
  icon: Icon,
  confirmLabel,
  confirmVariant = 'primary',
  onConfirm,
  cancelLabel,
  onCancel,
  children,
}) => {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            {Icon && (
              <View style={styles.iconCircle}>
                <Icon size={ICON_SIZES.lg} color={COLORS.primary} />
              </View>
            )}
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={ICON_SIZES.md} color={COLORS.gray600} />
            </TouchableOpacity>
          </View>

          {description ? <Text style={styles.description}>{description}</Text> : null}

          {children && <View style={styles.content}>{children}</View>}

          {(confirmLabel || cancelLabel) && (
            <View style={styles.footer}>
              {cancelLabel && (
                <Button
                  label={cancelLabel}
                  variant="outline"
                  onPress={onCancel || onClose}
                  style={styles.actionBtn}
                />
              )}
              {confirmLabel && (
                <Button
                  label={confirmLabel}
                  variant={confirmVariant}
                  onPress={onConfirm || onClose}
                  style={styles.actionBtn}
                />
              )}
            </View>
          )}
        </View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Mờ hơn, phù hợp với blur
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backdropFilter: 'blur(10px)', // Apple Ultra Thin / Thin material
  } as any,
  container: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700', // Apple HIG: Title 3
    letterSpacing: -0.5,
    color: COLORS.textDark,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
  },
  description: {
    fontSize: 16,
    color: COLORS.gray600,
    marginBottom: 20,
    lineHeight: 24,
  },
  content: {
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
  },
});
