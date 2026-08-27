import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import {
  User,
  ShieldCheck,
  BookOpen,
  KeyRound,
  UserPlus,
  AlertCircle,
  CheckCircle,
  CheckSquare,
  Square,
  Sparkles,
  Video,
  Hash,
} from 'lucide-react';
import { COLORS, ICON_SIZES } from '../constants';
import type { UserRole, UserProfile } from '../types';
import { Button } from '../components/common/Button';
import { registerTeacher, loginTeacher, saveAuthSession } from '../services/storageService';

export interface HomeScreenProps {
  onLogin: (user: UserProfile, roomCode?: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onLogin }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [roomCode, setRoomCode] = useState<string>('');
  const [roomTitle, setRoomTitle] = useState<string>('');

  // 1-Click Instant Student Join State
  const [studentNickname, setStudentNickname] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('last_student_nickname') || 'Học sinh 1';
    }
    return 'Học sinh 1';
  });
  const [rememberNickname, setRememberNickname] = useState<boolean>(true);

  // Teacher Auth Mode State: 'login' | 'register'
  const [teacherAuthMode, setTeacherAuthMode] = useState<'login' | 'register'>('login');

  // Teacher Form State
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [rememberTeacher, setRememberTeacher] = useState<boolean>(true);

  // Teacher Registration Form State
  const [regFullName, setRegFullName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');

  // Auth Status Message
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRoom =
        params.get('room') ||
        params.get('code') ||
        sessionStorage.getItem('redirect_room_code');
      const urlTitle = sessionStorage.getItem('redirect_room_title');
      if (urlRoom) {
        setRoomCode(urlRoom.trim().toUpperCase());
      }
      if (urlTitle) {
        setRoomTitle(urlTitle);
      }
    }
  }, []);

  const handleStudentInstantJoin = () => {
    if (loading) return;
    setAuthError(null);
    setAuthSuccess(null);

    const cleanRoomCode = roomCode.trim().toUpperCase();
    if (!cleanRoomCode) {
      setAuthError('Vui lòng nhập Mã Phòng Học để vào lớp.');
      return;
    }

    const finalName = studentNickname.trim() || 'Học sinh 1';

    if (rememberNickname && typeof window !== 'undefined') {
      localStorage.setItem('last_student_nickname', finalName);
    }

    const studentUser: UserProfile = {
      id: `std-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fullName: finalName,
      role: 'student',
    };

    saveAuthSession(studentUser);
    setAuthSuccess('Đang vào phòng học...');
    setTimeout(() => {
      onLogin(studentUser, cleanRoomCode);
    }, 300);
  };

  const handleTeacherLogin = async () => {
    if (loading) return;
    setAuthError(null);
    setAuthSuccess(null);
    setLoading(true);

    try {
      const res = await loginTeacher(loginEmail, loginPassword);
      if (res.success && res.user) {
        setAuthSuccess(res.message);
        setTimeout(() => onLogin(res.user!, roomCode), 400);
        return;
      }
      setAuthError(res.message);
    } catch (err) {
      console.error('Teacher login error:', err);
      setAuthError('Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherRegister = async () => {
    if (loading) return;
    setAuthError(null);
    setAuthSuccess(null);

    if (!regFullName.trim()) {
      setAuthError('Vui lòng nhập họ và tên của Giáo viên.');
      return;
    }
    if (!regEmail.trim()) {
      setAuthError('Vui lòng nhập địa chỉ Email đăng ký.');
      return;
    }
    if (!regPassword.trim()) {
      setAuthError('Vui lòng nhập mật khẩu.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setAuthError('Mật khẩu nhập lại không trùng khớp.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerTeacher(regFullName, regEmail, regPassword);
      if (res.success && res.user) {
        setAuthSuccess(res.message);
        setTimeout(() => onLogin(res.user!, roomCode), 600);
      } else {
        setAuthError(res.message);
      }
    } catch {
      setAuthError('Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
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

        {/* Direct Link Destination Notice Banner */}
        {roomCode ? (
          <View style={styles.directLinkBanner}>
            <Sparkles size={ICON_SIZES.sm} color={COLORS.primary} />
            <Text style={styles.directLinkText}>
              Đang chuẩn bị vào lớp: <Text style={styles.boldCred}>{roomTitle ? `${roomTitle} (${roomCode})` : roomCode}</Text>
            </Text>
          </View>
        ) : null}

        {/* Role Toggle Selector */}
        <View style={styles.roleToggleRow}>
          <TouchableOpacity
            onPress={() => {
              setSelectedRole('student');
              setAuthError(null);
              setAuthSuccess(null);
            }}
            style={[styles.roleTab, selectedRole === 'student' && styles.roleTabActiveStudent]}
          >
            <User size={ICON_SIZES.md} color={selectedRole === 'student' ? COLORS.white : COLORS.primary} />
            <Text style={[styles.roleTabText, selectedRole === 'student' && styles.roleTabTextActive]}>
              Học Sinh Tham Gia
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setSelectedRole('teacher');
              setAuthError(null);
              setAuthSuccess(null);
            }}
            style={[styles.roleTab, selectedRole === 'teacher' && styles.roleTabActiveTeacher]}
          >
            <ShieldCheck size={ICON_SIZES.md} color={selectedRole === 'teacher' ? COLORS.white : COLORS.purple} />
            <Text style={[styles.roleTabText, selectedRole === 'teacher' && styles.roleTabTextActive]}>
              Giáo Viên
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status Feedback Banners */}
        {authError && (
          <View style={styles.errorBox}>
            <AlertCircle size={ICON_SIZES.sm} color={COLORS.danger} />
            <Text style={styles.errorText}>{authError}</Text>
          </View>
        )}

        {authSuccess && (
          <View style={styles.successBox}>
            <CheckCircle size={ICON_SIZES.sm} color={COLORS.success} />
            <Text style={styles.successText}>{authSuccess}</Text>
          </View>
        )}

        {/* Form Body */}
        {selectedRole === 'student' ? (
          <View style={styles.formContent}>
            <Text style={styles.inputLabel}>Mã Phòng Học</Text>
            <View style={styles.inputWithIconWrapper}>
              <TextInput
                style={styles.textInputRoom}
                placeholder="Nhập mã phòng (VD: MATH101)..."
                placeholderTextColor={COLORS.gray400}
                value={roomCode}
                onChangeText={(text) => setRoomCode(text.toUpperCase())}
                autoCapitalize="characters"
              />
              <View style={styles.inputIconRight}>
                <Hash size={20} color={COLORS.primary} />
              </View>
            </View>

            <Text style={styles.inputLabel}>Tên / Biệt Danh Của Em</Text>
            <TextInput
              style={styles.textInput}
              placeholder="VD: Bé An, Bảo Nam, Thảo Linh..."
              placeholderTextColor={COLORS.gray400}
              value={studentNickname}
              onChangeText={setStudentNickname}
              autoCapitalize="words"
              onSubmitEditing={handleStudentInstantJoin}
            />

            <TouchableOpacity
              onPress={() => setRememberNickname(!rememberNickname)}
              style={styles.checkboxRow}
            >
              {rememberNickname ? (
                <CheckSquare size={20} color={COLORS.primary} />
              ) : (
                <Square size={20} color={COLORS.gray400} />
              )}
              <Text style={styles.checkboxText}>Ghi nhớ tên của em cho các buổi học sau</Text>
            </TouchableOpacity>

            <Button
              label={loading ? 'Đang Kết Nối...' : 'Vào Lớp Ngay'}
              icon={Video}
              variant="success"
              size="lg"
              disabled={loading}
              onPress={handleStudentInstantJoin}
              style={styles.submitBtn}
            />
          </View>
        ) : (
          <View style={styles.formContent}>
            {/* Sub Mode Selector for Teacher */}
            <View style={styles.subAuthToggle}>
              <TouchableOpacity
                onPress={() => {
                  setTeacherAuthMode('login');
                  setAuthError(null);
                  setAuthSuccess(null);
                }}
                style={[styles.subTab, teacherAuthMode === 'login' && styles.subTabActive]}
              >
                <KeyRound size={ICON_SIZES.sm} color={teacherAuthMode === 'login' ? COLORS.purple : COLORS.gray600} />
                <Text style={[styles.subTabText, teacherAuthMode === 'login' && styles.subTabTextActive]}>
                  Đăng Nhập
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setTeacherAuthMode('register');
                  setAuthError(null);
                  setAuthSuccess(null);
                }}
                style={[styles.subTab, teacherAuthMode === 'register' && styles.subTabActive]}
              >
                <UserPlus size={ICON_SIZES.sm} color={teacherAuthMode === 'register' ? COLORS.purple : COLORS.gray600} />
                <Text style={[styles.subTabText, teacherAuthMode === 'register' && styles.subTabTextActive]}>
                  Tạo Tài Khoản Mới
                </Text>
              </TouchableOpacity>
            </View>

            {teacherAuthMode === 'login' ? (
              <>
                <Text style={styles.inputLabel}>Email Giáo Viên</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="nhap.email@truonghoc.edu.vn"
                  placeholderTextColor={COLORS.gray400}
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                />

                <Text style={styles.inputLabel}>Mật Khẩu</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.gray400}
                  secureTextEntry
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                />

                <TouchableOpacity
                  onPress={() => setRememberTeacher(!rememberTeacher)}
                  style={styles.checkboxRow}
                >
                  {rememberTeacher ? (
                    <CheckSquare size={20} color={COLORS.purple} />
                  ) : (
                    <Square size={20} color={COLORS.gray400} />
                  )}
                  <Text style={styles.checkboxText}>Ghi nhớ đăng nhập trên thiết bị này</Text>
                </TouchableOpacity>

                <Button
                  label={loading ? 'Đang Đăng Nhập...' : 'Đăng Nhập Quản Lý Lớp'}
                  icon={KeyRound}
                  variant="secondary"
                  disabled={loading}
                  onPress={handleTeacherLogin}
                  style={styles.submitBtn}
                />
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>Họ và Tên Giáo Viên</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="VD: Thầy Ngô Thành Đạt"
                  placeholderTextColor={COLORS.gray400}
                  value={regFullName}
                  onChangeText={setRegFullName}
                />

                <Text style={styles.inputLabel}>Email Đăng Ký</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="email.giao.vien@gmail.com"
                  placeholderTextColor={COLORS.gray400}
                  value={regEmail}
                  onChangeText={setRegEmail}
                />

                <Text style={styles.inputLabel}>Mật Khẩu</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập mật khẩu..."
                  placeholderTextColor={COLORS.gray400}
                  secureTextEntry
                  value={regPassword}
                  onChangeText={setRegPassword}
                />

                <Text style={styles.inputLabel}>Xác Nhận Mật Khẩu</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập lại mật khẩu..."
                  placeholderTextColor={COLORS.gray400}
                  secureTextEntry
                  value={regConfirmPassword}
                  onChangeText={setRegConfirmPassword}
                />

                <Button
                  label={loading ? 'Đang Đăng Ký...' : 'Đăng Ký Tài Khoản Giáo Viên'}
                  icon={UserPlus}
                  variant="secondary"
                  disabled={loading}
                  onPress={handleTeacherRegister}
                  style={styles.submitBtn}
                />
              </>
            )}
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
    marginBottom: 20,
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
  subAuthToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray100,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    gap: 6,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  subTabActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  subTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray600,
  },
  subTabTextActive: {
    color: COLORS.purple,
    fontWeight: '800',
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
  inputWithIconWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  textInputRoom: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingRight: 46,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
    borderWidth: 2,
    borderColor: '#BFDBFE',
    letterSpacing: 1.5,
  },
  inputIconRight: {
    position: 'absolute',
    right: 14,
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  checkboxText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray600,
  },
  submitBtn: {
    marginTop: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFE4E6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  successText: {
    color: COLORS.success,
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  directLinkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
  },
  directLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  boldCred: {
    fontWeight: '900',
    color: COLORS.primary,
  },
});
