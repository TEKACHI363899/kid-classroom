import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Pencil, Type, Eraser, Trash2, MousePointer } from 'lucide-react';
import { COLORS, CANVAS_COLORS, CANVAS_STROKE_SIZES, ICON_SIZES } from '../../constants';
import type { ToolType } from '../../types';

export interface CanvasToolbarProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  currentColor: string;
  onSelectColor: (color: string) => void;
  currentWidth: number;
  onSelectWidth: (width: number) => void;
  onClearAll: () => void;
  isTeacher: boolean;
  canDraw: boolean;
  isLandscape?: boolean;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  currentTool,
  onSelectTool,
  currentColor,
  onSelectColor,
  currentWidth,
  onSelectWidth,
  onClearAll,
  isTeacher,
  canDraw,
  isLandscape = false,
}) => {
  if (!canDraw) {
    return null;
  }

  const iconSize = isLandscape ? 16 : ICON_SIZES.md;

  return (
    <View style={[styles.toolbarContainer, isLandscape ? styles.toolbarLandscape : styles.toolbarPortrait]}>
      {/* Tool Selector */}
      <View style={styles.sectionGroup}>
        <TouchableOpacity
          onPress={() => onSelectTool('pencil')}
          style={[styles.toolBtn, isLandscape && styles.toolBtnLandscape, currentTool === 'pencil' && styles.toolBtnActive]}
        >
          <Pencil size={iconSize} color={currentTool === 'pencil' ? COLORS.white : COLORS.textDark} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onSelectTool('text')}
          style={[styles.toolBtn, isLandscape && styles.toolBtnLandscape, currentTool === 'text' && styles.toolBtnActive]}
        >
          <Type size={iconSize} color={currentTool === 'text' ? COLORS.white : COLORS.textDark} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onSelectTool('eraser')}
          style={[styles.toolBtn, isLandscape && styles.toolBtnLandscape, currentTool === 'eraser' && styles.toolBtnActive]}
        >
          <Eraser size={iconSize} color={currentTool === 'eraser' ? COLORS.white : COLORS.textDark} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onSelectTool('select')}
          style={[styles.toolBtn, isLandscape && styles.toolBtnLandscape, currentTool === 'select' && styles.toolBtnActive]}
        >
          <MousePointer size={iconSize} color={currentTool === 'select' ? COLORS.white : COLORS.textDark} />
        </TouchableOpacity>
      </View>

      <View style={[styles.divider, isLandscape && styles.dividerLandscape]} />

      {/* Color Palette */}
      <View style={styles.sectionGroup}>
        {CANVAS_COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => onSelectColor(c)}
            style={[
              styles.colorDot,
              { backgroundColor: c },
              isLandscape && styles.colorDotLandscape,
              currentColor === c && styles.colorDotActive,
            ]}
          />
        ))}
      </View>

      <View style={[styles.divider, isLandscape && styles.dividerLandscape]} />

      {/* Stroke Sizes */}
      <View style={styles.sectionGroup}>
        {CANVAS_STROKE_SIZES.map((s) => (
          <TouchableOpacity
            key={s.size}
            onPress={() => onSelectWidth(s.size)}
            style={[styles.sizeBtn, isLandscape && styles.sizeBtnLandscape, currentWidth === s.size && styles.sizeBtnActive]}
          >
            <View
              style={{
                width: isLandscape ? s.size / 1.5 + 2 : s.size + 4,
                height: isLandscape ? s.size / 1.5 + 2 : s.size + 4,
                borderRadius: isLandscape ? (s.size / 1.5 + 2) / 2 : (s.size + 4) / 2,
                backgroundColor: currentWidth === s.size ? COLORS.primary : COLORS.gray600,
              }}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Clear All for Teacher */}
      {isTeacher && (
        <>
          <View style={[styles.divider, isLandscape && styles.dividerLandscape]} />
          <TouchableOpacity onPress={onClearAll} style={[styles.clearBtn, isLandscape && styles.clearBtnLandscape]}>
            <Trash2 size={iconSize} color={COLORS.danger} />
            <Text style={[styles.clearText, isLandscape && styles.clearTextLandscape]}>Xóa tất cả</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  toolbarContainer: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 30,
    gap: 12,
    marginTop: 8,
  },
  sectionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.gray200,
  },
  toolBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
  },
  toolBtnActive: {
    backgroundColor: COLORS.primary,
  },
  colorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: {
    borderColor: COLORS.textDark,
    transform: [{ scale: 1.15 }],
  },
  sizeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
  },
  sizeBtnActive: {
    backgroundColor: COLORS.gray200,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFE4E6',
  },
  clearText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.danger,
  },
  disabledBanner: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.9)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    zIndex: 30,
  },
  disabledText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 14,
  },
  toolbarLandscape: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
    borderRadius: 14,
    marginTop: 6,
  },
  toolbarPortrait: {},
  toolBtnLandscape: {
    padding: 5,
    borderRadius: 8,
  },
  colorDotLandscape: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  sizeBtnLandscape: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  clearBtnLandscape: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dividerLandscape: {
    height: 18,
  },
  clearTextLandscape: {
    fontSize: 12,
  },
});
