import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Mic, MicOff, VideoOff, Pencil, PencilOff, ShieldCheck, User, Maximize, Minimize } from 'lucide-react';
import { COLORS, ICON_SIZES } from '../../constants';
import type { CanvasStroke, StreamParticipant } from '../../types';
import { InteractiveCanvas } from '../canvas/InteractiveCanvas';

export interface VideoGridProps {
  containerWidth: number;
  containerHeight: number;
  participants: StreamParticipant[];
  screenStream?: MediaStream | null;
  strokes: CanvasStroke[];
  onAddStroke: (stroke: CanvasStroke) => void;
  onRemoveStroke: (strokeId: string) => void;
  onClearAll: () => void;
  userId: string;
  userName: string;
  isTeacher: boolean;
  canDraw: boolean;
  onToggleStudentDraw?: (studentId: string, currentCanDraw: boolean) => void;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  containerWidth,
  containerHeight,
  participants,
  screenStream,
  strokes,
  onAddStroke,
  onRemoveStroke,
  onClearAll,
  userId,
  userName,
  isTeacher,
  canDraw,
  onToggleStudentDraw,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      if (isCurrentlyFullscreen) {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }
    };

    const handleResize = () => {
      if (document.fullscreenElement) {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error('Error entering fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const activeWidth = isFullscreen ? windowSize.width : containerWidth;
  const activeHeight = isFullscreen ? windowSize.height : containerHeight;

  return (
    <div
      ref={containerRef}
      style={{
        width: isFullscreen ? '100vw' : '100%',
        height: isFullscreen ? '100vh' : '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isFullscreen ? '#F8FAFC' : 'transparent',
        position: 'relative',
      }}
    >
      <View style={[styles.outerLayout, isFullscreen && { padding: 0, gap: 0 }]}>
        {/* Central Container with Mobile-Safe Screen Share Video or Interactive Whiteboard */}
        <View
          style={[
            styles.viewportContainer16x9,
            { width: activeWidth, height: activeHeight },
            isFullscreen && { borderWidth: 0, borderRadius: 0 },
          ]}
        >
          {/* Background Screen Share Stream or Interactive Whiteboard */}
          {screenStream ? (
            <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
              <video
                key={screenStream.id}
                ref={(ref) => {
                  if (ref && screenStream && ref.srcObject !== screenStream) {
                    ref.srcObject = screenStream;
                    ref.play().catch((e) => console.warn('Screen video play error', e));
                  }
                }}
                onLoadedMetadata={(e) => {
                  const video = e.currentTarget;
                  video.play().catch((err) => console.warn('Screen video play error on metadata', err));
                }}
                style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }}
                autoPlay
                playsInline
                muted
              />
            </div>
          ) : (
            <View style={styles.whiteboardBg} />
          )}

          {/* Realtime Canvas Overlay (16:9 Normalized Coords) */}
          <InteractiveCanvas
            containerWidth={activeWidth}
            containerHeight={activeHeight}
            strokes={strokes}
            onAddStroke={onAddStroke}
            onRemoveStroke={onRemoveStroke}
            onClearAll={onClearAll}
            userId={userId}
            userName={userName}
            isTeacher={isTeacher}
            canDraw={canDraw}
          />

          {/* Fullscreen Toggle Button */}
          <TouchableOpacity
            onPress={toggleFullscreen}
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              zIndex: 999,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              padding: 10,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: COLORS.gray200,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            }}
          >
            {isFullscreen ? (
              <Minimize size={ICON_SIZES.md} color={COLORS.textDark} />
            ) : (
              <Maximize size={ICON_SIZES.md} color={COLORS.textDark} />
            )}
          </TouchableOpacity>

          {/* Minimalist Floated Videos inside Full Screen Mode */}
          {isFullscreen && (
            <div
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                zIndex: 1000,
                pointerEvents: 'auto',
              }}
            >
              {participants
                .filter((p) => p.role === 'teacher' || p.id === userId || p.userName === userName)
                .map((p) => (
                  <div key={p.id} style={{ transform: 'scale(0.85)', transformOrigin: 'top right' }}>
                    <ParticipantCard
                      participant={p}
                      isSelf={p.id === userId || p.userName === userName}
                      isTeacherOwner={isTeacher}
                      onToggleStudentDraw={onToggleStudentDraw}
                    />
                  </div>
                ))}
            </div>
          )}
        </View>

        {/* Regular Participant Video Grid Sidebar (Hidden in Full Screen) */}
        {!isFullscreen && (
          <View style={styles.participantsRail}>
            {participants.map((p) => (
              <ParticipantCard
                key={p.id}
                participant={p}
                isSelf={p.id === userId || p.userName === userName}
                isTeacherOwner={isTeacher}
                onToggleStudentDraw={onToggleStudentDraw}
              />
            ))}
          </View>
        )}
      </View>
    </div>
  );
};

const ParticipantCard: React.FC<{
  participant: StreamParticipant;
  isSelf: boolean;
  isTeacherOwner: boolean;
  onToggleStudentDraw?: (studentId: string, currentCanDraw: boolean) => void;
}> = ({ participant: p, isSelf, isTeacherOwner, onToggleStudentDraw }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && p.stream && p.isCamOn && !p.isScreenSharing) {
      if (videoRef.current.srcObject !== p.stream) {
        videoRef.current.srcObject = p.stream;
        videoRef.current.play().catch((e) => console.warn('Video play warning', e));
      }
    }
  }, [p.stream, p.isCamOn, p.isScreenSharing]);

  return (
    <View style={styles.participantCard}>
      <View style={styles.participantAvatarArea}>
        {/* Version 4.0: Mobile-safe Video Feed with autoPlay playsInline muted */}
        {p.isCamOn && p.stream && !p.isScreenSharing ? (
          <div style={{ width: 64, height: 64, borderRadius: 20, overflow: 'hidden', backgroundColor: '#000' }}>
            <video
              ref={videoRef}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              autoPlay
              playsInline
              muted={isSelf}
            />
          </div>
        ) : (
          <View
            style={[
              styles.avatarCircle,
              { backgroundColor: p.role === 'teacher' ? COLORS.purple : COLORS.primary },
            ]}
          >
            {p.role === 'teacher' ? (
              <ShieldCheck size={ICON_SIZES.md} color={COLORS.white} />
            ) : (
              <User size={ICON_SIZES.md} color={COLORS.white} />
            )}
          </View>
        )}

        {/* Status Indicators */}
        <View style={styles.statusBadges}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: p.isMicOn ? COLORS.success : COLORS.danger },
            ]}
          >
            {p.isMicOn ? (
              <Mic size={12} color={COLORS.white} />
            ) : (
              <MicOff size={12} color={COLORS.white} />
            )}
          </View>
          {!p.isCamOn && (
            <View style={[styles.statusDot, { backgroundColor: COLORS.danger }]}>
              <VideoOff size={12} color={COLORS.white} />
            </View>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4, width: '100%', paddingHorizontal: 4 }}>
        <Text style={[styles.participantName, { flexShrink: 1 }]} numberOfLines={1}>
          {p.userName} {isSelf ? '(Bạn)' : ''}
        </Text>
        {p.role === 'student' && (
          <View style={{ flexShrink: 0, marginLeft: 2 }}>
            {p.canDraw ? (
              <Pencil size={12} color={COLORS.success} />
            ) : (
              <PencilOff size={12} color={COLORS.gray400} />
            )}
          </View>
        )}
      </View>

      {/* Individual Grant Drawing Toggle (Teacher only) */}
      {isTeacherOwner && p.role === 'student' && onToggleStudentDraw && (
        <TouchableOpacity
          onPress={() => onToggleStudentDraw(p.id, p.canDraw)}
          style={[
            styles.drawToggleBtn,
            p.canDraw ? styles.drawToggleActive : styles.drawToggleInactive,
          ]}
        >
          <Pencil size={12} color={p.canDraw ? COLORS.white : COLORS.gray600} />
          <Text style={[styles.drawToggleText, p.canDraw && { color: COLORS.white }]}>
            {p.canDraw ? 'Vẽ: ON' : 'Vẽ: OFF'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outerLayout: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 16,
  },
  viewportContainer16x9: {
    position: 'relative',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  whiteboardBg: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  watermark: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  watermarkText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 1.5,
  },
  participantsRail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  participantCard: {
    width: 120,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  participantAvatarArea: {
    position: 'relative',
    marginBottom: 6,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadges: {
    position: 'absolute',
    bottom: -4,
    right: -6,
    flexDirection: 'row',
    gap: 2,
  },
  statusDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark,
    textAlign: 'center',
  },
  drawToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 6,
  },
  drawToggleActive: {
    backgroundColor: COLORS.success,
  },
  drawToggleInactive: {
    backgroundColor: COLORS.gray100,
  },
  drawToggleText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.gray600,
  },
});
