import React, { useState, useRef } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Check, X } from 'lucide-react';
import type { CanvasStroke, StrokePoint, ToolType, FloatingTextInputState } from '../../types';
import { normalizeCoordinate, denormalizeCoordinate, pointsToSvgPath } from '../../utils/coordinateNormalizer';
import { COLORS, CANVAS_COLORS } from '../../constants';
import { CanvasToolbar } from './CanvasToolbar';

export interface InteractiveCanvasProps {
  containerWidth: number;
  containerHeight: number;
  strokes: CanvasStroke[];
  onAddStroke: (stroke: CanvasStroke) => void;
  onRemoveStroke: (strokeId: string) => void;
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
  onRemoveStroke,
  onClearAll,
  userId,
  userName,
  isTeacher,
  canDraw,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;

  const [currentTool, setCurrentTool] = useState<ToolType>('pencil');
  const [currentColor, setCurrentColor] = useState<string>('#F43F5E');
  const [currentWidth, setCurrentWidth] = useState<number>(6);

  const isDrawingRef = useRef<boolean>(false);
  const pointsRef = useRef<StrokePoint[]>([]);
  const activePathRef = useRef<SVGPathElement | null>(null);

  // Bug 6: Floating Inline Text Input Card State
  const [floatingText, setFloatingText] = useState<FloatingTextInputState>({
    visible: false,
    x: 0,
    y: 0,
    normX: 0.5,
    normY: 0.5,
    text: '',
    color: '#F43F5E',
  });

  // Bug 5: Eraser Hit-Testing (<15px distance to stroke points)
  const eraseStrokesNearPoint = (absoluteX: number, absoluteY: number) => {
    const hitRadius = 15;
    strokes.forEach((stroke) => {
      let isHit = false;
      stroke.points.forEach((pt) => {
        const absPt = denormalizeCoordinate(pt.x, pt.y, containerWidth, containerHeight);
        const dist = Math.hypot(absPt.x - absoluteX, absPt.y - absoluteY);
        if (dist < hitRadius) {
          isHit = true;
        }
      });
      if (isHit) {
        onRemoveStroke(stroke.id);
      }
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canDraw) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    // Clamp coordinates strictly within the whiteboard frame
    const absoluteX = Math.max(0, Math.min(rawX, containerWidth));
    const absoluteY = Math.max(0, Math.min(rawY, containerHeight));

    const norm = normalizeCoordinate(absoluteX, absoluteY, containerWidth, containerHeight);

    if (currentTool === 'pencil') {
      isDrawingRef.current = true;
      pointsRef.current = [norm];
      if (activePathRef.current) {
        const pathData = pointsToSvgPath([norm], containerWidth, containerHeight);
        activePathRef.current.setAttribute('d', pathData);
        activePathRef.current.style.display = 'block';
      }
    } else if (currentTool === 'eraser') {
      isDrawingRef.current = true;
      eraseStrokesNearPoint(absoluteX, absoluteY);
    } else if (currentTool === 'text') {
      // Keep text input fully inside the drawing frame with 8px margin
      const textInputX = Math.max(8, Math.min(absoluteX, containerWidth - 220));
      const textInputY = Math.max(8, Math.min(absoluteY, containerHeight - 120));
      setFloatingText({
        visible: true,
        x: textInputX,
        y: textInputY,
        normX: norm.x,
        normY: norm.y,
        text: '',
        color: currentColor,
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingRef.current || !canDraw) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    // Clamp coordinates strictly within the whiteboard frame
    const absoluteX = Math.max(0, Math.min(rawX, containerWidth));
    const absoluteY = Math.max(0, Math.min(rawY, containerHeight));

    if (currentTool === 'pencil') {
      const norm = normalizeCoordinate(absoluteX, absoluteY, containerWidth, containerHeight);
      pointsRef.current.push(norm);
      if (activePathRef.current) {
        const pathData = pointsToSvgPath(pointsRef.current, containerWidth, containerHeight);
        activePathRef.current.setAttribute('d', pathData);
      }
    } else if (currentTool === 'eraser') {
      eraseStrokesNearPoint(absoluteX, absoluteY);
    }
  };

  const handlePointerUp = () => {
    if (isDrawingRef.current && currentTool === 'pencil' && pointsRef.current.length > 0) {
      isDrawingRef.current = false;
      const newStroke: CanvasStroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        userId,
        userName,
        toolType: 'pencil',
        points: [...pointsRef.current],
        color: currentColor,
        strokeWidth: currentWidth,
      };
      onAddStroke(newStroke);
      pointsRef.current = [];
      if (activePathRef.current) {
        activePathRef.current.style.display = 'none';
        activePathRef.current.setAttribute('d', '');
      }
    } else {
      isDrawingRef.current = false;
    }
  };

  const handleConfirmText = () => {
    if (floatingText.text.trim()) {
      const textStroke: CanvasStroke = {
        id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        userId,
        userName,
        toolType: 'text',
        points: [{ x: floatingText.normX, y: floatingText.normY }],
        color: floatingText.color,
        strokeWidth: currentWidth,
        textContent: floatingText.text.trim(),
        fontSize: currentWidth * 3 + 14,
      };
      onAddStroke(textStroke);
    }
    setFloatingText((prev) => ({ ...prev, visible: false, text: '' }));
  };

  return (
    <View style={[styles.canvasWrapper, { width: containerWidth, height: containerHeight }]}>
      {/* Vertical Toolbar on the right side (absolute positioned) */}
      <CanvasToolbar
        currentTool={currentTool}
        onSelectTool={setCurrentTool}
        currentColor={currentColor}
        onSelectColor={(c) => {
          setCurrentColor(c);
          setFloatingText((prev) => ({ ...prev, color: c }));
        }}
        currentWidth={currentWidth}
        onSelectWidth={setCurrentWidth}
        onClearAll={onClearAll}
        isTeacher={isTeacher}
        canDraw={canDraw}
        isLandscape={isLandscape}
      />

      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          cursor: canDraw
            ? currentTool === 'pencil'
              ? 'crosshair'
              : currentTool === 'eraser'
              ? 'cell'
              : currentTool === 'text'
              ? 'text'
              : 'pointer'
            : 'not-allowed',
          touchAction: 'none',
          zIndex: 20,
          overflow: 'visible',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <svg
          width={containerWidth}
          height={containerHeight}
          style={{ width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden' }}
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
          <path
            ref={activePathRef}
            d=""
            stroke={currentColor}
            strokeWidth={currentWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: 'none' }}
          />

          {/* Neon Dashed Indicator + Live Text Preview */}
          {floatingText.visible && (
            <>
              <circle
                cx={floatingText.x}
                cy={floatingText.y}
                r={8}
                fill="none"
                stroke="#3B82F6"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
              {floatingText.text !== '' && (
                <text
                  x={floatingText.x}
                  y={floatingText.y}
                  fill={floatingText.color}
                  fontSize={currentWidth * 3 + 14}
                  fontWeight="bold"
                  fontFamily="Nunito, sans-serif"
                  opacity={0.8}
                >
                  {floatingText.text}
                </text>
              )}
            </>
          )}
        </svg>
      </div>

      {/* Floating Inline Text Input Card */}
      {floatingText.visible && (
        <View
          style={[
            styles.floatingCard,
            {
              top: floatingText.y + 12,
              left: floatingText.x + 12,
            },
          ]}
        >
          <TextInput
            style={styles.floatingInput}
            placeholder="G\u00f5 n\u1ed9i dung t\u1ea1i \u0111\u00e2y..."
            placeholderTextColor={COLORS.gray400}
            value={floatingText.text}
            onChangeText={(text) => setFloatingText((prev) => ({ ...prev, text }))}
            autoFocus
            onSubmitEditing={handleConfirmText}
          />

          {/* Quick Color Selector */}
          <View style={styles.floatingColorRow}>
            {CANVAS_COLORS.slice(0, 4).map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setFloatingText((prev) => ({ ...prev, color: c }))}
                style={[
                  styles.miniColorDot,
                  { backgroundColor: c },
                  floatingText.color === c && styles.miniColorDotActive,
                ]}
              />
            ))}

            <View style={styles.floatingActionRow}>
              <TouchableOpacity
                onPress={() => setFloatingText((prev) => ({ ...prev, visible: false }))}
                style={[styles.floatingActionBtn, styles.btnCancel]}
              >
                <X size={16} color={COLORS.gray600} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmText}
                style={[styles.floatingActionBtn, styles.btnConfirm]}
              >
                <Check size={16} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  canvasWrapper: {
    position: 'relative',
    zIndex: 15,
    overflow: 'visible',
  },
  floatingCard: {
    position: 'absolute',
    zIndex: 35,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
    width: 240,
  },
  floatingInput: {
    backgroundColor: COLORS.gray100,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  floatingColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  miniColorDotActive: {
    borderWidth: 2,
    borderColor: COLORS.textDark,
  },
  floatingActionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  floatingActionBtn: {
    padding: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: COLORS.gray100,
  },
  btnConfirm: {
    backgroundColor: COLORS.primary,
  },
});
