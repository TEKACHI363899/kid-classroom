import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Plus, Users, Calendar, Video, Copy, CheckCircle, Sparkles, UserPlus } from 'lucide-react';
import { COLORS, ICON_SIZES, MOCK_STUDENTS_LIST, MOCK_CLASSROOMS_LIST } from '../constants';
import type { TeacherStudent, Classroom } from '../types';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

export interface TeacherDashboardProps {
  onStartRoom: (roomCode: string, title: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onStartRoom }) => {
  const [students, setStudents] = useState<TeacherStudent[]>(MOCK_STUDENTS_LIST.map(s => ({
    id: s.id,
    teacherId: 'tch-101',
    studentName: s.name,
    accessCode: s.accessCode,
  })));

  const [classrooms, setClassrooms] = useState<Classroom[]>(MOCK_CLASSROOMS_LIST.map(c => ({
    id: c.id,
    title: c.title,
    teacherId: c.teacherId,
    scheduledStart: c.scheduledStart,
    scheduledEnd: c.scheduledEnd,
    roomCode: c.roomCode,
    isActive: c.isActive,
  })));

  // Add Student Modal
  const [addStudentVisible, setAddStudentVisible] = useState<boolean>(false);
  const [newStudentName, setNewStudentName] = useState<string>('');

  // Schedule Modal
  const [addScheduleVisible, setAddScheduleVisible] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleAddStudent = () => {
    if (!newStudentName.trim()) return;
    const accessCode = `STD${Math.floor(1000 + Math.random() * 9000)}`;
    const newStudent: TeacherStudent = {
      id: `std-${Date.now()}`,
      teacherId: 'tch-101',
      studentName: newStudentName.trim(),
      accessCode,
    };
    setStudents((prev) => [newStudent, ...prev]);
    setNewStudentName('');
    setAddStudentVisible(false);
  };

  const handleAddSchedule = () => {
    if (!newTitle.trim()) return;
    const roomCode = `ROOM${Math.floor(100 + Math.random() * 900)}`;
    const newClassroom: Classroom = {
      id: `cls-${Date.now()}`,
      title: newTitle.trim(),
      teacherId: 'tch-101',
      scheduledStart: new Date().toISOString(),
      scheduledEnd: new Date(Date.now() + 3600000).toISOString(),
      roomCode,
      isActive: true,
    };
    setClassrooms((prev) => [newClassroom, ...prev]);
    setNewTitle('');
    setAddScheduleVisible(false);
  };

  const copyParentLink = (std: TeacherStudent) => {
    const parentLink = `${window.location.origin}/?name=${encodeURIComponent(std.studentName)}&code=${std.accessCode}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(parentLink);
      setCopiedId(std.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.contentWrapper}>
        {/* Header Hero Section */}
        <View style={styles.heroBanner}>
          <View style={styles.heroTextGroup}>
            <Text style={styles.heroTitle}>Bảng Quản Lý Lớp Học Của Cô</Text>
            <Text style={styles.heroSub}>Tạo danh sách học sinh, lên lịch buổi dạy và mở lớp 1-Click</Text>
          </View>
          <Button
            label="Mở Phòng Học Ngay"
            icon={Video}
            variant="success"
            onPress={() => onStartRoom('ROOM101', 'Lớp Học Tương Tác Trực Tiếp')}
          />
        </View>

        {/* Section 1: Student Management */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleGroup}>
            <Users size={ICON_SIZES.lg} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Danh Sách Học Sinh ({students.length})</Text>
          </View>
          <Button
            label="Thêm Học Sinh"
            icon={UserPlus}
            variant="primary"
            size="sm"
            onPress={() => setAddStudentVisible(true)}
          />
        </View>

        <View style={styles.studentCardsGrid}>
          {students.map((std) => (
            <View key={std.id} style={styles.studentCard}>
              <View style={styles.studentCardHeader}>
                <View style={styles.studentAvatar}>
                  <Sparkles size={ICON_SIZES.md} color={COLORS.primary} />
                </View>
                <View style={styles.studentDetails}>
                  <Text style={styles.studentName}>{std.studentName}</Text>
                  <Text style={styles.accessCode}>Mã: {std.accessCode}</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => copyParentLink(std)}
                style={[styles.copyLinkBtn, copiedId === std.id && styles.copyLinkBtnSuccess]}
              >
                {copiedId === std.id ? (
                  <CheckCircle size={ICON_SIZES.sm} color={COLORS.success} />
                ) : (
                  <Copy size={ICON_SIZES.sm} color={COLORS.primary} />
                )}
                <Text style={[styles.copyLinkText, copiedId === std.id && { color: COLORS.success }]}>
                  {copiedId === std.id ? 'Đã Sao Chép!' : 'Sao Chép Link Phụ Huynh'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Section 2: Classroom Schedule Management */}
        <View style={[styles.sectionHeader, { marginTop: 36 }]}>
          <View style={styles.sectionTitleGroup}>
            <Calendar size={ICON_SIZES.lg} color={COLORS.purple} />
            <Text style={styles.sectionTitle}>Lịch Dạy & Lớp Học ({classrooms.length})</Text>
          </View>
          <Button
            label="Tạo Lịch Học Mới"
            icon={Plus}
            variant="secondary"
            size="sm"
            onPress={() => setAddScheduleVisible(true)}
          />
        </View>

        <View style={styles.classroomList}>
          {classrooms.map((cls) => (
            <View key={cls.id} style={styles.classroomCard}>
              <View style={styles.clsInfo}>
                <Text style={styles.clsTitle}>{cls.title}</Text>
                <Text style={styles.clsTime}>
                  Mã Lớp: {cls.roomCode} | Trạng Thái: {cls.isActive ? 'Đang Mở' : 'Chưa Mở'}
                </Text>
              </View>
              <Button
                label="Vào Lớp"
                icon={Video}
                variant={cls.isActive ? 'success' : 'outline'}
                size="sm"
                onPress={() => onStartRoom(cls.roomCode, cls.title)}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Modal Add Student */}
      <Modal
        visible={addStudentVisible}
        onClose={() => setAddStudentVisible(false)}
        title="Thêm Học Sinh Mới"
        description="Nhập họ tên học sinh để tạo tài khoản và đường link truy cập nhanh."
        confirmLabel="Tạo Tài Khoản"
        confirmVariant="primary"
        onConfirm={handleAddStudent}
        cancelLabel="Hủy"
      >
        <TextInput
          style={styles.modalInput}
          placeholder="Nhập tên học sinh (VD: Nguyễn Văn An)..."
          placeholderTextColor={COLORS.gray400}
          value={newStudentName}
          onChangeText={setNewStudentName}
        />
      </Modal>

      {/* Modal Create Schedule */}
      <Modal
        visible={addScheduleVisible}
        onClose={() => setAddScheduleVisible(false)}
        title="Tạo Lịch Học Mới"
        description="Nhập tên bài học để sinh phòng dạy trực tuyến."
        confirmLabel="Lưu Lịch Dạy"
        confirmVariant="secondary"
        onConfirm={handleAddSchedule}
        cancelLabel="Hủy"
      >
        <TextInput
          style={styles.modalInput}
          placeholder="Nhập tên bài dạy (VD: Toán Tư Duy Bài 3)..."
          placeholderTextColor={COLORS.gray400}
          value={newTitle}
          onChangeText={setNewTitle}
        />
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    padding: 24,
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 960,
  },
  heroBanner: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    flexWrap: 'wrap',
    gap: 20,
  },
  heroTextGroup: {
    flex: 1,
    minWidth: 280,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textDark,
  },
  studentCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  studentCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    justifyContent: 'space-between',
  },
  studentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  accessCode: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  copyLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  copyLinkBtnSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  copyLinkText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  classroomList: {
    gap: 12,
  },
  classroomCard: {
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
  clsInfo: {
    flex: 1,
    minWidth: 240,
  },
  clsTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  clsTime: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  modalInput: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
});
