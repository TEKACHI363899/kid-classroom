import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Video, Calendar, Sparkles, Smile } from 'lucide-react';
import { COLORS, ICON_SIZES } from '../constants';
import type { UserProfile, Classroom } from '../types';
import { Button } from '../components/common/Button';
import { getTeacherClassrooms } from '../services/storageService';

export interface StudentDashboardProps {
  user: UserProfile;
  onJoinRoom: (roomCode: string, title: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, onJoinRoom }) => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);

  useEffect(() => {
    setClassrooms(getTeacherClassrooms());
  }, []);

  const liveClass = classrooms.find((c) => c.status === 'live' || c.isActive);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.contentWrapper}>
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <View style={styles.avatarBadge}>
            <Smile size={ICON_SIZES.xl} color={COLORS.white} />
          </View>
          <View style={styles.welcomeTextGroup}>
            <Text style={styles.welcomeTitle}>Chào mừng em, {user.fullName}!</Text>
            <Text style={styles.welcomeSub}>
              Hôm nay em có bài học thú vị đang chờ đó. Hãy xem lịch học dưới đây và chọn bài học để tham gia nhé!
            </Text>
          </View>
        </View>

        {/* Featured Live Class (if available) */}
        {liveClass && (
          <View style={styles.featuredCard}>
            <View style={styles.featuredTag}>
              <Sparkles size={ICON_SIZES.sm} color={COLORS.white} />
              <Text style={styles.featuredTagText}>LỚP ĐANG DIỄN RA (LIVE)</Text>
            </View>

            <Text style={styles.featuredTitle}>{liveClass.title}</Text>
            <Text style={styles.featuredTeacher}>Giáo viên: Cô Nông Thị Tuyết</Text>

            <Button
              label="VÀO LỚP NGAY TẠI ĐÂY"
              icon={Video}
              variant="success"
              size="lg"
              onPress={() => onJoinRoom(liveClass.roomCode, liveClass.title)}
              style={styles.joinBtn}
            />
          </View>
        )}

        {/* Upcoming Classes List */}
        <View style={styles.sectionHeader}>
          <Calendar size={ICON_SIZES.lg} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Danh Sách Lịch Học Của Em ({classrooms.length})</Text>
        </View>

        <View style={styles.classList}>
          {classrooms.map((cls) => {
            const isLive = cls.status === 'live' || cls.isActive;
            const isEnded = cls.status === 'ended';

            const statusLabel = isLive
              ? 'Đang Học (Live)'
              : isEnded
              ? 'Đã Kết Thúc'
              : 'Sắp Diễn Ra';

            const statusBg = isLive ? '#ECFDF5' : isEnded ? '#FFE4E6' : '#FEF3C7';
            const statusCol = isLive ? COLORS.success : isEnded ? COLORS.danger : COLORS.warning;

            return (
              <View key={cls.id} style={styles.classCard}>
                <View style={styles.classCardHeader}>
                  <View style={styles.classBadge}>
                    <Sparkles size={ICON_SIZES.md} color={COLORS.primary} />
                  </View>
                  <View style={styles.classDetails}>
                    <View style={styles.titleStatusRow}>
                      <Text style={styles.classTitle}>{cls.title}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                        <Text style={[styles.statusText, { color: statusCol }]}>{statusLabel}</Text>
                      </View>
                    </View>
                    <Text style={styles.classCode}>Mã Phòng: {cls.roomCode}</Text>
                  </View>
                </View>

                <Button
                  label={isLive ? 'Tham Gia Lớp' : isEnded ? 'Đã Kết Thúc' : 'Chưa Đến Giờ'}
                  icon={Video}
                  variant={isLive ? 'success' : 'outline'}
                  disabled={!isLive}
                  onPress={() => onJoinRoom(cls.roomCode, cls.title)}
                />
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    padding: 20,
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 720,
    gap: 20,
  },
  welcomeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    flexWrap: 'wrap',
  },
  avatarBadge: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeTextGroup: {
    flex: 1,
    minWidth: 240,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  welcomeSub: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray600,
    lineHeight: 22,
  },
  featuredCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 3,
    borderColor: COLORS.primary,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  featuredTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 14,
  },
  featuredTagText: {
    color: COLORS.white,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1,
  },
  featuredTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 6,
  },
  featuredTeacher: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray600,
    marginBottom: 20,
  },
  joinBtn: {
    width: '100%',
    maxWidth: 400,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textDark,
  },
  classList: {
    gap: 14,
  },
  classCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    flexWrap: 'wrap',
    gap: 16,
  },
  classCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 240,
  },
  classBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  classDetails: {
    flex: 1,
  },
  titleStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  classTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  classCode: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
