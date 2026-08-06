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
  return {
    x: absoluteX / safeWidth,
    y: absoluteY / safeHeight,
  };
}

export function denormalizeCoordinate(
  normX: number,
  normY: number,
  containerWidth: number,
  containerHeight: number
): AbsoluteCoordinates {
  return {
    x: normX * containerWidth,
    y: normY * containerHeight,
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
    if (firstPoint && typeof firstPoint.x === 'number' && typeof firstPoint.y === 'number') {
      const first = denormalizeCoordinate(firstPoint.x, firstPoint.y, containerWidth, containerHeight);
      pathParts.push(`M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`);
    } else {
      return '';
    }

    for (let i = 1; i < points.length; i++) {
      const pt = points[i];
      if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
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
