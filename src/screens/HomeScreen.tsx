import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { User, ShieldCheck, ArrowRight, BookOpen, Sparkles, KeyRound } from 'lucide-react';
import { COLORS, ICON_SIZES, MOCK_STUDENTS_LIST } from '../constants';
import type { UserRole, UserProfile } from '../types';
import { Button } from '../components/common/Button';

export interface HomeScreenProps {
  onLogin: (user: UserProfile, roomCode?: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onLogin }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [studentName, setStudentName] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('MATH101');
  const [teacherEmail, setTeacherEmail] = useState<string>('teacher@kidclass.edu.vn');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlName = params.get('name');
      const urlRoom = params.get('room') || params.get('code');
      if (urlName) {
        setStudentName(urlName);
      }
      if (urlRoom) {
        setRoomCode(urlRoom);
      }
    }
  }, []);

  const handleStudentJoin = (nameToUse?: string) => {
    const finalName = (nameToUse || studentName).trim() || 'Học Sinh Thân Yêu';
    const user: UserProfile = {
      id: `std-${Date.now()}`,
      fullName: finalName,
      role: 'student',
    };
    onLogin(user, roomCode);
  };

  const handleTeacherJoin = () => {
    const user: UserProfile = {
      id: `tch-101`,
      fullName: 'Cô Nông Thị Tuyết',
      role: 'teacher',
    };
    onLogin(user, roomCode);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.cardContainer}>
        {/* Header Branding */}
        <View style={styles.brandGroup}>
          <View style={styles.iconBadge}>
            <BookOpen size={ICON_SIZES.xl} color={COLORS.white} />
          </View>
          <Text style={styles.mainTitle}>Lớp Học Trực Tuyến Tương Tác</Text>
          <Text style={styles.subTitle}>Dành cho Trẻ Em & Giáo Viên - Học vui, Vẽ thích!</Text>
        </View>

        {/* Role Toggle Selector */}
        <View style={styles.roleToggleRow}>
          <TouchableOpacity
            onPress={() => setSelectedRole('student')}
            style={[styles.roleTab, selectedRole === 'student' && styles.roleTabActiveStudent]}
          >
            <User size={ICON_SIZES.md} color={selectedRole === 'student' ? COLORS.white : COLORS.primary} />
            <Text style={[styles.roleTabText, selectedRole === 'student' && styles.roleTabTextActive]}>
              Học Sinh (Vào Lớp Ngay)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedRole('teacher')}
            style={[styles.roleTab, selectedRole === 'teacher' && styles.roleTabActiveTeacher]}
          >
            <ShieldCheck size={ICON_SIZES.md} color={selectedRole === 'teacher' ? COLORS.white : COLORS.purple} />
            <Text style={[styles.roleTabText, selectedRole === 'teacher' && styles.roleTabTextActive]}>
              Giáo Viên
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Body */}
        {selectedRole === 'student' ? (
          <View style={styles.formContent}>
            <Text style={styles.inputLabel}>Tên Học Sinh của bạn</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Nhập tên em (VD: Học Sinh An)..."
              placeholderTextColor={COLORS.gray400}
              value={studentName}
              onChangeText={setStudentName}
            />

            <Text style={styles.inputLabel}>Hoặc Chọn Nhanh Tên Từ Danh Sách Lớp</Text>
            <View style={styles.quickList}>
              {MOCK_STUDENTS_LIST.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => {
                    setStudentName(s.name);
                    handleStudentJoin(s.name);
                  }}
                  style={styles.quickNameBadge}
                >
                  <Sparkles size={ICON_SIZES.sm} color={COLORS.primary} />
                  <Text style={styles.quickNameText}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Mã Phòng Học</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Nhập Mã Lớp (VD: MATH101)..."
              placeholderTextColor={COLORS.gray400}
              value={roomCode}
              onChangeText={setRoomCode}
            />

            <Button
              label="Vào Lớp Học Ngay"
              icon={ArrowRight}
              iconPosition="right"
              variant="success"
              onPress={() => handleStudentJoin()}
              style={styles.submitBtn}
            />
          </View>
        ) : (
          <View style={styles.formContent}>
            <Text style={styles.inputLabel}>Email Giáo Viên</Text>
            <TextInput
              style={styles.textInput}
              placeholder="nhap.email@truonghoc.edu.vn"
              placeholderTextColor={COLORS.gray400}
              value={teacherEmail}
              onChangeText={setTeacherEmail}
            />

            <Text style={styles.inputLabel}>Mật Khẩu / Mã OTP Auth</Text>
            <TextInput
              style={styles.textInput}
              placeholder="••••••••"
              placeholderTextColor={COLORS.gray400}
              secureTextEntry
              value="123456"
            />

            <Button
              label="Đăng Nhập Quản Lý Lớp"
              icon={KeyRound}
              variant="secondary"
              onPress={handleTeacherJoin}
              style={styles.submitBtn}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: COLORS.white,
    borderRadius: 32,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  brandGroup: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 6,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray600,
    textAlign: 'center',
  },
  roleToggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray100,
    borderRadius: 20,
    padding: 6,
    marginBottom: 24,
    gap: 8,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  roleTabActiveStudent: {
    backgroundColor: COLORS.primary,
  },
  roleTabActiveTeacher: {
    backgroundColor: COLORS.purple,
  },
  roleTabText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  roleTabTextActive: {
    color: COLORS.white,
  },
  formContent: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 6,
  },
  textInput: {
    backgroundColor: COLORS.gray100,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quickList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  quickNameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  quickNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  submitBtn: {
    marginTop: 16,
  },
});
