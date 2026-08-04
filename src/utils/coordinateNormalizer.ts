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
    x: Math.min(Math.max(absoluteX / safeWidth, 0), 1),
    y: Math.min(Math.max(absoluteY / safeHeight, 0), 1),
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
  if (points.length === 0) return '';
  const first = denormalizeCoordinate(points[0].x, points[0].y, containerWidth, containerHeight);
  let pathString = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;

  for (let i = 1; i < points.length; i++) {
    const pt = denormalizeCoordinate(points[i].x, points[i].y, containerWidth, containerHeight);
    pathString += ` L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
  }

  return pathString;
}
