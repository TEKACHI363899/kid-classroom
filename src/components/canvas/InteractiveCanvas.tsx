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
  isFullscreen?: boolean;
  showControls?: boolean;
}

interface MemoizedStrokeProps {
  stroke: CanvasStroke;
  containerWidth: number;
  containerHeight: number;
}

const MemoizedStroke = React.memo<MemoizedStrokeProps>(({ stroke, containerWidth, containerHeight }) => {
  if (stroke.toolType === 'pencil') {
    const pathData = pointsToSvgPath(stroke.points, containerWidth, containerHeight);
    return (
      <path
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
});

MemoizedStroke.displayName = 'MemoizedStroke';

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
  isFullscreen = false,
  showControls = false,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;

  const [currentTool, setCurrentTool] = useState<ToolType>('pencil');
  const [currentColor, setCurrentColor] = useState<string>('#F43F5E');
  const [currentWidth, setCurrentWidth] = useState<number>(6);

  // Select and Drag State & Refs
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);
  const [draggedStrokeId, setDraggedStrokeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasDraggedRef = useRef<boolean>(false);

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
    } else if (currentTool === 'select') {
      let closestStroke: CanvasStroke | null = null;
      let minDistance = Infinity;
      const selectThreshold = 25; // px

      strokes.forEach((stroke) => {
        if (stroke.toolType === 'text') {
          const pt = stroke.points[0];
          if (pt) {
            const absPt = denormalizeCoordinate(pt.x, pt.y, containerWidth, containerHeight);
            const dist = Math.hypot(absPt.x - absoluteX, absPt.y - absoluteY);
            if (dist < minDistance) {
              minDistance = dist;
              closestStroke = stroke;
            }
          }
        } else {
          stroke.points.forEach((pt) => {
            const absPt = denormalizeCoordinate(pt.x, pt.y, containerWidth, containerHeight);
            const dist = Math.hypot(absPt.x - absoluteX, absPt.y - absoluteY);
            if (dist < minDistance) {
              minDistance = dist;
              closestStroke = stroke;
            }
          });
        }
      });

      if (closestStroke && minDistance < selectThreshold) {
        setSelectedStrokeId((closestStroke as CanvasStroke).id);
        setDraggedStrokeId((closestStroke as CanvasStroke).id);
        setDragOffset({ x: 0, y: 0 });
        dragStartPosRef.current = { x: absoluteX, y: absoluteY };
        hasDraggedRef.current = false;
        isDrawingRef.current = true;
      } else {
        setSelectedStrokeId(null);
        setDraggedStrokeId(null);
      }
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
    } else if (currentTool === 'select' && draggedStrokeId) {
      const dx = absoluteX - dragStartPosRef.current.x;
      const dy = absoluteY - dragStartPosRef.current.y;
      if (Math.hypot(dx, dy) > 3) {
        hasDraggedRef.current = true;
      }
      setDragOffset({
        x: dx / containerWidth,
        y: dy / containerHeight,
      });
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
    } else if (isDrawingRef.current && currentTool === 'select' && draggedStrokeId) {
      isDrawingRef.current = false;
      if (hasDraggedRef.current && (Math.abs(dragOffset.x) > 0.001 || Math.abs(dragOffset.y) > 0.001)) {
        const targetStroke = strokes.find((s) => s.id === draggedStrokeId);
        if (targetStroke) {
          const updatedPoints = targetStroke.points.map((pt) => ({
            x: Math.max(0, Math.min(1, pt.x + dragOffset.x)),
            y: Math.max(0, Math.min(1, pt.y + dragOffset.y)),
          }));
          const newStrokeId = `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          const updatedStroke: CanvasStroke = {
            ...targetStroke,
            id: newStrokeId,
            points: updatedPoints,
          };
          onRemoveStroke(draggedStrokeId);
          onAddStroke(updatedStroke);
          setSelectedStrokeId(newStrokeId);
        }
      }
      setDraggedStrokeId(null);
      setDragOffset({ x: 0, y: 0 });
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

  const handleSelectTool = (tool: ToolType) => {
    setCurrentTool(tool);
    setSelectedStrokeId(null);
    setDraggedStrokeId(null);
    setDragOffset({ x: 0, y: 0 });
  };

  // Listen for Delete or Backspace key to remove the selected stroke on desktop
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid deleting if user is typing in a text input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (currentTool === 'select' && selectedStrokeId) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          onRemoveStroke(selectedStrokeId);
          setSelectedStrokeId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentTool, selectedStrokeId, onRemoveStroke]);

  // Calculate selection bounding box for drawing selection indicator
  const selectionBox = React.useMemo(() => {
    if (!selectedStrokeId) return null;
    const selectedStroke = strokes.find((s) => s.id === selectedStrokeId);
    if (!selectedStroke) return null;

    const isDragging = selectedStroke.id === draggedStrokeId;
    const pointsToUse = isDragging
      ? selectedStroke.points.map((pt) => ({
          x: Math.max(0, Math.min(1, pt.x + dragOffset.x)),
          y: Math.max(0, Math.min(1, pt.y + dragOffset.y)),
        }))
      : selectedStroke.points;

    if (pointsToUse.length === 0) return null;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    pointsToUse.forEach((pt) => {
      const absPt = denormalizeCoordinate(pt.x, pt.y, containerWidth, containerHeight);
      if (absPt.x < minX) minX = absPt.x;
      if (absPt.x > maxX) maxX = absPt.x;
      if (absPt.y < minY) minY = absPt.y;
      if (absPt.y > maxY) maxY = absPt.y;
    });

    const padding = 8;

    if (selectedStroke.toolType === 'text') {
      const fontSize = selectedStroke.fontSize || 20;
      const textLen = selectedStroke.textContent?.length || 10;
      const estimatedWidth = textLen * fontSize * 0.6;
      return {
        x: minX - padding,
        y: minY - fontSize - padding,
        width: estimatedWidth + padding * 2,
        height: fontSize + padding * 2,
      };
    }

    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    };
  }, [selectedStrokeId, strokes, draggedStrokeId, dragOffset, containerWidth, containerHeight]);

  return (
    <View style={[styles.canvasWrapper, { width: containerWidth, height: containerHeight }]}>
      {/* Vertical Toolbar on the right side (absolute positioned) */}
      <CanvasToolbar
        currentTool={currentTool}
        onSelectTool={handleSelectTool}
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
        isFullscreen={isFullscreen}
        showControls={showControls}
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
            const isDragging = stroke.id === draggedStrokeId;
            const strokeToRender = isDragging
              ? {
                  ...stroke,
                  points: stroke.points.map((pt) => ({
                    x: Math.max(0, Math.min(1, pt.x + dragOffset.x)),
                    y: Math.max(0, Math.min(1, pt.y + dragOffset.y)),
                  })),
                }
              : stroke;

            return (
              <MemoizedStroke
                key={stroke.id}
                stroke={strokeToRender}
                containerWidth={containerWidth}
                containerHeight={containerHeight}
              />
            );
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

          {/* Render Selection Box */}
          {selectionBox && (
            <rect
              x={selectionBox.x}
              y={selectionBox.y}
              width={selectionBox.width}
              height={selectionBox.height}
              fill="rgba(59, 130, 246, 0.05)"
              stroke="#3B82F6"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              rx={4}
            />
          )}

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

      {/* Floating delete button for selected stroke */}
      {selectionBox && (
        <TouchableOpacity
          onPress={() => {
            if (selectedStrokeId) {
              onRemoveStroke(selectedStrokeId);
              setSelectedStrokeId(null);
            }
          }}
          style={{
            position: 'absolute',
            left: Math.max(0, selectionBox.x + selectionBox.width - 12),
            top: Math.max(0, selectionBox.y - 12),
            zIndex: 25,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: COLORS.danger,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 3,
            elevation: 4,
          }}
          {...({
            onPointerDown: (e: any) => e.stopPropagation(),
            onPointerUp: (e: any) => e.stopPropagation(),
            onClick: (e: any) => e.stopPropagation(),
          } as any)}
        >
          <X size={12} color={COLORS.white} />
        </TouchableOpacity>
      )}

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
          {...({
            'data-floating-card': 'true',
            onPointerDown: (e: any) => e.stopPropagation(),
            onPointerUp: (e: any) => e.stopPropagation(),
            onClick: (e: any) => e.stopPropagation(),
          } as any)}
        >
          <TextInput
            style={styles.floatingInput}
            placeholder="Gõ nội dung tại đây..."
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
