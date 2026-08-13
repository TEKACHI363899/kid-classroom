import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Mic, MicOff, Video, VideoOff, Pencil, PencilOff, ShieldCheck, User, Maximize, Minimize } from 'lucide-react';
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
  isMicOn?: boolean;
  onToggleMic?: () => void;
  isCamOn?: boolean;
  onToggleCam?: () => void;
  elapsedSeconds?: number;
  pages: import('../../types').CanvasPage[];
  activePageId: string;
  onChangePage: (pageId: string) => void;
  onAddPage: () => void;
  onRemovePage: (pageId: string) => void;
}

const ScreenVideoView: React.FC<{ stream: MediaStream }> = ({ stream }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
        video.play().catch((err) => console.warn('Screen video play error', err));
      }
    } else {
      video.srcObject = null;
    }

    return () => {
      if (video) {
        video.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, borderRadius: 20, overflow: 'hidden' }}>
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }}
        autoPlay
        playsInline
        muted
      />
    </div>
  );
};

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
  isMicOn = false,
  onToggleMic = () => {},
  isCamOn = false,
  onToggleCam = () => {},
  elapsedSeconds = 0,
  pages,
  activePageId,
  onChangePage,
  onAddPage,
  onRemovePage,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
  });

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  const containerRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, time: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const dx = Math.abs(e.clientX - dragStartRef.current.x);
    const dy = Math.abs(e.clientY - dragStartRef.current.y);
    const dt = Date.now() - dragStartRef.current.time;

    // Tap/Click threshold: <5px drag distance, <300ms press duration
    if (dx < 5 && dy < 5 && dt < 300) {
      const target = e.target as HTMLElement;
      // Do not toggle if click is inside the floating controls panel or any button/input
      if (controlsRef.current && (controlsRef.current === target || controlsRef.current.contains(target))) {
        return;
      }
      // Do not toggle if click is inside the canvas toolbar or the floating text card
      if (
        target.closest('#canvas-toolbar') || 
        target.closest('[data-floating-card]')
      ) {
        return;
      }
      if (
        target.closest('button') || 
        target.closest('a') || 
        target.closest('input') || 
        target.closest('[role="button"]')
      ) {
        return;
      }
      setShowControls((prev) => !prev);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      setShowControls(false); // Reset/hide controls initially in fullscreen

      if (isCurrentlyFullscreen) {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });

        // Auto rotate and lock screen orientation to landscape on mobile devices
        const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || 
                              ('ontouchstart' in window && window.innerWidth < 1024);
        if (isMobileDevice && window.screen && window.screen.orientation && typeof window.screen.orientation.lock === 'function') {
          window.screen.orientation.lock('landscape').catch((err) => {
            console.warn('Orientation lock failed:', err);
          });
        }
      } else {
        // Unlock screen orientation when exiting fullscreen
        if (window.screen && window.screen.orientation && typeof window.screen.orientation.unlock === 'function') {
          try {
            window.screen.orientation.unlock();
          } catch (err) {
            console.warn('Orientation unlock failed:', err);
          }
        }
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
      onPointerDown={isFullscreen ? handlePointerDown : undefined}
      onPointerUp={isFullscreen ? handlePointerUp : undefined}
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
        {/* Regular Participant Video Grid Sidebar (Left Side, Hidden in Full Screen) */}
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

        {/* Whiteboard card — overflow visible so vertical toolbar on right can show */}
        <View
          style={[
            styles.viewportContainer16x9,
            { width: activeWidth, height: activeHeight },
            isFullscreen
              ? { borderWidth: 0, borderRadius: 0 }
              : {},
          ]}
        >
          {/* Background Screen Share Stream or Interactive Whiteboard */}
          <View style={[styles.whiteboardBg, { display: screenStream && activePageId === 'page-1' ? 'none' : 'flex' }]} />
          {screenStream && (
            <View style={{ display: activePageId === 'page-1' ? 'flex' : 'none', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
              <ScreenVideoView stream={screenStream} />
            </View>
          )}

          {/* Realtime Canvas Overlay — absolutely positioned inside whiteboard card */}
          <View style={{ position: 'absolute', top: 0, left: 0, width: activeWidth, height: activeHeight, overflow: 'visible' }}>
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
              isFullscreen={isFullscreen}
              showControls={showControls}
              pages={pages}
              activePageId={activePageId}
              onChangePage={onChangePage}
              onAddPage={onAddPage}
              onRemovePage={onRemovePage}
            />
          </View>

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
                bottom: 16,
                left: 16,
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
                  <div key={p.id} style={{ transform: 'scale(0.85)', transformOrigin: 'bottom left' }}>
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
      </View>

      {/* Floating Fullscreen Timer */}
      <div
        style={{
          position: 'absolute',
          top: isFullscreen && showControls ? 16 : -50,
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: isFullscreen && showControls ? 1 : 0,
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 1005,
          pointerEvents: 'none',
        }}
      >
        <View
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: 20,
            borderWidth: 1.5,
            borderColor: COLORS.primary,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
          } as any}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '800',
              color: COLORS.primary,
              fontFamily: 'monospace',
            }}
          >
            {formatTime(elapsedSeconds)}
          </Text>
        </View>
      </div>

      {/* Floating Fullscreen Controls Bar (Mic/Cam Toggle) */}
      <div
        ref={controlsRef as any}
        style={{
          position: 'absolute',
          bottom: isFullscreen && showControls ? 24 : -100,
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: isFullscreen && showControls ? 1 : 0,
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 24,
          padding: '10px 20px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
          zIndex: 1005,
          gap: 16,
          pointerEvents: isFullscreen && showControls ? 'auto' : 'none',
        }}
      >
        <TouchableOpacity
          onPress={onToggleMic}
          style={[styles.floatingControlBtn, !isMicOn && styles.btnDanger]}
        >
          {isMicOn ? (
            <Mic size={ICON_SIZES.md} color={COLORS.white} />
          ) : (
            <MicOff size={ICON_SIZES.md} color={COLORS.white} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onToggleCam}
          style={[styles.floatingControlBtn, !isCamOn && styles.btnDanger]}
        >
          {isCamOn ? (
            <Video size={ICON_SIZES.md} color={COLORS.white} />
          ) : (
            <VideoOff size={ICON_SIZES.md} color={COLORS.white} />
          )}
        </TouchableOpacity>
      </div>
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    const element = containerRef.current;
    if (element) {
      observer.observe(element);
    }
    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      if (isVisible && p.stream && p.isCamOn && !p.isScreenSharing) {
        if (video.srcObject !== p.stream) {
          video.srcObject = p.stream;
          video.play().catch((e) => console.warn('Video play warning', e));
        }
      } else {
        video.srcObject = null;
      }
    }

    const audio = audioRef.current;
    if (audio) {
      if (p.stream && !isSelf) {
        if (audio.srcObject !== p.stream) {
          audio.srcObject = p.stream;
          audio.play().catch((e) => console.warn('Audio play warning', e));
        }
      } else {
        audio.srcObject = null;
      }
    }

    return () => {
      if (video) {
        video.srcObject = null;
      }
      if (audio) {
        audio.srcObject = null;
      }
    };
  }, [p.stream, p.isCamOn, p.isScreenSharing, isVisible, isSelf]);

  useEffect(() => {
    if (!p.stream || !p.isMicOn) {
      setAudioLevel(0);
      return;
    }

    const audioTracks = p.stream.getAudioTracks();
    if (audioTracks.length === 0) {
      setAudioLevel(0);
      return;
    }

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.5;

    let source: MediaStreamAudioSourceNode | null = null;
    try {
      source = audioCtx.createMediaStreamSource(new MediaStream(audioTracks));
      source.connect(analyser);
    } catch (err) {
      console.warn('Cannot create media stream source', err);
      return;
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let intervalId: any;

    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      const level = Math.min(1, average / 100);
      
      setAudioLevel(prev => {
        if (Math.abs(prev - level) > 0.05) return level;
        return prev;
      });
    };

    intervalId = setInterval(updateLevel, 100);

    return () => {
      clearInterval(intervalId);
      source?.disconnect();
      if (audioCtx.state !== 'closed') {
        audioCtx.close().catch(console.warn);
      }
      setAudioLevel(0);
    };
  }, [p.stream, p.isMicOn]);

  const isSpeaking = audioLevel > 0.05;
  const glow = 10 + audioLevel * 15;
  const borderStyle = isSpeaking ? {
    borderColor: `rgba(76, 175, 80, ${0.5 + audioLevel/2})`,
    borderWidth: '3px',
    borderStyle: 'solid',
    boxShadow: `0 0 ${glow}px ${glow/3}px rgba(76, 175, 80, ${0.3 + audioLevel/2})`,
  } : {
    borderColor: 'transparent',
    borderWidth: '3px',
    borderStyle: 'solid',
    boxShadow: 'none',
  };

  return (
    <div ref={containerRef}>
      {!isSelf && <audio ref={audioRef} autoPlay playsInline />}
      <View style={styles.participantCard}>
      <View style={styles.participantAvatarArea}>
        {/* Version 4.0: Mobile-safe Video Feed with autoPlay playsInline muted */}
        {p.isCamOn && p.stream && !p.isScreenSharing ? (
          <div style={{ width: 117, height: 117, borderRadius: 26, overflow: 'hidden', backgroundColor: '#000', ...borderStyle, transition: 'all 0.1s ease-in-out', boxSizing: 'border-box' }}>
            <video
              ref={videoRef}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              autoPlay
              playsInline
              muted={true}
            />
          </div>
        ) : (
          <div
            style={{
              ...styles.avatarCircle,
              backgroundColor: p.role === 'teacher' ? COLORS.purple : COLORS.primary,
              ...borderStyle,
              transition: 'all 0.1s ease-in-out',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {p.role === 'teacher' ? (
              <ShieldCheck size={ICON_SIZES.md} color={COLORS.white} />
            ) : (
              <User size={ICON_SIZES.md} color={COLORS.white} />
            )}
          </div>
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
    </div>
  );
};

const styles = StyleSheet.create({
  outerLayout: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    gap: 8,
  },
  viewportContainer16x9: {
    position: 'relative',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1, // Mỏng hơn, giống Apple
    borderColor: COLORS.gray200,
    overflow: 'visible',
  },
  whiteboardBg: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    overflow: 'hidden',
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
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    justifyContent: 'flex-start',
    alignSelf: 'stretch',
    paddingTop: 8,
  },
  participantCard: {
    width: 156,
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
    width: 117,
    height: 117,
    borderRadius: 26,
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
  floatingControlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.success,
  },
  btnDanger: {
    backgroundColor: COLORS.danger,
  },
});
