import type { StrokePoint } from '../types';

export interface AbsoluteCoordinates {
  x: number;
  y: number;
}

export function normalizeCoordinate(
  absoluteX: number,
  absoluteY: number,
  containerWidth: number,
  containerHeight: number
): StrokePoint {
  const safeWidth = Math.max(containerWidth, 1);
  const safeHeight = Math.max(containerHeight, 1);
  const safeX = Number.isFinite(absoluteX) ? absoluteX : 0;
  const safeY = Number.isFinite(absoluteY) ? absoluteY : 0;
  return {
    x: Math.max(0, Math.min(1, safeX / safeWidth)),
    y: Math.max(0, Math.min(1, safeY / safeHeight)),
  };
}

export function denormalizeCoordinate(
  normX: number,
  normY: number,
  containerWidth: number,
  containerHeight: number
): AbsoluteCoordinates {
  const safeX = Number.isFinite(normX) ? normX : 0;
  const safeY = Number.isFinite(normY) ? normY : 0;
  return {
    x: Math.max(0, Math.min(containerWidth, safeX * containerWidth)),
    y: Math.max(0, Math.min(containerHeight, safeY * containerHeight)),
  };
}

export function pointsToSvgPath(
  points: StrokePoint[],
  containerWidth: number,
  containerHeight: number
): string {
  if (!points || !Array.isArray(points) || points.length === 0) return '';
  
  const pathParts: string[] = [];
  try {
    const firstPoint = points[0];
    if (firstPoint && typeof firstPoint.x === 'number' && typeof firstPoint.y === 'number' && Number.isFinite(firstPoint.x) && Number.isFinite(firstPoint.y)) {
      const first = denormalizeCoordinate(firstPoint.x, firstPoint.y, containerWidth, containerHeight);
      pathParts.push(`M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`);
    } else {
      return '';
    }

    for (let i = 1; i < points.length; i++) {
      const pt = points[i];
      if (pt && typeof pt.x === 'number' && typeof pt.y === 'number' && Number.isFinite(pt.x) && Number.isFinite(pt.y)) {
        const denorm = denormalizeCoordinate(pt.x, pt.y, containerWidth, containerHeight);
        pathParts.push(`L ${denorm.x.toFixed(2)} ${denorm.y.toFixed(2)}`);
      }
    }
  } catch (error) {
    console.error('Error normalizing coordinates in pointsToSvgPath:', error);
    return '';
  }

  return pathParts.join(' ');
}
