import { Platform } from 'react-native';

export interface DeviceInfo {
  isMobileBrowser: boolean;
  canScreenShare: boolean;
  isIOS: boolean;
  isAndroid: boolean;
}

export function isMobileBrowser(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  const userAgent = navigator.userAgent || navigator.vendor || (window as unknown as { opera?: string }).opera || '';
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(userAgent) || (window.innerWidth <= 768);
}

export function isIOSBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

export function getDeviceInfo(): DeviceInfo {
  const mobile = isMobileBrowser();
  const ios = isIOSBrowser();
  const android = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  
  // getDisplayMedia is not supported on mobile Safari / mobile browsers for hosting screen share
  const hasGetDisplayMedia = typeof navigator !== 'undefined' && 
    navigator.mediaDevices && 
    typeof navigator.mediaDevices.getDisplayMedia === 'function';

  return {
    isMobileBrowser: mobile,
    canScreenShare: hasGetDisplayMedia && !mobile && Platform.OS === 'web',
    isIOS: ios,
    isAndroid: android,
  };
}
