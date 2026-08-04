import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lock, RefreshCw } from 'lucide-react';
import { COLORS, ICON_SIZES } from '../constants';
import type { UserProfile, StreamParticipant } from '../types';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useCanvasSync } from '../hooks/useCanvasSync';
import { peerService } from '../services/peerService';

import { Header } from '../components/common/Header';
import { VideoGrid } from '../components/classroom/VideoGrid';
import { ControlsBar } from '../components/classroom/ControlsBar';
import { Modal } from '../components/common/Modal';

export interface MeetingRoomProps {
  user: UserProfile;
  roomCode: string;
  roomTitle?: string;
  onLeaveRoom: () => void;
}

export const MeetingRoom: React.FC<MeetingRoomProps> = ({
  user,
  roomCode,
  roomTitle = 'Lớp Học Trực Tuyến Tương Tác',
  onLeaveRoom,
}) => {
  const isTeacher = user.role === 'teacher';
  const { container16x9 } = useResponsiveLayout();

  // Media States
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [isCamOn, setIsCamOn] = useState<boolean>(true);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // Connection & Modals State
  const [connectionStatus, setConnectionStatus] = useState<string>('connected');
  const [exitModalVisible, setExitModalVisible] = useState<boolean>(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState<boolean>(false);
  const [copiedLinkSuccess, setCopiedLinkSuccess] = useState<boolean>(false);

  // Participants list
  const [participants, setParticipants] = useState<StreamParticipant[]>([
    {
      id: user.id,
      name: user.fullName,
      role: user.role,
      isMicOn: true,
      isCamOn: true,
      isScreenSharing: false,
      canDraw: true,
    },
    {
      id: 'std-101',
      name: 'Học Sinh An',
      role: 'student',
      isMicOn: true,
      isCamOn: true,
      isScreenSharing: false,
      canDraw: true,
    },
    {
      id: 'std-102',
      name: 'Học Sinh Bình',
      role: 'student',
      isMicOn: false,
      isCamOn: true,
      isScreenSharing: false,
      canDraw: true,
    },
  ]);

  // Realtime Canvas Hook
  const {
    strokes,
    addStroke,
    clearCanvas,
    updateStudentPermission,
    setGlobalCanDraw,
    permissionState,
    canCurrentUserDraw,
  } = useCanvasSync({
    roomId: roomCode,
    userId: user.id,
    userName: user.fullName,
    isTeacher,
  });

  // Initialize PeerJS & Media Streams
  useEffect(() => {
    peerService.initialize(user.id, {
      onConnectionStatusChange: (status) => {
        setConnectionStatus(status);
        if (status === 'permission_denied') {
          setPermissionModalVisible(true);
        }
      },
      onRemoteStream: (peerId, stream) => {
        setParticipants((prev) =>
          prev.map((p) => (p.id === peerId ? { ...p, stream } : p))
        );
      },
    });

    peerService.startLocalMedia(true, true);

    return () => {
      peerService.disconnect();
    };
  }, [user.id]);

  const handleToggleMic = () => {
    const nextState = !isMicOn;
    setIsMicOn(nextState);
    peerService.toggleAudio(nextState);
    setParticipants((prev) =>
      prev.map((p) => (p.id === user.id ? { ...p, isMicOn: nextState } : p))
    );
  };

  const handleToggleCam = () => {
    const nextState = !isCamOn;
    setIsCamOn(nextState);
    peerService.toggleVideo(nextState);
    setParticipants((prev) =>
      prev.map((p) => (p.id === user.id ? { ...p, isCamOn: nextState } : p))
    );
  };

  const handleToggleScreenShare = async () => {
    if (!isTeacher) return;

    if (!isScreenSharing) {
      const stream = await peerService.startScreenShare();
      if (stream) {
        setScreenStream(stream);
        setIsScreenSharing(true);
      }
    } else {
      peerService.stopScreenShare();
      setScreenStream(null);
      setIsScreenSharing(false);
    }
  };

  const handleCopyRoomLink = () => {
    const link = `${window.location.origin}/join/${roomCode}?name=${encodeURIComponent(user.fullName)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
      setCopiedLinkSuccess(true);
      setTimeout(() => setCopiedLinkSuccess(false), 2500);
    }
  };

  return (
    <View style={styles.roomContainer}>
      <Header
        userName={user.fullName}
        role={user.role}
        roomTitle={`${roomTitle} (${roomCode})`}
        onLogout={() => setExitModalVisible(true)}
      />

      {/* Network Reconnecting Alert Banner */}
      {connectionStatus === 'reconnecting' && (
        <View style={styles.reconnectBanner}>
          <RefreshCw size={ICON_SIZES.sm} color={COLORS.white} />
          <Text style={styles.reconnectText}>Đang tự động kết nối lại mạng (Thử lại 5 lần)...</Text>
        </View>
      )}

      {/* Video & Canvas Viewport */}
      <VideoGrid
        containerWidth={container16x9.width}
        containerHeight={container16x9.height}
        participants={participants.map((p) => ({
          ...p,
          canDraw: isTeacher
            ? true
            : permissionState.globalCanDraw && (permissionState.studentPermissions[p.id] ?? true),
        }))}
        screenStream={screenStream}
        strokes={strokes}
        onAddStroke={addStroke}
        onClearAll={clearCanvas}
        userId={user.id}
        userName={user.fullName}
        isTeacher={isTeacher}
        canDraw={canCurrentUserDraw}
        onToggleStudentDraw={(stdId, curr) => updateStudentPermission(stdId, !curr)}
      />

      {/* Bottom Meeting Controls */}
      <ControlsBar
        isMicOn={isMicOn}
        onToggleMic={handleToggleMic}
        isCamOn={isCamOn}
        onToggleCam={handleToggleCam}
        isScreenSharing={isScreenSharing}
        onToggleScreenShare={handleToggleScreenShare}
        isTeacher={isTeacher}
        globalCanDraw={permissionState.globalCanDraw}
        onToggleGlobalDraw={() => setGlobalCanDraw(!permissionState.globalCanDraw)}
        onCopyRoomLink={handleCopyRoomLink}
        onLeaveClass={() => setExitModalVisible(true)}
        copiedSuccess={copiedLinkSuccess}
      />

      {/* Exit Class Confirmation Modal */}
      <Modal
        visible={exitModalVisible}
        onClose={() => setExitModalVisible(false)}
        title="Xác Nhận Rời Lớp Học"
        description="Em có chắc chắn muốn thoát khỏi phòng học này không?"
        confirmLabel="Rời Lớp Học"
        confirmVariant="danger"
        onConfirm={onLeaveRoom}
        cancelLabel="Quay Lại Lớp"
      />

      {/* Camera / Mic Permission Error Modal */}
      <Modal
        visible={permissionModalVisible}
        onClose={() => setPermissionModalVisible(false)}
        title="Cần Cho Phép Camera & Micro"
        icon={Lock}
        description="Trình duyệt đang chặn Camera hoặc Mic. Hãy bấm vào biểu tượng Ổ khóa trên thanh địa chỉ trình duyệt để cho phép ứng dụng truy cập Camera & Mic."
        confirmLabel="Đã Hiểu"
        confirmVariant="primary"
        onConfirm={() => setPermissionModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  roomContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  reconnectBanner: {
    backgroundColor: COLORS.warning,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  reconnectText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 14,
  },
});
