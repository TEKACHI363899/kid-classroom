import { useState, useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import { BREAKPOINT_MOBILE, BREAKPOINT_TABLET, ASPECT_RATIO_CONTAINER } from '../constants';

export interface Viewport16x9 {
  width: number;
  height: number;
}

export interface ResponsiveLayout {
  windowWidth: number;
  windowHeight: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  container16x9: Viewport16x9;
}

export function useResponsiveLayout(): ResponsiveLayout {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const calculate16x9Bounds = (availWidth: number, availHeight: number): Viewport16x9 => {
    const isMobile = availWidth < BREAKPOINT_MOBILE;
    const headerHeight = 72;
    const controlsHeight = isMobile ? 56 : 76;
    const padding = isMobile ? 8 : 16;

    // Reserve vertical space for header, controls, and screen padding
    const maxAvailableWidth = Math.max(availWidth - 12, 280);
    const maxAvailableHeight = Math.max(availHeight - (headerHeight + controlsHeight + padding), 150);

    let targetWidth = maxAvailableWidth;
    let targetHeight = targetWidth / ASPECT_RATIO_CONTAINER;

    if (targetHeight > maxAvailableHeight) {
      targetHeight = maxAvailableHeight;
      targetWidth = targetHeight * ASPECT_RATIO_CONTAINER;
    }

    return {
      width: Math.round(targetWidth),
      height: Math.round(targetHeight),
    };
  };

  const [container16x9, setContainer16x9] = useState<Viewport16x9>(() =>
    calculate16x9Bounds(windowWidth, windowHeight)
  );

  useEffect(() => {
    setContainer16x9(calculate16x9Bounds(windowWidth, windowHeight));
  }, [windowWidth, windowHeight]);

  const isMobile = windowWidth < BREAKPOINT_MOBILE;
  const isTablet = windowWidth >= BREAKPOINT_MOBILE && windowWidth <= BREAKPOINT_TABLET;
  const isDesktop = windowWidth > BREAKPOINT_TABLET;

  return {
    windowWidth,
    windowHeight,
    isMobile,
    isTablet,
    isDesktop,
    container16x9,
  };
}
