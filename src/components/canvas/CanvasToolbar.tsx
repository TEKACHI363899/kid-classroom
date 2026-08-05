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
}) => {
  if (!canDraw) {
    return null;
  }

  return (
    <View style={styles.toolbarContainer}>
      {/* Tool Selector */}
      <View style={styles.sectionGroup}>
        <TouchableOpacity
          onPress={() => onSelectTool('pencil')}
          style={[styles.toolBtn, currentTool === 'pencil' && styles.toolBtnActive]}
        >
          <Pencil size={ICON_SIZES.md} color={currentTool === 'pencil' ? COLORS.white : COLORS.textDark} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onSelectTool('text')}
          style={[styles.toolBtn, currentTool === 'text' && styles.toolBtnActive]}
        >
          <Type size={ICON_SIZES.md} color={currentTool === 'text' ? COLORS.white : COLORS.textDark} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onSelectTool('eraser')}
          style={[styles.toolBtn, currentTool === 'eraser' && styles.toolBtnActive]}
        >
          <Eraser size={ICON_SIZES.md} color={currentTool === 'eraser' ? COLORS.white : COLORS.textDark} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onSelectTool('select')}
          style={[styles.toolBtn, currentTool === 'select' && styles.toolBtnActive]}
        >
          <MousePointer size={ICON_SIZES.md} color={currentTool === 'select' ? COLORS.white : COLORS.textDark} />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* Color Palette */}
      <View style={styles.sectionGroup}>
        {CANVAS_COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => onSelectColor(c)}
            style={[
              styles.colorDot,
              { backgroundColor: c },
              currentColor === c && styles.colorDotActive,
            ]}
          />
        ))}
      </View>

      <View style={styles.divider} />

      {/* Stroke Sizes */}
      <View style={styles.sectionGroup}>
        {CANVAS_STROKE_SIZES.map((s) => (
          <TouchableOpacity
            key={s.size}
            onPress={() => onSelectWidth(s.size)}
            style={[styles.sizeBtn, currentWidth === s.size && styles.sizeBtnActive]}
          >
            <View
              style={{
                width: s.size + 4,
                height: s.size + 4,
                borderRadius: (s.size + 4) / 2,
                backgroundColor: currentWidth === s.size ? COLORS.primary : COLORS.gray600,
              }}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Clear All for Teacher */}
      {isTeacher && (
        <>
          <View style={styles.divider} />
          <TouchableOpacity onPress={onClearAll} style={styles.clearBtn}>
            <Trash2 size={ICON_SIZES.md} color={COLORS.danger} />
            <Text style={styles.clearText}>Xóa tất cả</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  toolbarContainer: {
    position: 'absolute',
    top: 12,
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
});
