import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Plus, Users, Calendar, Video, Copy, CheckCircle, Sparkles, UserPlus, Trash2, StopCircle, Eye, EyeOff, Key } from 'lucide-react';
import { COLORS, ICON_SIZES } from '../constants';
import type { StudentAccount, Classroom, UserProfile, TeacherAccount } from '../types';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import {
  formatScheduledTime,
  saveTeacherClassroom,
  updateClassroomStatus,
  deleteTeacherClassroom,
  getTeacherStudents,
  registerStudentAccount,
  deleteTeacherStudent,
  getTeacherAccounts,
} from '../services/storageService';
import { useLiveClassrooms } from '../hooks/useLiveClassrooms';

export interface TeacherDashboardProps {
  user?: UserProfile;
  onStartRoom: (roomCode: string, title: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, onStartRoom }) => {
  const [students, setStudents] = useState<StudentAccount[]>([]);
  
  const activeTeacherId = user?.id || 'tch-101';
  
  const { classrooms, setClassrooms } = useLiveClassrooms(activeTeacherId);

  // Add Student Modal State
  const [addStudentVisible, setAddStudentVisible] = useState<boolean>(false);
  const [newStudentFullName, setNewStudentFullName] = useState<string>('');
  const [newStudentUsername, setNewStudentUsername] = useState<string>('');
  const [newStudentPassword, setNewStudentPassword] = useState<string>('');
  const [addStudentError, setAddStudentError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);


  // Teacher Passwords Modal State
  const [showTeacherPasswordsModal, setShowTeacherPasswordsModal] = useState<boolean>(false);
  const [teacherAccounts, setTeacherAccounts] = useState<TeacherAccount[]>([]);
  const [visibleTeacherPasswords, setVisibleTeacherPasswords] = useState<Record<string, boolean>>({});

  const loadTeacherAccounts = () => {
    setTeacherAccounts(getTeacherAccounts());
    setShowTeacherPasswordsModal(true);
  };
  
  const toggleTeacherPasswordVisibility = (tchId: string) => {
    setVisibleTeacherPasswords((prev) => ({ ...prev, [tchId]: !prev[tchId] }));
  };

  // Schedule Modal
  const [addScheduleVisible, setAddScheduleVisible] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newStartTime, setNewStartTime] = useState<string>(() => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzOffset)).toISOString().slice(0, 16);
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);
  const [copyToastMessage, setCopyToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setStudents(getTeacherStudents(activeTeacherId));
  }, [activeTeacherId]);

  const copyClassroomLink = (cls: Classroom) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const linkToCopy = `${origin}/join/${cls.roomCode}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(linkToCopy);
      setCopiedRoomId(cls.id);
      setCopyToastMessage(`Đã sao chép link phòng học (${cls.roomCode})! Học sinh chỉ cần bấm vào là vào lớp ngay.`);
      setTimeout(() => {
        setCopiedRoomId(null);
        setCopyToastMessage(null);
      }, 3000);
    }
  };

  const handleAddStudentSubmit = async () => {
    if (loading) return;
    setAddStudentError(null);
    if (!newStudentFullName.trim()) {
      setAddStudentError('Vui lòng nhập Họ và Tên của Học Sinh.');
      return;
    }

    const cleanFullName = newStudentFullName.trim();
    const autoUsername = newStudentUsername.trim() || `hs_${cleanFullName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Math.floor(100 + Math.random() * 900)}`;
    const autoPassword = newStudentPassword.trim() || '123456';

    setLoading(true);
    try {
      const res = await registerStudentAccount(
        activeTeacherId,
        cleanFullName,
        autoUsername,
        autoPassword
      );

      if (res.success) {
        setStudents(getTeacherStudents(activeTeacherId));
        setNewStudentFullName('');
        setNewStudentUsername('');
        setNewStudentPassword('');
        setAddStudentVisible(false);
      } else {
        setAddStudentError(res.message);
      }
    } catch {
      setAddStudentError('Thêm học sinh thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (stdId: string) => {
    const updated = await deleteTeacherStudent(stdId);
    setStudents(updated);
  };

  const copyStudentPersonalLink = (std: StudentAccount) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const activeRoom = classrooms.find((c) => c.status === 'live') || classrooms[0];
    const roomCode = activeRoom?.roomCode || 'MATH101';
    const linkToCopy = `${origin}/join/${roomCode}?name=${encodeURIComponent(std.fullName)}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(linkToCopy);
      setCopiedId(std.id);
      setCopyToastMessage(`Đã sao chép link 1-Click cho ${std.fullName}!`);
      setTimeout(() => {
        setCopiedId(null);
        setCopyToastMessage(null);
      }, 3000);
    }
  };

  const handleAddSchedule = () => {
    if (!newTitle.trim() || !newStartTime) return;
    const roomCode = `ROOM${Math.floor(100 + Math.random() * 900)}`;
    const startDate = new Date(newStartTime);
    const endDate = new Date(startDate.getTime() + 3600000); // 1 hour duration

    const newClassroom: Classroom = {
      id: `cls-${Date.now()}`,
      title: newTitle.trim(),
      teacherId: activeTeacherId,
      scheduledStart: startDate.toISOString(),
      scheduledEnd: endDate.toISOString(),
      roomCode,
      status: 'scheduled',
      isActive: true,
    };
    saveTeacherClassroom(newClassroom).then((updated) => {
      setClassrooms(updated);
      setNewTitle('');
      setAddScheduleVisible(false);
    });
  };

  const handleOpenRoom = (cls: Classroom) => {
    updateClassroomStatus(cls.id, 'live').then((updated) => {
      setClassrooms(updated);
      onStartRoom(cls.roomCode, cls.title);
    });
  };

  const handleEndClassroom = (classroomId: string) => {
    updateClassroomStatus(classroomId, 'ended').then((updated) => {
      setClassrooms(updated);
    });
  };

  const handleDeleteClassroom = (classroomId: string) => {
    deleteTeacherClassroom(classroomId).then((updated) => {
      setClassrooms(updated);
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.contentWrapper}>
        {/* Floating Toast Notification Banner */}
        {copyToastMessage && (
          <View style={styles.toastBanner}>
            <CheckCircle size={ICON_SIZES.sm} color={COLORS.success} />
            <Text style={styles.toastText}>{copyToastMessage}</Text>
          </View>
        )}

        {/* Header Hero Section */}
        <View style={styles.heroBanner}>
          <View style={styles.heroTextGroup}>
            <Text style={styles.heroTitle}>Bảng Quản Lý Lớp Học Của Thầy</Text>
            <Text style={styles.heroSub}>Tạo danh sách học sinh, lên lịch buổi dạy và mở lớp 1-Click</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            <Button
              label="Quản Lý Mật Khẩu"
              icon={Key}
              variant="secondary"
              onPress={loadTeacherAccounts}
            />
            <Button
              label="Mở Phòng Học Ngay"
              icon={Video}
              variant="success"
              onPress={() => {
                onStartRoom('MATH101', 'Lớp Học Tương Tác Trực Tiếp');
              }}
            />
          </View>
        </View>

        {/* Section 1: Student Roster Management */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleGroup}>
            <Users size={ICON_SIZES.lg} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Danh Sách Học Sinh ({students.length})</Text>
          </View>
          <Button
            label="Thêm Học Sinh Mới"
            icon={UserPlus}
            variant="primary"
            size="sm"
            onPress={() => {
              setAddStudentError(null);
              setAddStudentVisible(true);
            }}
          />
        </View>

        {students.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Chưa có học sinh trong danh sách. Bấm "Thêm Học Sinh Mới" để lưu tên và sao chép link tham gia nhanh cho các em!</Text>
          </View>
        ) : (
          <View style={styles.studentCardsGrid}>
            {students.map((std) => {
              return (
                <View key={std.id} style={styles.studentCard}>
                  <View style={styles.studentCardHeader}>
                    <View style={styles.studentAvatar}>
                      <Sparkles size={ICON_SIZES.md} color={COLORS.primary} />
                    </View>
                    <View style={styles.studentDetails}>
                      <Text style={styles.studentName}>{std.fullName}</Text>
                      <Text style={styles.credentialsText}>Tham gia nhanh: <Text style={styles.boldCred}>Chỉ cần nhấp Link</Text></Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteStudent(std.id)} style={styles.delStdBtn}>
                      <Trash2 size={16} color={COLORS.gray400} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => copyStudentPersonalLink(std)}
                    style={[styles.copyLinkBtn, copiedId === std.id && styles.copyLinkBtnSuccess]}
                  >
                    {copiedId === std.id ? (
                      <CheckCircle size={ICON_SIZES.sm} color={COLORS.success} />
                    ) : (
                      <Copy size={ICON_SIZES.sm} color={COLORS.primary} />
                    )}
                    <Text style={[styles.copyLinkText, copiedId === std.id && { color: COLORS.success }]}>
                      {copiedId === std.id ? 'Đã Sao Chép Link Riêng!' : 'Sao Chép Link 1-Click Cho Em'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
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
                  <Text style={styles.clsTime}>Lịch dạy: {formatScheduledTime(cls.scheduledStart)}</Text>
                  <Text style={styles.clsTime}>Mã Phòng: {cls.roomCode}</Text>
                </View>

                <View style={styles.clsActionsRow}>
                  <TouchableOpacity
                    onPress={() => copyClassroomLink(cls)}
                    style={[styles.copyRoomBtn, copiedRoomId === cls.id && styles.copyRoomBtnSuccess]}
                  >
                    {copiedRoomId === cls.id ? (
                      <CheckCircle size={16} color={COLORS.success} />
                    ) : (
                      <Copy size={16} color={COLORS.primary} />
                    )}
                    <Text style={[styles.copyRoomText, copiedRoomId === cls.id && { color: COLORS.success }]}>
                      {copiedRoomId === cls.id ? 'Đã Sao Chép Link Học Sinh!' : 'Sao Chép Link Tham Gia Cho Học Sinh'}
                    </Text>
                  </TouchableOpacity>

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
        title="Thêm Học Sinh Vào Danh Sách"
        description="Nhập tên học sinh để tạo link tham gia 1-Click cá nhân hóa gửi cho Phụ huynh / Học sinh."
        confirmLabel={loading ? 'Đang Lưu...' : 'Thêm Vào Danh Sách'}
        confirmVariant="primary"
        onConfirm={handleAddStudentSubmit}
        cancelLabel="Hủy"
      >
        <View style={styles.modalForm}>
          {addStudentError && (
            <Text style={styles.modalErrorText}>{addStudentError}</Text>
          )}

          <Text style={styles.modalInputLabel}>Họ và Tên Học Sinh</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="VD: Bé An, Bảo Nam, Thảo Linh..."
            placeholderTextColor={COLORS.gray400}
            value={newStudentFullName}
            onChangeText={setNewStudentFullName}
            autoCapitalize="words"
            onSubmitEditing={handleAddStudentSubmit}
          />
        </View>
      </Modal>

      {/* Modal Create Schedule */}
      <Modal
        visible={addScheduleVisible}
        onClose={() => setAddScheduleVisible(false)}
        title="Tạo Lịch Học Mới"
        description="Nhập tên bài học và chọn thời gian bắt đầu học."
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
        <input
          type="datetime-local"
          value={newStartTime}
          onChange={(e) => setNewStartTime(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            border: '2px solid #E2E8F0',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: '600',
            color: '#1E293B',
            marginTop: '12px',
            boxSizing: 'border-box'
          }}
        />
      </Modal>
      {/* Teacher Passwords Modal */}
      <Modal
        visible={showTeacherPasswordsModal}
        title="Quản Lý Tài Khoản & Mật Khẩu Giáo Viên"
        onClose={() => setShowTeacherPasswordsModal(false)}
      >
        <View style={styles.modalForm}>
          {teacherAccounts.length === 0 ? (
            <Text style={{ textAlign: 'center', color: COLORS.gray600, marginVertical: 20 }}>
              Không tìm thấy tài khoản giáo viên nào.
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 400 }}>
              {teacherAccounts.map((tch) => {
                const showPass = visibleTeacherPasswords[tch.id] || false;
                return (
                  <View key={tch.id} style={{ ...styles.studentCard, marginBottom: 10 }}>
                    <View style={styles.studentCardHeader}>
                      <View style={{ ...styles.studentAvatar, backgroundColor: COLORS.purple + '20' }}>
                        <Sparkles size={ICON_SIZES.md} color={COLORS.purple} />
                      </View>
                      <View style={styles.studentDetails}>
                        <Text style={styles.studentName}>{tch.fullName}</Text>
                        <Text style={styles.credentialsText}>Email: <Text style={styles.boldCred}>{tch.email}</Text></Text>
                        <View style={styles.passRow}>
                          <Text style={styles.credentialsText}>
                            Mật khẩu: <Text style={styles.boldCred}>{showPass ? tch.passwordHash : '••••••••'}</Text>
                          </Text>
                          <TouchableOpacity onPress={() => toggleTeacherPasswordVisibility(tch.id)} style={styles.eyeBtn}>
                            {showPass ? (
                              <EyeOff size={16} color={COLORS.gray600} />
                            ) : (
                              <Eye size={16} color={COLORS.purple} />
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
          <Button
            label="Đóng Lại"
            variant="primary"
            onPress={() => setShowTeacherPasswordsModal(false)}
          />
        </View>
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
    minWidth: 280,
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
    alignItems: 'flex-start',
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
    fontWeight: '900',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  credentialsText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray600,
    marginTop: 2,
  },
  boldCred: {
    fontWeight: '800',
    color: COLORS.primary,
  },
  passRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyeBtn: {
    padding: 2,
  },
  delStdBtn: {
    padding: 4,
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
    flexWrap: 'wrap',
  },
  copyRoomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  copyRoomBtnSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  copyRoomText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
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
  modalForm: {
    gap: 10,
  },
  modalErrorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  modalInputLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 4,
  },
  modalInput: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 14,
    padding: 12,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  textInputLower: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 14,
    padding: 12,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.success,
  },
});
