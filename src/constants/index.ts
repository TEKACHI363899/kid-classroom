// Apple HIG Semantic Color Palette
export const COLOR_PRIMARY = '#007AFF'; // systemBlue (Light Mode)
export const COLOR_SUCCESS = '#34C759'; // systemGreen
export const COLOR_DANGER = '#FF3B30';  // systemRed
export const COLOR_BACKGROUND = '#FFFFFF'; // systemBackground
export const COLOR_SECONDARY_BACKGROUND = '#F2F2F7'; // secondarySystemBackground
export const COLOR_TERTIARY_BACKGROUND = '#FFFFFF'; // tertiarySystemBackground
export const COLOR_WARNING = '#FF9500'; // systemOrange
export const COLOR_TEXT_DARK = '#000000'; // label
export const COLOR_TEXT_SECONDARY = '#3C3C43'; // secondaryLabel
export const COLOR_PURPLE = '#AF52DE';  // systemPurple
export const COLOR_CYAN = '#32ADE6';    // systemTeal
export const COLOR_WHITE = '#FFFFFF';
export const COLOR_GRAY_100 = '#F2F2F7'; // systemGroupedBackground
export const COLOR_GRAY_200 = '#E5E5EA'; // systemGray5
export const COLOR_GRAY_400 = '#C7C7CC'; // systemGray4
export const COLOR_GRAY_600 = '#8E8E93'; // systemGray

export const COLORS = {
  primary: COLOR_PRIMARY,
  success: COLOR_SUCCESS,
  danger: COLOR_DANGER,
  background: COLOR_BACKGROUND,
  secondaryBackground: COLOR_SECONDARY_BACKGROUND,
  tertiaryBackground: COLOR_TERTIARY_BACKGROUND,
  warning: COLOR_WARNING,
  textDark: COLOR_TEXT_DARK,
  textSecondary: COLOR_TEXT_SECONDARY,
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

export const BUTTON_MIN_HEIGHT_MOBILE = 44; // Tối thiểu 44pt theo Apple HIG
export const BUTTON_MIN_HEIGHT_DESKTOP = 44; // Giữ 44pt trên desktop (hoặc tối thiểu 28pt theo macOS)
export const BUTTON_BORDER_RADIUS = 12; // Continuous corner radius style

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
