import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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

  // Media States (Default to OFF)
  const [isMicOn, setIsMicOn] = useState<boolean>(false);
  const [isCamOn, setIsCamOn] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // Connection & Modals State
  const [connectionStatus, setConnectionStatus] = useState<string>('connected');
  const [exitModalVisible, setExitModalVisible] = useState<boolean>(false);
  const [endClassModalVisible, setEndClassModalVisible] = useState<boolean>(false);
  const [endedByTeacherNoticeVisible, setEndedByTeacherNoticeVisible] = useState<boolean>(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState<boolean>(false);
  const [copiedLinkSuccess, setCopiedLinkSuccess] = useState<boolean>(false);

  // Waiting Room Status
  const [waitingStatus, setWaitingStatus] = useState<'waiting' | 'approved' | 'declined'>(
    isTeacher ? 'approved' : 'waiting'
  );
  const [knockingStudents, setKnockingStudents] = useState<
    { userId: string; userName: string; connectionId: string }[]
  >([]);

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
            isMicOn,
            isCamOn,
            isScreenSharing: false,
            canDraw: isTeacher,
          },
        ];
      }
      return prev.map((p) =>
        p.id === currentUser.id ? { ...p, isMicOn, isCamOn } : p
      );
    });
  }, [currentUser, isMicOn, isCamOn, isTeacher]);

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

  // Student waiting room: Send periodic KNOCK broadcast
  useEffect(() => {
    if (waitingStatus !== 'waiting') return;

    const sendKnock = () => {
      const channelName = `room_status_${roomCode}`;
      const channel = supabase.channel(channelName);
      channel.send({
        type: 'broadcast',
        event: 'KNOCK',
        payload: {
          userId: currentUser.id,
          userName: currentUser.fullName,
          connectionId: peerService.getConnectionId || `${currentUser.id}_temp`,
        },
      });
    };

    sendKnock();
    const interval = setInterval(sendKnock, 3000);
    return () => clearInterval(interval);
  }, [waitingStatus, roomCode, currentUser]);

  // Student waiting room: Listen for APPROVE / DECLINE signals
  useEffect(() => {
    if (waitingStatus !== 'waiting') return;

    const channelName = `room_status_${roomCode}`;
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'APPROVE' }, ({ payload }) => {
        if (payload.targetUserId === currentUser.id) {
          setWaitingStatus('approved');
        }
      })
      .on('broadcast', { event: 'DECLINE' }, ({ payload }) => {
        if (payload.targetUserId === currentUser.id) {
          setWaitingStatus('declined');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [waitingStatus, roomCode, currentUser]);

  // Teacher waiting room: Listen for KNOCK signals
  useEffect(() => {
    if (!isTeacher) return;

    const channelName = `room_status_${roomCode}`;
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'KNOCK' }, ({ payload }) => {
        setKnockingStudents((prev) => {
          if (prev.some((s) => s.userId === payload.userId)) return prev;
          return [...prev, payload];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isTeacher, roomCode]);

  // Initialize PeerJS & Media Streams (only when approved)
  useEffect(() => {
    if (waitingStatus !== 'approved') return;

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
      // Critical: This fires when teacher replaces their camera track with
      // screen share track (or vice versa). PeerJS does NOT re-fire 'stream'
      // on replaceTrack, but the browser does fire 'ontrack' on the
      // RTCPeerConnection. We get a NEW MediaStream object here, which gives
      // React a fresh reference to trigger re-render of the <video> element.
      onRemoteTrackUpdated: (peerId, stream) => {
        setParticipants((prev) => {
          const updated = prev.map((p) => (p.id === peerId ? { ...p, stream } : p));

          // If this is the teacher's track being updated while sharing, also
          // set screenStream immediately. This handles the case where the
          // SCREEN_SHARE_STATE broadcast arrived first (setting isScreenSharing)
          // and now we're getting the actual updated track from WebRTC.
          if (!isTeacher) {
            const teacherP = updated.find((p) => p.id === peerId && p.role === 'teacher');
            if (teacherP?.isScreenSharing) {
              setScreenStream(stream);
            }
          }

          return updated;
        });
      },
      onPeerDisconnected: (peerId) => {
        setParticipants((prev) => prev.filter((p) => p.id !== peerId));
      },
      onDataReceived: (data) => {
        const msg = data as { type: string };
        if (msg && msg.type === 'CLASSROOM_ENDED' && !isTeacher) {
          peerService.disconnect();
          setEndedByTeacherNoticeVisible(true);
        }
      },
      onScreenShareStopped: () => {
        // Teacher's screen share ended (via browser 'Stop sharing' button)
        setScreenStream(null);
        setIsScreenSharing(false);
        setParticipants((prev) =>
          prev.map((p) => (p.id === currentUser.id ? { ...p, isScreenSharing: false } : p))
        );

        const channelName = `room_status_${roomCode}`;
        const channel = supabase.channel(channelName);
        channel.send({
          type: 'broadcast',
          event: 'SCREEN_SHARE_STATE',
          payload: {
            userId: currentUser.id,
            isSharing: false,
          },
        });
      },
    });

    peerService.startLocalMedia(true, true).then((stream) => {
      if (stream) {
        // Enforce muted and video off defaults at WebRTC level
        peerService.toggleAudio(false);
        peerService.toggleVideo(false);
      }
    });

    return () => {
      peerService.disconnect();
    };
  }, [currentUser, isTeacher, waitingStatus]);

  // Sync peer presence and state changes inside classroom
  useEffect(() => {
    if (waitingStatus !== 'approved') return;

    const channelName = `room_status_${roomCode}`;
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'PEER_PRESENCE' }, ({ payload }) => {
        if (payload.userId === currentUser.id) return;

        setParticipants((prev) => {
          const exists = prev.some((p) => p.id === payload.connectionId);
          if (exists) return prev;
          return [
            ...prev,
            {
              id: payload.connectionId,
              userName: payload.userName,
              role: payload.role,
              isMicOn: payload.isMicOn,
              isCamOn: payload.isCamOn,
              isScreenSharing: payload.isScreenSharing || false,
              canDraw:
                payload.role === 'teacher'
                  ? true
                  : permissionState.globalCanDraw ||
                    permissionState.studentPermissions[payload.userId] === true,
            },
          ];
        });

        // Lexicographical ordering prevents duplicate glare calls
        if (peerService.getConnectionId < payload.connectionId) {
          peerService.callPeer(payload.connectionId);
        }
      })
      .on('broadcast', { event: 'PEER_UPDATE' }, ({ payload }) => {
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === payload.connectionId
              ? { ...p, isMicOn: payload.isMicOn, isCamOn: payload.isCamOn }
              : p
          )
        );
      })
      .on('broadcast', { event: 'SCREEN_SHARE_STATE' }, ({ payload }) => {
        // Update isScreenSharing flag on teacher participant
        setParticipants((prev) =>
          prev.map((p) =>
            p.role === 'teacher'
              ? { ...p, isScreenSharing: payload.isSharing }
              : p
          )
        );

        // For students: when teacher starts sharing, we need to set the
        // screenStream. The teacher's participant already has a stream
        // (from onRemoteTrackUpdated). When sharing stops, clear it.
        if (!isTeacher) {
          if (payload.isSharing) {
            // Use a small delay to ensure onRemoteTrackUpdated has fired
            // with the screen share track before we read the stream
            setTimeout(() => {
              setParticipants((current) => {
                const teacher = current.find((p) => p.role === 'teacher');
                if (teacher?.stream) {
                  setScreenStream(teacher.stream);
                }
                return current;
              });
            }, 300);
          } else {
            setScreenStream(null);
          }
        }
      })
      .on('broadcast', { event: 'PEER_LEAVE' }, ({ payload }) => {
        setParticipants((prev) => prev.filter((p) => p.id !== payload.connectionId));
      })
      .subscribe();

    const broadcastPresence = () => {
      channel.send({
        type: 'broadcast',
        event: 'PEER_PRESENCE',
        payload: {
          userId: currentUser.id,
          userName: currentUser.fullName,
          role: currentUser.role,
          connectionId: peerService.getConnectionId,
          isMicOn,
          isCamOn,
          isScreenSharing,
        },
      });
    };

    broadcastPresence();
    const interval = setInterval(broadcastPresence, 3000);

    return () => {
      channel.send({
        type: 'broadcast',
        event: 'PEER_LEAVE',
        payload: {
          connectionId: peerService.getConnectionId,
        },
      });
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [waitingStatus, roomCode, currentUser, isMicOn, isCamOn, isScreenSharing, permissionState]);

  const handleToggleMic = () => {
    const nextState = !isMicOn;
    setIsMicOn(nextState);
    peerService.toggleAudio(nextState);

    const channelName = `room_status_${roomCode}`;
    const channel = supabase.channel(channelName);
    channel.send({
      type: 'broadcast',
      event: 'PEER_UPDATE',
      payload: {
        userId: currentUser.id,
        connectionId: peerService.getConnectionId,
        isMicOn: nextState,
        isCamOn,
      },
    });
  };

  const handleToggleCam = () => {
    const nextState = !isCamOn;
    setIsCamOn(nextState);
    peerService.toggleVideo(nextState);

    const channelName = `room_status_${roomCode}`;
    const channel = supabase.channel(channelName);
    channel.send({
      type: 'broadcast',
      event: 'PEER_UPDATE',
      payload: {
        userId: currentUser.id,
        connectionId: peerService.getConnectionId,
        isMicOn,
        isCamOn: nextState,
      },
    });
  };

  const handleToggleScreenShare = async () => {
    if (!isTeacher) return;

    if (!isScreenSharing) {
      const stream = await peerService.startScreenShare();
      if (stream) {
        setScreenStream(stream);
        setIsScreenSharing(true);

        // Set screen sharing status locally
        setParticipants((prev) =>
          prev.map((p) => (p.id === currentUser.id ? { ...p, isScreenSharing: true } : p))
        );

        // Broadcast to other peers
        const channelName = `room_status_${roomCode}`;
        const channel = supabase.channel(channelName);
        channel.send({
          type: 'broadcast',
          event: 'SCREEN_SHARE_STATE',
          payload: {
            userId: currentUser.id,
            isSharing: true,
          },
        });
      }
    } else {
      // stopScreenShare() already restores original camera track and
      // fires onScreenShareStopped callback which handles cleanup +
      // broadcasting SCREEN_SHARE_STATE with isSharing: false
      peerService.stopScreenShare();
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

  const handleApproveStudent = (student: { userId: string; userName: string; connectionId: string }) => {
    setKnockingStudents((prev) => prev.filter((s) => s.userId !== student.userId));

    const channelName = `room_status_${roomCode}`;
    const channel = supabase.channel(channelName);
    channel.send({
      type: 'broadcast',
      event: 'APPROVE',
      payload: {
        targetUserId: student.userId,
        targetConnectionId: student.connectionId,
      },
    });

    peerService.callPeer(student.connectionId);
  };

  const handleDeclineStudent = (student: { userId: string; userName: string; connectionId: string }) => {
    setKnockingStudents((prev) => prev.filter((s) => s.userId !== student.userId));

    const channelName = `room_status_${roomCode}`;
    const channel = supabase.channel(channelName);
    channel.send({
      type: 'broadcast',
      event: 'DECLINE',
      payload: {
        targetUserId: student.userId,
      },
    });
  };

  // Render Waiting Screen for students awaiting teacher approval
  if (waitingStatus === 'waiting') {
    return (
      <View style={styles.waitingContainer}>
        <View style={styles.waitingCard}>
          <RefreshCw size={48} color={COLORS.primary} style={{ animation: 'spin 2s linear infinite' } as any} />
          <Text style={styles.waitingTitle}>Bạn đang ở phòng chờ</Text>
          <Text style={styles.waitingSub}>Vui lòng đợi giáo viên duyệt vào lớp...</Text>
        </View>
      </View>
    );
  }

  // Render Rejection Screen for declined student requests
  if (waitingStatus === 'declined') {
    return (
      <View style={styles.waitingContainer}>
        <View style={styles.waitingCard}>
          <Lock size={48} color={COLORS.danger} />
          <Text style={styles.waitingTitle}>Yêu cầu bị từ chối</Text>
          <Text style={styles.waitingSub}>Yêu cầu vào lớp của bạn đã bị giáo viên từ chối.</Text>
          <TouchableOpacity onPress={onLeaveRoom} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Trở Về Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.roomContainer}>
      <Header
        userName={currentUser.fullName}
        role={currentUser.role}
        roomTitle={`${roomTitle} (${roomCode})`}
        onLogout={() => setExitModalVisible(true)}
        participants={participants}
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
          canDraw:
            p.role === 'teacher'
              ? true
              : permissionState.globalCanDraw || permissionState.studentPermissions[p.id] === true,
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

      {/* Teacher Action Menu: Student Access Request Overlay */}
      {isTeacher && knockingStudents.length > 0 && (
        <View style={styles.knockPopup}>
          <Text style={styles.knockPopupTitle}>Học sinh yêu cầu vào lớp</Text>
          {knockingStudents.map((student) => (
            <View key={student.userId} style={styles.knockRow}>
              <Text style={styles.knockName} numberOfLines={1}>
                {student.userName}
              </Text>
              <View style={styles.knockActions}>
                <TouchableOpacity
                  onPress={() => handleApproveStudent(student)}
                  style={[styles.knockBtn, styles.approveBtn]}
                >
                  <Text style={styles.knockBtnText}>Đồng ý</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeclineStudent(student)}
                  style={[styles.knockBtn, styles.declineBtn]}
                >
                  <Text style={styles.knockBtnText}>Từ chối</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

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
  waitingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  waitingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  waitingTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textDark,
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  waitingSub: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray600,
    textAlign: 'center',
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 10,
  },
  backBtnText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 15,
  },
  knockPopup: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    width: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999,
  },
  knockPopupTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textDark,
    marginBottom: 12,
  },
  knockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  knockName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    flex: 1,
    marginRight: 8,
  },
  knockActions: {
    flexDirection: 'row',
    gap: 6,
  },
  knockBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  approveBtn: {
    backgroundColor: COLORS.success,
  },
  declineBtn: {
    backgroundColor: COLORS.danger,
  },
  knockBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
});
