import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Mic, MicOff, VideoOff, Pencil, ShieldCheck, User } from 'lucide-react';
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
  onClearAll,
  userId,
  userName,
  isTeacher,
  canDraw,
  onToggleStudentDraw,
}) => {
  return (
    <View style={styles.outerLayout}>
      {/* 16:9 Central Interactive Container */}
      <View
        style={[
          styles.viewportContainer16x9,
          { width: containerWidth, height: containerHeight },
        ]}
      >
        {/* Background Stream or Interactive Whiteboard */}
        {screenStream ? (
          <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
            <video
              ref={(ref) => {
                if (ref && screenStream && ref.srcObject !== screenStream) {
                  ref.srcObject = screenStream;
                  ref.play().catch((e) => console.warn('Screen video play err', e));
                }
              }}
              style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }}
              autoPlay
              playsInline
              muted
            />
          </div>
        ) : (
          <View style={styles.whiteboardBg}>
            <View style={styles.watermark}>
              <Text style={styles.watermarkText}>BẢNG TRẮNG TƯƠNG TÁC LỚP HỌC</Text>
            </View>
          </View>
        )}

        {/* Realtime Canvas Overlay (16:9 Normalized Coords) */}
        <InteractiveCanvas
          containerWidth={containerWidth}
          containerHeight={containerHeight}
          strokes={strokes}
          onAddStroke={onAddStroke}
          onClearAll={onClearAll}
          userId={userId}
          userName={userName}
          isTeacher={isTeacher}
          canDraw={canDraw}
        />
      </View>

      {/* Participant Video Grid Sidebar / Bottom Bar */}
      <View style={styles.participantsRail}>
        {participants.map((p) => (
          <View key={p.id} style={styles.participantCard}>
            <View style={styles.participantAvatarArea}>
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

            <Text style={styles.participantName} numberOfLines={1}>
              {p.name} {p.id === userId ? '(Bạn)' : ''}
            </Text>

            {/* Individual Grant Drawing Toggle (Teacher only) */}
            {isTeacher && p.role === 'student' && onToggleStudentDraw && (
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
        ))}
      </View>
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
