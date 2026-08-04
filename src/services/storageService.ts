import type { TeacherAccount, TeacherStudent, Classroom, AuthResponse, UserProfile } from '../types';

const STORAGE_KEYS = {
  TEACHERS: 'kid_classroom_teachers',
  STUDENTS: 'kid_classroom_students',
  CLASSROOMS: 'kid_classroom_rooms',
};

const isWindowAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
};

export const getTeacherAccounts = (): TeacherAccount[] => {
  if (!isWindowAvailable()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TEACHERS);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Error reading teachers from localStorage:', error);
    return [];
  }
};

export const registerTeacher = (fullName: string, email: string, password: string): AuthResponse => {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = fullName.trim();
  const trimmedPassword = password.trim();

  if (!trimmedName || !normalizedEmail || !trimmedPassword) {
    return { success: false, message: 'Vui lòng điền đầy đủ tất cả thông tin.' };
  }

  const existingTeachers = getTeacherAccounts();
  const duplicate = existingTeachers.find((t) => t.email.toLowerCase() === normalizedEmail);

  if (duplicate) {
    return { success: false, message: 'Email này đã được đăng ký tài khoản. Vui lòng đăng nhập.' };
  }

  const newTeacher: TeacherAccount = {
    id: `tch-${Date.now()}`,
    fullName: trimmedName,
    email: normalizedEmail,
    passwordHash: trimmedPassword,
    createdAt: new Date().toISOString(),
  };

  const updatedList = [...existingTeachers, newTeacher];
  if (isWindowAvailable()) {
    try {
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(updatedList));
    } catch (error) {
      console.error('Failed to save teacher account:', error);
      return { success: false, message: 'Không thể lưu thông tin tài khoản.' };
    }
  }

  const userProfile: UserProfile = {
    id: newTeacher.id,
    fullName: newTeacher.fullName,
    role: 'teacher',
    email: newTeacher.email,
    createdAt: newTeacher.createdAt,
  };

  return {
    success: true,
    message: 'Tạo tài khoản thành công! Hệ thống đang đăng nhập...',
    user: userProfile,
  };
};

export const loginTeacher = (email: string, password: string): AuthResponse => {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedPassword = password.trim();

  if (!normalizedEmail || !trimmedPassword) {
    return { success: false, message: 'Vui lòng nhập Email và Mật khẩu.' };
  }

  const existingTeachers = getTeacherAccounts();
  const teacher = existingTeachers.find(
    (t) => t.email.toLowerCase() === normalizedEmail && t.passwordHash === trimmedPassword
  );

  if (!teacher) {
    return { success: false, message: 'Email hoặc mật khẩu không chính xác.' };
  }

  const userProfile: UserProfile = {
    id: teacher.id,
    fullName: teacher.fullName,
    role: 'teacher',
    email: teacher.email,
    createdAt: teacher.createdAt,
  };

  return {
    success: true,
    message: 'Đăng nhập thành công!',
    user: userProfile,
  };
};

export const getTeacherStudents = (teacherId?: string): TeacherStudent[] => {
  if (!isWindowAvailable()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    const allStudents: TeacherStudent[] = raw ? JSON.parse(raw) : [];
    if (!teacherId) return allStudents;
    return allStudents.filter((s) => s.teacherId === teacherId);
  } catch (error) {
    console.error('Error fetching students:', error);
    return [];
  }
};

export const saveTeacherStudent = (student: TeacherStudent): TeacherStudent[] => {
  const allStudents = getTeacherStudents();
  const updated = [student, ...allStudents.filter((s) => s.id !== student.id)];
  if (isWindowAvailable()) {
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save student:', error);
    }
  }
  return updated;
};

export const deleteTeacherStudent = (studentId: string, teacherId?: string): TeacherStudent[] => {
  const allStudents = getTeacherStudents();
  const updated = allStudents.filter((s) => s.id !== studentId);
  if (isWindowAvailable()) {
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to delete student:', error);
    }
  }
  return teacherId ? updated.filter((s) => s.teacherId === teacherId) : updated;
};

export const getTeacherClassrooms = (teacherId?: string): Classroom[] => {
  if (!isWindowAvailable()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLASSROOMS);
    const allRooms: Classroom[] = raw ? JSON.parse(raw) : [];
    if (!teacherId) return allRooms;
    return allRooms.filter((r) => r.teacherId === teacherId);
  } catch (error) {
    console.error('Error fetching classrooms:', error);
    return [];
  }
};

export const saveTeacherClassroom = (classroom: Classroom): Classroom[] => {
  const allRooms = getTeacherClassrooms();
  const updated = [classroom, ...allRooms.filter((r) => r.id !== classroom.id)];
  if (isWindowAvailable()) {
    try {
      localStorage.setItem(STORAGE_KEYS.CLASSROOMS, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save classroom:', error);
    }
  }
  return updated;
};

export const deleteTeacherClassroom = (classroomId: string, teacherId?: string): Classroom[] => {
  const allRooms = getTeacherClassrooms();
  const updated = allRooms.filter((r) => r.id !== classroomId);
  if (isWindowAvailable()) {
    try {
      localStorage.setItem(STORAGE_KEYS.CLASSROOMS, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to delete classroom:', error);
    }
  }
  return teacherId ? updated.filter((r) => r.teacherId === teacherId) : updated;
};
