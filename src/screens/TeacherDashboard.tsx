import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Plus, Users, Calendar, Video, Copy, CheckCircle, Sparkles, UserPlus, Trash2, StopCircle } from 'lucide-react';
import { COLORS, ICON_SIZES } from '../constants';
import type { TeacherStudent, Classroom } from '../types';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import {
  getTeacherClassrooms,
  saveTeacherClassroom,
  updateClassroomStatus,
  deleteTeacherClassroom,
  getTeacherStudents,
  saveTeacherStudent,
} from '../services/storageService';

export interface TeacherDashboardProps {
  onStartRoom: (roomCode: string, title: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onStartRoom }) => {
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);

  // Add Student Modal
  const [addStudentVisible, setAddStudentVisible] = useState<boolean>(false);
  const [newStudentName, setNewStudentName] = useState<string>('');

  // Schedule Modal
  const [addScheduleVisible, setAddScheduleVisible] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');

  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setClassrooms(getTeacherClassrooms());
    setStudents(getTeacherStudents());
  }, []);

  const handleAddStudent = () => {
    if (!newStudentName.trim()) return;
    const accessCode = `STD${Math.floor(1000 + Math.random() * 9000)}`;
    const newStudent: TeacherStudent = {
      id: `std-${Date.now()}`,
      teacherId: 'tch-101',
      studentName: newStudentName.trim(),
      accessCode,
    };
    const updated = saveTeacherStudent(newStudent);
    setStudents(updated);
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
      status: 'scheduled',
      isActive: false,
    };
    const updated = saveTeacherClassroom(newClassroom);
    setClassrooms(updated);
    setNewTitle('');
    setAddScheduleVisible(false);
  };

  const handleOpenRoom = (cls: Classroom) => {
    const updated = updateClassroomStatus(cls.id, 'live');
    setClassrooms(updated);
    onStartRoom(cls.roomCode, cls.title);
  };

  const handleEndClassroom = (classroomId: string) => {
    const updated = updateClassroomStatus(classroomId, 'ended');
    setClassrooms(updated);
  };

  const handleDeleteClassroom = (classroomId: string) => {
    const updated = deleteTeacherClassroom(classroomId);
    setClassrooms(updated);
  };

  const copyParentLink = (std: TeacherStudent) => {
    const parentLink = `${window.location.origin}/login?student_code=${std.accessCode}`;
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
            onPress={() => {
              const liveCode = 'MATH101';
              onStartRoom(liveCode, 'Lớp Học Tương Tác Trực Tiếp');
            }}
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

        {students.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Chưa có học sinh trong danh sách. Bấm nút "Thêm Học Sinh" để tạo thẻ bài giảng cho học sinh nhé!</Text>
          </View>
        ) : (
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
                    {copiedId === std.id ? 'Đã Sao Chép!' : 'Link Đăng Nhập Phụ Huynh'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

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
          {classrooms.map((cls) => {
            const statusLabel =
              cls.status === 'live'
                ? 'Đang Học (Live)'
                : cls.status === 'ended'
                ? 'Đã Kết Thúc'
                : 'Sắp Diễn Ra';

            const statusBg =
              cls.status === 'live'
                ? '#ECFDF5'
                : cls.status === 'ended'
                ? '#FFE4E6'
                : '#FEF3C7';

            const statusTextCol =
              cls.status === 'live'
                ? COLORS.success
                : cls.status === 'ended'
                ? COLORS.danger
                : COLORS.warning;

            return (
              <View key={cls.id} style={styles.classroomCard}>
                <View style={styles.clsInfo}>
                  <View style={styles.titleStatusRow}>
                    <Text style={styles.clsTitle}>{cls.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                      <Text style={[styles.statusBadgeText, { color: statusTextCol }]}>
                        {statusLabel}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.clsTime}>Mã Phòng: {cls.roomCode}</Text>
                </View>

                <View style={styles.clsActionsRow}>
                  {cls.status !== 'ended' ? (
                    <Button
                      label={cls.status === 'live' ? 'Vào Lớp' : 'Mở Lớp (Live)'}
                      icon={Video}
                      variant={cls.status === 'live' ? 'success' : 'primary'}
                      size="sm"
                      onPress={() => handleOpenRoom(cls)}
                    />
                  ) : null}

                  {cls.status === 'live' && (
                    <TouchableOpacity
                      onPress={() => handleEndClassroom(cls.id)}
                      style={styles.endBtnMini}
                    >
                      <StopCircle size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => handleDeleteClassroom(cls.id)}
                    style={styles.deleteBtnMini}
                  >
                    <Trash2 size={18} color={COLORS.gray600} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
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
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.gray400,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray600,
    textAlign: 'center',
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
  titleStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  clsTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  clsTime: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  clsActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  endBtnMini: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#FFE4E6',
  },
  deleteBtnMini: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
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
