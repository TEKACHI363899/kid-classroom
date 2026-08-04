import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { User, ShieldCheck, ArrowRight, BookOpen, KeyRound, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { COLORS, ICON_SIZES } from '../constants';
import type { UserRole, UserProfile } from '../types';
import { Button } from '../components/common/Button';
import { loginTeacher, registerTeacher } from '../services/storageService';

export interface HomeScreenProps {
  onLogin: (user: UserProfile, roomCode?: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onLogin }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');

  // Student state
  const [studentName, setStudentName] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');

  // Teacher Auth State
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [teacherName, setTeacherName] = useState<string>('');
  const [teacherEmail, setTeacherEmail] = useState<string>('');
  const [teacherPassword, setTeacherPassword] = useState<string>('');
  const [teacherConfirmPassword, setTeacherConfirmPassword] = useState<string>('');

  // Notification state
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

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

  const handleStudentJoin = () => {
    setErrorMessage('');
    const finalName = studentName.trim();
    if (!finalName) {
      setErrorMessage('Vui lòng nhập tên học sinh của bạn.');
      return;
    }
    const user: UserProfile = {
      id: `std-${Date.now()}`,
      fullName: finalName,
      role: 'student',
    };
    onLogin(user, roomCode.trim());
  };

  const handleTeacherAuth = () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (isRegistering) {
      if (!teacherName.trim()) {
        setErrorMessage('Vui lòng nhập họ và tên của giáo viên.');
        return;
      }
      if (!teacherEmail.trim()) {
        setErrorMessage('Vui lòng nhập địa chỉ email.');
        return;
      }
      if (!teacherPassword.trim()) {
        setErrorMessage('Vui lòng nhập mật khẩu.');
        return;
      }
      if (teacherPassword !== teacherConfirmPassword) {
        setErrorMessage('Mật khẩu xác nhận không khớp.');
        return;
      }

      const res = registerTeacher(teacherName, teacherEmail, teacherPassword);
      if (!res.success) {
        setErrorMessage(res.message || 'Đăng ký thất bại.');
        return;
      }

      setSuccessMessage(res.message || 'Tạo tài khoản thành công!');
      if (res.user) {
        setTimeout(() => {
          onLogin(res.user!);
        }, 1000);
      }
    } else {
      if (!teacherEmail.trim()) {
        setErrorMessage('Vui lòng nhập địa chỉ email.');
        return;
      }
      if (!teacherPassword.trim()) {
        setErrorMessage('Vui lòng nhập mật khẩu.');
        return;
      }

      const res = loginTeacher(teacherEmail, teacherPassword);
      if (!res.success) {
        setErrorMessage(res.message || 'Đăng nhập thất bại.');
        return;
      }

      setSuccessMessage(res.message || 'Đăng nhập thành công!');
      if (res.user) {
        setTimeout(() => {
          onLogin(res.user!);
        }, 600);
      }
    }
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
            onPress={() => {
              setSelectedRole('student');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            style={[styles.roleTab, selectedRole === 'student' && styles.roleTabActiveStudent]}
          >
            <User size={ICON_SIZES.md} color={selectedRole === 'student' ? COLORS.white : COLORS.primary} />
            <Text style={[styles.roleTabText, selectedRole === 'student' && styles.roleTabTextActive]}>
              Học Sinh (Vào Lớp)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setSelectedRole('teacher');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            style={[styles.roleTab, selectedRole === 'teacher' && styles.roleTabActiveTeacher]}
          >
            <ShieldCheck size={ICON_SIZES.md} color={selectedRole === 'teacher' ? COLORS.white : COLORS.purple} />
            <Text style={[styles.roleTabText, selectedRole === 'teacher' && styles.roleTabTextActive]}>
              Giáo Viên
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error / Success Alerts */}
        {Boolean(errorMessage) && (
          <View style={styles.errorAlert}>
            <AlertCircle size={ICON_SIZES.sm} color={COLORS.danger} />
            <Text style={styles.errorAlertText}>{errorMessage}</Text>
          </View>
        )}

        {Boolean(successMessage) && (
          <View style={styles.successAlert}>
            <CheckCircle2 size={ICON_SIZES.sm} color={COLORS.success} />
            <Text style={styles.successAlertText}>{successMessage}</Text>
          </View>
        )}

        {/* Form Body */}
        {selectedRole === 'student' ? (
          <View style={styles.formContent}>
            <Text style={styles.inputLabel}>Tên Học Sinh của bạn</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Nhập tên em (VD: Nguyễn Văn An)..."
              placeholderTextColor={COLORS.gray400}
              value={studentName}
              onChangeText={setStudentName}
            />

            <Text style={styles.inputLabel}>Mã Phòng Học (Nêu có)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Nhập mã phòng học từ giáo viên..."
              placeholderTextColor={COLORS.gray400}
              value={roomCode}
              onChangeText={setRoomCode}
            />

            <Button
              label="Vào Lớp Học Ngay"
              icon={ArrowRight}
              iconPosition="right"
              variant="success"
              onPress={handleStudentJoin}
              style={styles.submitBtn}
            />
          </View>
        ) : (
          <View style={styles.formContent}>
            {/* Mode Switcher inside Teacher tab */}
            <View style={styles.authModeSwitch}>
              <TouchableOpacity
                onPress={() => {
                  setIsRegistering(false);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                style={[styles.authModeBtn, !isRegistering && styles.authModeBtnActive]}
              >
                <Text style={[styles.authModeText, !isRegistering && styles.authModeTextActive]}>
                  Đăng Nhập
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setIsRegistering(true);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                style={[styles.authModeBtn, isRegistering && styles.authModeBtnActive]}
              >
                <Text style={[styles.authModeText, isRegistering && styles.authModeTextActive]}>
                  Tạo Tài Khoản Mới
                </Text>
              </TouchableOpacity>
            </View>

            {isRegistering && (
              <>
                <Text style={styles.inputLabel}>Họ và Tên Giáo Viên</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập họ và tên (VD: Nguyễn Thị Hoa)..."
                  placeholderTextColor={COLORS.gray400}
                  value={teacherName}
                  onChangeText={setTeacherName}
                />
              </>
            )}

            <Text style={styles.inputLabel}>Email Giáo Viên</Text>
            <TextInput
              style={styles.textInput}
              placeholder="nhap.email@truonghoc.edu.vn"
              placeholderTextColor={COLORS.gray400}
              keyboardType="email-address"
              autoCapitalize="none"
              value={teacherEmail}
              onChangeText={setTeacherEmail}
            />

            <Text style={styles.inputLabel}>Mật Khẩu</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Nhập mật khẩu..."
              placeholderTextColor={COLORS.gray400}
              secureTextEntry
              value={teacherPassword}
              onChangeText={setTeacherPassword}
            />

            {isRegistering && (
              <>
                <Text style={styles.inputLabel}>Xác Nhận Mật Khẩu</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập lại mật khẩu..."
                  placeholderTextColor={COLORS.gray400}
                  secureTextEntry
                  value={teacherConfirmPassword}
                  onChangeText={setTeacherConfirmPassword}
                />
              </>
            )}

            <Button
              label={isRegistering ? 'Đăng Ký Tài Khoản Giáo Viên' : 'Đăng Nhập Quản Lý Lớp'}
              icon={isRegistering ? UserPlus : KeyRound}
              variant="secondary"
              onPress={handleTeacherAuth}
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
  authModeSwitch: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray100,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  authModeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  authModeBtnActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  authModeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray600,
  },
  authModeTextActive: {
    color: COLORS.purple,
    fontWeight: '900',
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  errorAlertText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.danger,
  },
  successAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  successAlertText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.success,
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
  submitBtn: {
    marginTop: 16,
  },
});

export default HomeScreen;
