import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Pencil,
  Copy,
  LogOut,
  PhoneOff,
  CheckCircle,
} from 'lucide-react';
import { COLORS, ICON_SIZES } from '../../constants';
import { getDeviceInfo } from '../../utils/platformHelper';

export interface ControlsBarProps {
  isMicOn: boolean;
  onToggleMic: () => void;
  isCamOn: boolean;
  onToggleCam: () => void;
  isScreenSharing: boolean;
  onToggleScreenShare: () => void;
  isTeacher: boolean;
  globalCanDraw: boolean;
  onToggleGlobalDraw: () => void;
  onCopyRoomLink: () => void;
  onLeaveClass: () => void;
  onEndClassroom?: () => void;
  copiedSuccess?: boolean;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  isMicOn,
  onToggleMic,
  isCamOn,
  onToggleCam,
  isScreenSharing,
  onToggleScreenShare,
  isTeacher,
  globalCanDraw,
  onToggleGlobalDraw,
  onCopyRoomLink,
  onLeaveClass,
  onEndClassroom,
  copiedSuccess,
}) => {
  const { canScreenShare } = getDeviceInfo();
  const [isSmallScreen, setIsSmallScreen] = React.useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <View
      style={[
        styles.barContainer,
        { height: isSmallScreen ? 56 : 76 },
        isSmallScreen && {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          borderTopWidth: 1.5,
          borderTopColor: COLORS.gray200,
          paddingBottom: 4, // Leave small safe area space
        },
      ]}
    >
      <View style={styles.controlsGroup}>
        {/* Mic Button */}
        <TouchableOpacity
          onPress={onToggleMic}
          style={[
            styles.btn,
            isMicOn ? styles.btnSuccess : styles.btnDanger,
            isSmallScreen && {
              minWidth: 38,
              minHeight: 38,
              height: 38,
              width: 38,
              paddingHorizontal: 0,
              borderRadius: 19,
              gap: 0,
            },
          ]}
        >
          {isMicOn ? (
            <Mic size={ICON_SIZES.md} color={COLORS.white} />
          ) : (
            <MicOff size={ICON_SIZES.md} color={COLORS.white} />
          )}
          {!isSmallScreen && <Text style={styles.btnLabel}>{isMicOn ? 'Bật Mic' : 'Tắt Mic'}</Text>}
        </TouchableOpacity>

        {/* Cam Button */}
        <TouchableOpacity
          onPress={onToggleCam}
          style={[
            styles.btn,
            isCamOn ? styles.btnSuccess : styles.btnDanger,
            isSmallScreen && {
              minWidth: 38,
              minHeight: 38,
              height: 38,
              width: 38,
              paddingHorizontal: 0,
              borderRadius: 19,
              gap: 0,
            },
          ]}
        >
          {isCamOn ? (
            <Video size={ICON_SIZES.md} color={COLORS.white} />
          ) : (
            <VideoOff size={ICON_SIZES.md} color={COLORS.white} />
          )}
          {!isSmallScreen && <Text style={styles.btnLabel}>{isCamOn ? 'Bật Cam' : 'Tắt Cam'}</Text>}
        </TouchableOpacity>

        {/* Screen Share (Only if supported and Desktop) */}
        {isTeacher && canScreenShare && (
          <TouchableOpacity
            onPress={onToggleScreenShare}
            style={[
              styles.btn,
              isScreenSharing ? styles.btnWarning : styles.btnPrimary,
              isSmallScreen && {
                minWidth: 38,
                minHeight: 38,
                height: 38,
                width: 38,
                paddingHorizontal: 0,
                borderRadius: 19,
                gap: 0,
              },
            ]}
          >
            <Monitor size={ICON_SIZES.md} color={COLORS.white} />
            {!isSmallScreen && (
              <Text style={styles.btnLabel}>
                {isScreenSharing ? 'Dừng Màn Hình' : 'Chia Sẻ Màn Hình'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Grant Drawing Permission (Teacher only) */}
        {isTeacher && (
          <TouchableOpacity
            onPress={onToggleGlobalDraw}
            style={[
              styles.btn,
              globalCanDraw ? styles.btnPurple : styles.btnOutline,
              isSmallScreen && {
                minWidth: 38,
                minHeight: 38,
                height: 38,
                width: 38,
                paddingHorizontal: 0,
                borderRadius: 19,
                gap: 0,
              },
            ]}
          >
            <Pencil size={ICON_SIZES.md} color={globalCanDraw ? COLORS.white : COLORS.purple} />
            {!isSmallScreen && (
              <Text style={[styles.btnLabel, !globalCanDraw && { color: COLORS.purple }]}>
                {globalCanDraw ? 'Tắt Quyền Vẽ' : 'Cấp Quyền Vẽ All'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Copy Instant Room Link (Teacher only) */}
        {isTeacher && (
          <TouchableOpacity
            onPress={onCopyRoomLink}
            style={[
              styles.btn,
              styles.btnOutlinePrimary,
              isSmallScreen && {
                minWidth: 38,
                minHeight: 38,
                height: 38,
                width: 38,
                paddingHorizontal: 0,
                borderRadius: 19,
                gap: 0,
              },
            ]}
          >
            {copiedSuccess ? (
              <CheckCircle size={ICON_SIZES.md} color={COLORS.success} />
            ) : (
              <Copy size={ICON_SIZES.md} color={COLORS.primary} />
            )}
            {!isSmallScreen && (
              <Text style={[styles.btnLabel, { color: copiedSuccess ? COLORS.success : COLORS.primary }]}>
                {copiedSuccess ? 'Đã Sao Chép!' : 'Sao Chép Link'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Teacher-only: End Classroom Button */}
        {isTeacher && onEndClassroom ? (
          <TouchableOpacity
            onPress={onEndClassroom}
            style={[
              styles.btn,
              styles.btnEndClass,
              isSmallScreen && {
                minWidth: 38,
                minHeight: 38,
                height: 38,
                width: 38,
                paddingHorizontal: 0,
                borderRadius: 19,
                gap: 0,
              },
            ]}
          >
            <PhoneOff size={ICON_SIZES.md} color={COLORS.white} />
            {!isSmallScreen && <Text style={styles.btnLabel}>Kết Thúc Lớp Học</Text>}
          </TouchableOpacity>
        ) : (
          /* Student: Leave Class Button */
          <TouchableOpacity
            onPress={onLeaveClass}
            style={[
              styles.btn,
              styles.btnExit,
              isSmallScreen && {
                minWidth: 38,
                minHeight: 38,
                height: 38,
                width: 38,
                paddingHorizontal: 0,
                borderRadius: 19,
                gap: 0,
              },
            ]}
          >
            <LogOut size={ICON_SIZES.md} color={COLORS.white} />
            {!isSmallScreen && <Text style={styles.btnLabel}>Thoát Lớp</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  barContainer: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 40,
  },
  controlsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  btnSuccess: {
    backgroundColor: COLORS.success,
  },
  btnDanger: {
    backgroundColor: COLORS.danger,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
  },
  btnWarning: {
    backgroundColor: COLORS.warning,
  },
  btnPurple: {
    backgroundColor: COLORS.purple,
  },
  btnExit: {
    backgroundColor: COLORS.danger,
  },
  btnEndClass: {
    backgroundColor: '#EF4444',
  },
  btnOutline: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.purple,
  },
  btnOutlinePrimary: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  btnLabel: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
});
