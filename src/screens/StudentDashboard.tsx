import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Video, Calendar, Sparkles, Smile, BookOpen } from 'lucide-react';
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
    const loadedRooms = getTeacherClassrooms();
    setClassrooms(loadedRooms);
  }, []);

  const activeClassroom = classrooms.find((c) => c.isActive) || classrooms[0];

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
              Hôm nay em có bài học thú vị đang chờ đó. Hãy chọn lớp bên dưới để bắt đầu học nhé!
            </Text>
          </View>
        </View>

        {/* Featured Immediate Join Card if active classroom exists */}
        {activeClassroom ? (
          <View style={styles.featuredCard}>
            <View style={styles.featuredTag}>
              <Sparkles size={ICON_SIZES.sm} color={COLORS.white} />
              <Text style={styles.featuredTagText}>LỚP HỌC KHUYẾN NGHỊ</Text>
            </View>

            <Text style={styles.featuredTitle}>{activeClassroom.title}</Text>
            <Text style={styles.featuredTeacher}>Mã Phòng Học: {activeClassroom.roomCode}</Text>

            <Button
              label="VÀO LỚP NGAY TẠI ĐÂY"
              icon={Video}
              variant="success"
              size="lg"
              onPress={() => onJoinRoom(activeClassroom.roomCode, activeClassroom.title)}
              style={styles.joinBtn}
            />
          </View>
        ) : (
          <View style={styles.emptyFeaturedCard}>
            <View style={styles.emptyIconBadge}>
              <BookOpen size={ICON_SIZES.xl} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyFeaturedTitle}>Chưa có lớp học nào khả dụng</Text>
            <Text style={styles.emptyFeaturedSub}>
              Vui lòng nhập Mã Phòng Học từ thầy cô giáo ở màn hình chính hoặc chờ thầy cô mở lớp nhé!
            </Text>
          </View>
        )}

        {/* Upcoming Classes List */}
        <View style={styles.sectionHeader}>
          <Calendar size={ICON_SIZES.lg} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Danh Sách Lịch Học ({classrooms.length})</Text>
        </View>

        {classrooms.length === 0 ? (
          <View style={styles.emptyListCard}>
            <Text style={styles.emptyListText}>Hiện chưa có danh sách lớp học nào được đăng tải.</Text>
          </View>
        ) : (
          <View style={styles.classList}>
            {classrooms.map((cls) => (
              <View key={cls.id} style={styles.classCard}>
                <View style={styles.classCardHeader}>
                  <View style={styles.classBadge}>
                    <Sparkles size={ICON_SIZES.md} color={COLORS.primary} />
                  </View>
                  <View style={styles.classDetails}>
                    <Text style={styles.classTitle}>{cls.title}</Text>
                    <Text style={styles.classCode}>Mã Phòng: {cls.roomCode}</Text>
                  </View>
                </View>
                <Button
                  label="Tham Gia Lớp"
                  icon={Video}
                  variant={cls.isActive ? 'success' : 'primary'}
                  onPress={() => onJoinRoom(cls.roomCode, cls.title)}
                />
              </View>
            ))}
          </View>
        )}
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
  emptyFeaturedCard: {
    backgroundColor: COLORS.white,
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyFeaturedTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  emptyFeaturedSub: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray600,
    textAlign: 'center',
    maxWidth: 480,
    lineHeight: 20,
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
  emptyListCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray600,
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
  classTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  classCode: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
});

export default StudentDashboard;
