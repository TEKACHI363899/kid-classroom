import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lock, RefreshCw, PhoneOff } from 'lucide-react';
import { COLORS, ICON_SIZES } from '../constants';
import type { UserProfile, StreamParticipant } from '../types';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useCanvasSync } from '../hooks/useCanvasSync';
import { peerService } from '../services/peerService';
import { supabase } from '../services/supabaseClient';
import { endClassroomByCode } from '../services/storageService';

import { Header } from '../components/common/Header';
import { VideoGrid } from '../components/classroom/VideoGrid';
import { ControlsBar } from '../components/classroom/ControlsBar';
import { Modal } from '../components/common/Modal';

export interface MeetingRoomProps {
  user: UserProfile | null;
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
  // Version 5.0: Student profile is 100% derived from authenticated profile! Zero name modals.
  const currentUser: UserProfile = user || {
    id: `std-${Date.now()}`,
    fullName: 'Học Sinh Thân Yêu',
    role: 'student',
  };

  const isTeacher = currentUser.role === 'teacher';
  const { container16x9 } = useResponsiveLayout();

  // Media States
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [isCamOn, setIsCamOn] = useState<boolean>(true);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // Connection & Modals State
  const [connectionStatus, setConnectionStatus] = useState<string>('connected');
  const [exitModalVisible, setExitModalVisible] = useState<boolean>(false);
  const [endClassModalVisible, setEndClassModalVisible] = useState<boolean>(false);
  const [endedByTeacherNoticeVisible, setEndedByTeacherNoticeVisible] = useState<boolean>(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState<boolean>(false);
  const [copiedLinkSuccess, setCopiedLinkSuccess] = useState<boolean>(false);

  // Dynamic active participants
  const [participants, setParticipants] = useState<StreamParticipant[]>([]);

  // Sync local participant
  useEffect(() => {
    setParticipants((prev) => {
      const exists = prev.some((p) => p.id === currentUser.id);
      if (!exists) {
        return [
          ...prev,
          {
            id: currentUser.id,
            userName: currentUser.fullName,
            role: currentUser.role,
            isMicOn: true,
            isCamOn: true,
            isScreenSharing: false,
            canDraw: true,
          },
        ];
      }
      return prev;
    });
  }, [currentUser]);

  // Realtime Broadcast Listener for CLASSROOM_ENDED
  useEffect(() => {
    if (!roomCode) return;

    const channelName = `room_status_${roomCode}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'CLASSROOM_ENDED' }, () => {
        if (!isTeacher) {
          peerService.disconnect();
          setEndedByTeacherNoticeVisible(true);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, isTeacher]);

  // Realtime Canvas Sync Hook
  const {
    strokes,
    addStroke,
    removeStroke,
    clearCanvas,
    updateStudentPermission,
    setGlobalCanDraw,
    permissionState,
    canCurrentUserDraw,
  } = useCanvasSync({
    roomId: roomCode,
    userId: currentUser.id,
    userName: currentUser.fullName,
    isTeacher,
  });

  // Initialize PeerJS & Media Streams
  useEffect(() => {
    peerService.initialize(currentUser.id, {
      onConnectionStatusChange: (status) => {
        setConnectionStatus(status);
        if (status === 'permission_denied') {
          setPermissionModalVisible(true);
        }
      },
      onLocalStream: (stream) => {
        setParticipants((prev) =>
          prev.map((p) => (p.id === currentUser.id ? { ...p, stream } : p))
        );
      },
      onRemoteStream: (peerId, stream) => {
        setParticipants((prev) =>
          prev.map((p) => (p.id === peerId ? { ...p, stream } : p))
        );
      },
      onDataReceived: (data) => {
        const msg = data as { type: string };
        if (msg && msg.type === 'CLASSROOM_ENDED' && !isTeacher) {
          peerService.disconnect();
          setEndedByTeacherNoticeVisible(true);
        }
      },
    });

    peerService.startLocalMedia(true, true);

    return () => {
      peerService.disconnect();
    };
  }, [currentUser, isTeacher]);

  const handleToggleMic = () => {
    const nextState = !isMicOn;
    setIsMicOn(nextState);
    peerService.toggleAudio(nextState);
    setParticipants((prev) =>
      prev.map((p) => (p.id === currentUser.id ? { ...p, isMicOn: nextState } : p))
    );
  };

  const handleToggleCam = () => {
    const nextState = !isCamOn;
    setIsCamOn(nextState);
    peerService.toggleVideo(nextState);
    setParticipants((prev) =>
      prev.map((p) => (p.id === currentUser.id ? { ...p, isCamOn: nextState } : p))
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
    const link = `${window.location.origin}/join/${roomCode}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
      setCopiedLinkSuccess(true);
      setTimeout(() => setCopiedLinkSuccess(false), 2500);
    }
  };

  const handleConfirmEndClassroom = () => {
    endClassroomByCode(roomCode);

    const channelName = `room_status_${roomCode}`;
    const channel = supabase.channel(channelName);
    channel.send({
      type: 'broadcast',
      event: 'CLASSROOM_ENDED',
      payload: {},
    });

    peerService.broadcastData({ type: 'CLASSROOM_ENDED' });
    peerService.disconnect();

    setEndClassModalVisible(false);
    onLeaveRoom();
  };

  return (
    <View style={styles.roomContainer}>
      <Header
        userName={currentUser.fullName}
        role={currentUser.role}
        roomTitle={`${roomTitle} (${roomCode})`}
        onLogout={() => setExitModalVisible(true)}
      />

      {/* Network Reconnecting Banner */}
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
        onRemoveStroke={removeStroke}
        onClearAll={clearCanvas}
        userId={currentUser.id}
        userName={currentUser.fullName}
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
        onEndClassroom={() => setEndClassModalVisible(true)}
        copiedSuccess={copiedLinkSuccess}
      />

      {/* Teacher End Classroom Confirmation Modal */}
      <Modal
        visible={endClassModalVisible}
        onClose={() => setEndClassModalVisible(false)}
        title="Xác Nhận Kết Thúc Buổi Học"
        icon={PhoneOff}
        description="Bạn có chắc chắn muốn kết thúc buổi học? Tất cả học sinh sẽ được mời ra khỏi phòng và buổi học này sẽ được cập nhật kết thúc."
        confirmLabel="Xác Nhận Kết Thúc"
        confirmVariant="danger"
        onConfirm={handleConfirmEndClassroom}
        cancelLabel="Hủy"
      />

      {/* Student Kick-out Notice Modal when Teacher Ends Classroom */}
      <Modal
        visible={endedByTeacherNoticeVisible}
        onClose={onLeaveRoom}
        title="Buổi Học Đã Kết Thúc"
        description="Buổi học đã được kết thúc bởi Giáo viên. Bạn sẽ được chuyển hướng về lại Màn hình Lịch học."
        confirmLabel="Trở Về Dashboard"
        confirmVariant="primary"
        onConfirm={onLeaveRoom}
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
