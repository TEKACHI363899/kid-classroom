import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Lock, RefreshCw, PhoneOff } from 'lucide-react';
import { COLORS, ICON_SIZES } from '../constants';
import type { UserProfile, StreamParticipant } from '../types';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useCanvasSync } from '../hooks/useCanvasSync';
import { peerService } from '../services/peerService';
import { livekitService } from '../services/livekitService';
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
  const currentUser = useMemo<UserProfile>(() => {
    return user || {
      id: `std-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fullName: 'Học Sinh Thân Yêu',
      role: 'student',
    };
  }, [user]);

  const isTeacher = currentUser.role === 'teacher';
  const { container16x9, isMobile } = useResponsiveLayout();

  // Media States (Default to OFF)
  const [isMicOn, setIsMicOn] = useState<boolean>(false);
  const [isCamOn, setIsCamOn] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [useLivekit, setUseLivekit] = useState<boolean>(false);

  const isMicOnRef = useRef<boolean>(isMicOn);
  isMicOnRef.current = isMicOn;
  const isCamOnRef = useRef<boolean>(isCamOn);
  isCamOnRef.current = isCamOn;
  const isScreenSharingRef = useRef<boolean>(isScreenSharing);
  isScreenSharingRef.current = isScreenSharing;
  const useLivekitRef = useRef<boolean>(useLivekit);
  useLivekitRef.current = useLivekit;

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
  const waitingStatusRef = useRef<'waiting' | 'approved' | 'declined'>(waitingStatus);
  waitingStatusRef.current = waitingStatus;
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
            userId: currentUser.id,
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

  // Ref for permission state to avoid stale closures in unified channel listeners
  const permissionStateRef = useRef<typeof permissionState>(permissionState);
  permissionStateRef.current = permissionState;

  // Unified Room Status Realtime Channel (Handles Knock, Approve, Decline, End Room, and Peer Presence)
  useEffect(() => {
    if (!roomCode) return;

    const channelName = `room_status_${roomCode}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    // 1. CLASSROOM_ENDED (for students)
    channel.on('broadcast', { event: 'CLASSROOM_ENDED' }, () => {
      if (!isTeacher) {
        livekitService.disconnect();
        peerService.disconnect();
        setEndedByTeacherNoticeVisible(true);
      }
    });

    // 2. KNOCK (for teachers)
    channel.on('broadcast', { event: 'KNOCK' }, ({ payload }) => {
      if (isTeacher) {
        setKnockingStudents((prev) => {
          if (prev.some((s) => s.userId === payload.userId)) return prev;
          return [...prev, payload];
        });
      }
    });

    // 3. APPROVE (for students)
    channel.on('broadcast', { event: 'APPROVE' }, ({ payload }) => {
      if (!isTeacher && payload.targetUserId === currentUser.id) {
        setWaitingStatus('approved');
      }
    });

    // 4. DECLINE (for students)
    channel.on('broadcast', { event: 'DECLINE' }, ({ payload }) => {
      if (!isTeacher && payload.targetUserId === currentUser.id) {
        setWaitingStatus('declined');
      }
    });

    // 5. PEER_PRESENCE (when approved or teacher)
    channel.on('broadcast', { event: 'PEER_PRESENCE' }, ({ payload }) => {
      if (waitingStatusRef.current !== 'approved') return;
      if (payload.userId === currentUser.id) return;

      setParticipants((prev) => {
        const cleaned = prev.filter((p) => p.userId !== payload.userId);
        const exists = cleaned.some((p) => p.id === payload.connectionId);
        if (exists) return cleaned;

        if (!useLivekitRef.current && isTeacher && isScreenSharingRef.current) {
          peerService.callScreenToPeer(payload.connectionId);
        }

        return [
          ...cleaned,
          {
            id: payload.connectionId,
            userId: payload.userId,
            userName: payload.userName,
            role: payload.role,
            isMicOn: payload.isMicOn,
            isCamOn: payload.isCamOn,
            isScreenSharing: payload.isScreenSharing || false,
            canDraw:
              payload.role === 'teacher'
                ? true
                : permissionStateRef.current.globalCanDraw ||
                  permissionStateRef.current.studentPermissions[payload.userId] === true,
          },
        ];
      });

      if (!useLivekitRef.current && peerService.getConnectionId < payload.connectionId) {
        peerService.callPeer(payload.connectionId);
      }
    });

    // 6. PEER_UPDATE (when approved or teacher)
    channel.on('broadcast', { event: 'PEER_UPDATE' }, ({ payload }) => {
      if (waitingStatusRef.current !== 'approved') return;
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === payload.connectionId || p.userId === payload.userId
            ? { ...p, isMicOn: payload.isMicOn, isCamOn: payload.isCamOn }
            : p
        )
      );
    });

    // 7. SCREEN_SHARE_STATE (when approved or teacher)
    channel.on('broadcast', { event: 'SCREEN_SHARE_STATE' }, ({ payload }) => {
      if (waitingStatusRef.current !== 'approved') return;
      setParticipants((prev) =>
        prev.map((p) =>
          p.role === 'teacher'
            ? { ...p, isScreenSharing: payload.isSharing }
            : p
        )
      );

      if (!isTeacher && !payload.isSharing) {
        setScreenStream(null);
      }
    });

    // 8. PEER_LEAVE (when approved or teacher)
    channel.on('broadcast', { event: 'PEER_LEAVE' }, ({ payload }) => {
      if (waitingStatusRef.current !== 'approved') return;
      setParticipants((prev) =>
        prev.filter((p) => p.id !== payload.connectionId && p.userId !== payload.connectionId)
      );
    });

    // Subscribe to the channel
    channel.subscribe();

    // Start presence broadcasting interval if approved or teacher
    let presenceInterval: ReturnType<typeof setInterval> | null = null;
    if (waitingStatus === 'approved') {
      const broadcastPresence = () => {
        channel.send({
          type: 'broadcast',
          event: 'PEER_PRESENCE',
          payload: {
            userId: currentUser.id,
            userName: currentUser.fullName,
            role: currentUser.role,
            connectionId: useLivekitRef.current ? currentUser.id : peerService.getConnectionId,
            isMicOn: isMicOnRef.current,
            isCamOn: isCamOnRef.current,
            isScreenSharing: isScreenSharingRef.current,
          },
        });
      };

      broadcastPresence();
      presenceInterval = setInterval(broadcastPresence, 3000);
    }

    return () => {
      if (presenceInterval) {
        clearInterval(presenceInterval);
      }

      if (waitingStatusRef.current === 'approved') {
        channel.send({
          type: 'broadcast',
          event: 'PEER_LEAVE',
          payload: {
            connectionId: useLivekitRef.current ? currentUser.id : peerService.getConnectionId,
          },
        });
      }

      supabase.removeChannel(channel);
    };
  }, [roomCode, isTeacher, currentUser, waitingStatus]);

  // Student waiting room: KNOCK sender
  useEffect(() => {
    if (isTeacher || waitingStatus !== 'waiting') return;

    const channelName = `room_status_${roomCode}`;
    const channel = supabase.channel(channelName);

    const sendKnock = () => {
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

    // Send immediately and then every 3 seconds
    sendKnock();
    const interval = setInterval(sendKnock, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [isTeacher, waitingStatus, roomCode, currentUser]);

  // Initialize Media Streams: LiveKit (SFU) with PeerJS (Mesh) Fallback
  useEffect(() => {
    if (waitingStatus !== 'approved') return;

    let isLivekitConnected = false;

    const initializePeerJS = () => {
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
        onRemoteScreenStream: (stream) => {
          setScreenStream((prev) => (prev?.id === stream.id ? prev : stream));
        },
        onRemoteScreenStreamEnded: () => {
          setScreenStream(null);
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
        onNetworkQualityChange: (peerId, status) => {
          if (status === 'poor') {
            console.warn(`Connection to ${peerId} is poor.`);
            setIsCamOn((currentCamState) => {
              if (currentCamState) {
                alert("Ket noi mang yeu! Tu dong tat camera de toi uu bang thong va bao toan am thanh.");
                peerService.toggleVideo(false);

                // Broadcast camera update
                const channelName = `room_status_${roomCode}`;
                const channel = supabase.channel(channelName);
                channel.send({
                  type: 'broadcast',
                  event: 'PEER_UPDATE',
                  payload: {
                    userId: currentUser.id,
                    connectionId: peerService.getConnectionId,
                    isMicOn: isMicOnRef.current,
                    isCamOn: false,
                  },
                }).catch((e) => console.warn('Broadcast update error', e));

                return false;
              }
              return currentCamState;
            });
          }
        },
        onScreenShareStopped: () => {
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
          peerService.toggleAudio(false);
          peerService.toggleVideo(false);
        }
      });
    };

    const initConnection = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('livekit-token', {
          body: {
            roomCode,
            userId: currentUser.id,
            userName: currentUser.fullName,
          },
        });

        if (error || !data?.token) {
          throw new Error('No LiveKit token available');
        }

        const success = await livekitService.initialize(data.livekitUrl, data.token, {
          onConnectionStateChange: (state) => {
            setConnectionStatus(state === 'connected' ? 'connected' : 'connecting');
          },
          onLocalStreamStarted: (stream) => {
            setParticipants((prev) =>
              prev.map((p) => (p.id === currentUser.id ? { ...p, stream } : p))
            );
          },
          onRemoteTrackSubscribed: (track, publication, participant) => {
            const stream = new MediaStream([track.mediaStreamTrack]);
            const peerId = participant.identity;

            if (publication.source === 'screen_share') {
              setScreenStream(stream);
            } else {
              setParticipants((prev) =>
                prev.map((p) => (p.userId === peerId || p.id === peerId ? { ...p, stream } : p))
              );
            }
          },
          onRemoteTrackUnsubscribed: (_track, publication, participant) => {
            if (publication.source === 'screen_share') {
              setScreenStream(null);
            } else {
              const peerId = participant.identity;
              setParticipants((prev) =>
                prev.map((p) => (p.userId === peerId || p.id === peerId ? { ...p, stream: undefined } : p))
              );
            }
          },
          onParticipantDisconnected: (participant) => {
            const peerId = participant.identity;
            setParticipants((prev) => prev.filter((p) => p.userId !== peerId && p.id !== peerId));
          },
          onScreenShareStopped: () => {
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

        if (success) {
          setUseLivekit(true);
          isLivekitConnected = true;
          await livekitService.startLocalMedia(true, true);
          // Mute and disable video tracks initially to match UI states
          livekitService.toggleAudio(false);
          livekitService.toggleVideo(false);
        } else {
          throw new Error('LiveKit initialize returned false');
        }
      } catch (err) {
        console.warn('LiveKit init failed, falling back to PeerJS Mesh Mode:', err);
        setUseLivekit(false);
        initializePeerJS();
      }
    };

    initConnection();

    return () => {
      if (isLivekitConnected) {
        livekitService.disconnect();
      } else {
        peerService.disconnect();
      }
    };
  }, [currentUser, isTeacher, waitingStatus, roomCode]);

  const handleToggleMic = useCallback(() => {
    const nextState = !isMicOn;
    setIsMicOn(nextState);
    if (useLivekit) {
      livekitService.toggleAudio(nextState);
    } else {
      peerService.toggleAudio(nextState);
    }

    const channelName = `room_status_${roomCode}`;
    const channel = supabase.channel(channelName);
    channel.send({
      type: 'broadcast',
      event: 'PEER_UPDATE',
      payload: {
        userId: currentUser.id,
        connectionId: useLivekit ? currentUser.id : peerService.getConnectionId,
        isMicOn: nextState,
        isCamOn,
      },
    });
  }, [isMicOn, isCamOn, useLivekit, roomCode, currentUser]);

  const handleToggleCam = useCallback(() => {
    const nextState = !isCamOn;
    setIsCamOn(nextState);
    if (useLivekit) {
      livekitService.toggleVideo(nextState);
    } else {
      peerService.toggleVideo(nextState);
    }

    const channelName = `room_status_${roomCode}`;
    const channel = supabase.channel(channelName);
    channel.send({
      type: 'broadcast',
      event: 'PEER_UPDATE',
      payload: {
        userId: currentUser.id,
        connectionId: useLivekit ? currentUser.id : peerService.getConnectionId,
        isMicOn,
        isCamOn: nextState,
      },
    });
  }, [isMicOn, isCamOn, useLivekit, roomCode, currentUser]);

  const handleToggleScreenShare = useCallback(async () => {
    if (!isTeacher) return;

    if (!isScreenSharing) {
      let stream: MediaStream | null = null;
      if (useLivekit) {
        stream = await livekitService.startScreenShare();
      } else {
        const studentConnectionIds = participants
          .filter((p) => p.role === 'student')
          .map((p) => p.id);
        stream = await peerService.startScreenShare(studentConnectionIds);
      }

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
      if (useLivekit) {
        await livekitService.stopScreenShare();
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
      } else {
        peerService.stopScreenShare();
      }
    }
  }, [isTeacher, isScreenSharing, useLivekit, participants, currentUser, roomCode]);

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
    livekitService.disconnect();
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
    <View style={[styles.roomContainer, isMobile && { paddingBottom: 56 }]}>
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
      <View style={{ flex: 1, width: '100%', minHeight: 0, justifyContent: 'center', alignItems: 'center' }}>
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
      </View>

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
