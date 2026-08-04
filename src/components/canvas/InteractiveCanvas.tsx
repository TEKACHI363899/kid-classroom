import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Modal, TouchableOpacity, Text } from 'react-native';
import type { CanvasStroke, StrokePoint, ToolType } from '../../types';
import { normalizeCoordinate, denormalizeCoordinate, pointsToSvgPath } from '../../utils/coordinateNormalizer';
import { COLORS } from '../../constants';
import { CanvasToolbar } from './CanvasToolbar';

export interface InteractiveCanvasProps {
  containerWidth: number;
  containerHeight: number;
  strokes: CanvasStroke[];
  onAddStroke: (stroke: CanvasStroke) => void;
  onClearAll: () => void;
  userId: string;
  userName: string;
  isTeacher: boolean;
  canDraw: boolean;
}

export const InteractiveCanvas: React.FC<InteractiveCanvasProps> = ({
  containerWidth,
  containerHeight,
  strokes,
  onAddStroke,
  onClearAll,
  userId,
  userName,
  isTeacher,
  canDraw,
}) => {
  const [currentTool, setCurrentTool] = useState<ToolType>('pencil');
  const [currentColor, setCurrentColor] = useState<string>('#F43F5E');
  const [currentWidth, setCurrentWidth] = useState<number>(6);

  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentPoints, setCurrentPoints] = useState<StrokePoint[]>([]);

  // Text Tool State
  const [textInputVisible, setTextInputVisible] = useState<boolean>(false);
  const [textPoint, setTextPoint] = useState<StrokePoint>({ x: 0.5, y: 0.5 });
  const [textVal, setTextVal] = useState<string>('');

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canDraw) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const absoluteX = e.clientX - rect.left;
    const absoluteY = e.clientY - rect.top;

    const norm = normalizeCoordinate(absoluteX, absoluteY, containerWidth, containerHeight);

    if (currentTool === 'pencil') {
      setIsDrawing(true);
      setCurrentPoints([norm]);
    } else if (currentTool === 'text') {
      setTextPoint(norm);
      setTextVal('');
      setTextInputVisible(true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing || !canDraw || currentTool !== 'pencil') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const absoluteX = e.clientX - rect.left;
    const absoluteY = e.clientY - rect.top;

    const norm = normalizeCoordinate(absoluteX, absoluteY, containerWidth, containerHeight);
    setCurrentPoints((prev) => [...prev, norm]);
  };

  const handlePointerUp = () => {
    if (isDrawing && currentPoints.length > 0) {
      setIsDrawing(false);
      const newStroke: CanvasStroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        userId,
        userName,
        toolType: 'pencil',
        points: currentPoints,
        color: currentColor,
        strokeWidth: currentWidth,
      };
      onAddStroke(newStroke);
      setCurrentPoints([]);
    }
  };

  const handleTextSubmit = () => {
    if (textVal.trim()) {
      const textStroke: CanvasStroke = {
        id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        userId,
        userName,
        toolType: 'text',
        points: [textPoint],
        color: currentColor,
        strokeWidth: currentWidth,
        textContent: textVal.trim(),
        fontSize: currentWidth * 3 + 14,
      };
      onAddStroke(textStroke);
    }
    setTextInputVisible(false);
    setTextVal('');
  };

  const currentSvgPath = pointsToSvgPath(currentPoints, containerWidth, containerHeight);

  return (
    <View style={[styles.canvasWrapper, { width: containerWidth, height: containerHeight }]}>
      <CanvasToolbar
        currentTool={currentTool}
        onSelectTool={setCurrentTool}
        currentColor={currentColor}
        onSelectColor={setCurrentColor}
        currentWidth={currentWidth}
        onSelectWidth={setCurrentWidth}
        onClearAll={onClearAll}
        isTeacher={isTeacher}
        canDraw={canDraw}
      />

      {/* SVG Canvas Overlay */}
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          cursor: canDraw ? (currentTool === 'pencil' ? 'crosshair' : currentTool === 'text' ? 'text' : 'pointer') : 'not-allowed',
          touchAction: 'none',
          zIndex: 20,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <svg
          width={containerWidth}
          height={containerHeight}
          style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
        >
          {/* Render Saved Vector Strokes */}
          {strokes.map((stroke) => {
            if (stroke.toolType === 'pencil') {
              const pathData = pointsToSvgPath(stroke.points, containerWidth, containerHeight);
              return (
                <path
                  key={stroke.id}
                  d={pathData}
                  stroke={stroke.color}
                  strokeWidth={stroke.strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            } else if (stroke.toolType === 'text' && stroke.points.length > 0) {
              const pos = denormalizeCoordinate(
                stroke.points[0].x,
                stroke.points[0].y,
                containerWidth,
                containerHeight
              );
              return (
                <text
                  key={stroke.id}
                  x={pos.x}
                  y={pos.y}
                  fill={stroke.color}
                  fontSize={stroke.fontSize || 20}
                  fontWeight="bold"
                  fontFamily="Nunito, sans-serif"
                >
                  {stroke.textContent}
                </text>
              );
            }
            return null;
          })}

          {/* Render Active Drawing Path */}
          {isDrawing && currentSvgPath && (
            <path
              d={currentSvgPath}
              stroke={currentColor}
              strokeWidth={currentWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </div>

      {/* Text Input Modal */}
      <Modal visible={textInputVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nhập Văn Bản Nhanh</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Gõ chữ tại đây..."
              placeholderTextColor={COLORS.gray400}
              value={textVal}
              onChangeText={setTextVal}
              autoFocus
              onSubmitEditing={handleTextSubmit}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setTextInputVisible(false)}
                style={[styles.btn, styles.btnCancel]}
              >
                <Text style={styles.btnCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleTextSubmit} style={[styles.btn, styles.btnSubmit]}>
                <Text style={styles.btnSubmitText}>Thêm Vô Bảng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  canvasWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 15,
    overflow: 'hidden',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 14,
    padding: 12,
    fontSize: 16,
    color: COLORS.textDark,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnCancel: {
    backgroundColor: COLORS.gray100,
  },
  btnCancelText: {
    color: COLORS.gray600,
    fontWeight: '700',
  },
  btnSubmit: {
    backgroundColor: COLORS.primary,
  },
  btnSubmitText: {
    color: COLORS.white,
    fontWeight: '800',
  },
});
