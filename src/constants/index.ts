export const COLOR_PRIMARY = '#3B82F6'; // Soft Blue
export const COLOR_SUCCESS = '#10B981'; // Friendly Green
export const COLOR_DANGER = '#F43F5E';  // Warm Coral
export const COLOR_BACKGROUND = '#F8FAFC'; // Soft Cream Background
export const COLOR_WARNING = '#F59E0B'; // Bright Yellow
export const COLOR_TEXT_DARK = '#1E293B'; // Dark Slate
export const COLOR_PURPLE = '#8B5CF6';  // Soft Purple
export const COLOR_CYAN = '#06B6D4';    // Soft Cyan
export const COLOR_WHITE = '#FFFFFF';
export const COLOR_GRAY_100 = '#F1F5F9';
export const COLOR_GRAY_200 = '#E2E8F0';
export const COLOR_GRAY_400 = '#94A3B8';
export const COLOR_GRAY_600 = '#475569';

export const COLORS = {
  primary: COLOR_PRIMARY,
  success: COLOR_SUCCESS,
  danger: COLOR_DANGER,
  background: COLOR_BACKGROUND,
  warning: COLOR_WARNING,
  textDark: COLOR_TEXT_DARK,
  purple: COLOR_PURPLE,
  cyan: COLOR_CYAN,
  white: COLOR_WHITE,
  gray100: COLOR_GRAY_100,
  gray200: COLOR_GRAY_200,
  gray400: COLOR_GRAY_400,
  gray600: COLOR_GRAY_600,
} as const;

export const ICON_SIZE_SM = 18;
export const ICON_SIZE_MD = 24;
export const ICON_SIZE_LG = 32;
export const ICON_SIZE_XL = 48;

export const ICON_SIZES = {
  sm: ICON_SIZE_SM,
  md: ICON_SIZE_MD,
  lg: ICON_SIZE_LG,
  xl: ICON_SIZE_XL,
} as const;

export const BUTTON_MIN_HEIGHT_MOBILE = 56;
export const BUTTON_MIN_HEIGHT_DESKTOP = 48;
export const BUTTON_BORDER_RADIUS = 16;

export const ASPECT_RATIO_CONTAINER = 16 / 9;

export const BREAKPOINT_MOBILE = 768;
export const BREAKPOINT_TABLET = 1024;

export const CANVAS_COLORS = [
  '#F43F5E', // Warm Coral Red
  '#3B82F6', // Soft Blue
  '#10B981', // Friendly Green
  '#F59E0B', // Bright Yellow
  '#8B5CF6', // Purple
  '#1E293B', // Black/Slate
];

export const CANVAS_STROKE_SIZES = [
  { label: 'Nhỏ', size: 3 },
  { label: 'Vừa', size: 6 },
  { label: 'Lớn', size: 12 },
];

export const WEBRTC_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};
