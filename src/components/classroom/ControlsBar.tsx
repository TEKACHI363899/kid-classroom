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
  copiedSuccess,
}) => {
  const { canScreenShare } = getDeviceInfo();

  return (
    <View style={styles.barContainer}>
      <View style={styles.controlsGroup}>
        {/* Mic Button */}
        <TouchableOpacity
          onPress={onToggleMic}
          style={[styles.btn, isMicOn ? styles.btnSuccess : styles.btnDanger]}
        >
          {isMicOn ? (
            <Mic size={ICON_SIZES.md} color={COLORS.white} />
          ) : (
            <MicOff size={ICON_SIZES.md} color={COLORS.white} />
          )}
          <Text style={styles.btnLabel}>{isMicOn ? 'Bật Mic' : 'Tắt Mic'}</Text>
        </TouchableOpacity>

        {/* Cam Button */}
        <TouchableOpacity
          onPress={onToggleCam}
          style={[styles.btn, isCamOn ? styles.btnSuccess : styles.btnDanger]}
        >
          {isCamOn ? (
            <Video size={ICON_SIZES.md} color={COLORS.white} />
          ) : (
            <VideoOff size={ICON_SIZES.md} color={COLORS.white} />
          )}
          <Text style={styles.btnLabel}>{isCamOn ? 'Bật Cam' : 'Tắt Cam'}</Text>
        </TouchableOpacity>

        {/* Screen Share (Only if supported and Desktop) */}
        {isTeacher && canScreenShare && (
          <TouchableOpacity
            onPress={onToggleScreenShare}
            style={[styles.btn, isScreenSharing ? styles.btnWarning : styles.btnPrimary]}
          >
            <Monitor size={ICON_SIZES.md} color={COLORS.white} />
            <Text style={styles.btnLabel}>
              {isScreenSharing ? 'Dừng Màn Hình' : 'Chia Sẻ Màn Hình'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Grant Drawing Permission (Teacher only) */}
        {isTeacher && (
          <TouchableOpacity
            onPress={onToggleGlobalDraw}
            style={[styles.btn, globalCanDraw ? styles.btnPurple : styles.btnOutline]}
          >
            <Pencil size={ICON_SIZES.md} color={globalCanDraw ? COLORS.white : COLORS.purple} />
            <Text style={[styles.btnLabel, !globalCanDraw && { color: COLORS.purple }]}>
              {globalCanDraw ? 'Tắt Quyền Vẽ' : 'Cấp Quyền Vẽ All'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Copy Instant Room Link */}
        <TouchableOpacity onPress={onCopyRoomLink} style={[styles.btn, styles.btnOutlinePrimary]}>
          {copiedSuccess ? (
            <CheckCircle size={ICON_SIZES.md} color={COLORS.success} />
          ) : (
            <Copy size={ICON_SIZES.md} color={COLORS.primary} />
          )}
          <Text style={[styles.btnLabel, { color: copiedSuccess ? COLORS.success : COLORS.primary }]}>
            {copiedSuccess ? 'Đã Sao Chép!' : 'Sao Chép Link'}
          </Text>
        </TouchableOpacity>

        {/* Leave Class Button */}
        <TouchableOpacity onPress={onLeaveClass} style={[styles.btn, styles.btnExit]}>
          <LogOut size={ICON_SIZES.md} color={COLORS.white} />
          <Text style={styles.btnLabel}>Thoát Lớp</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  barContainer: {
    height: 76,
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
