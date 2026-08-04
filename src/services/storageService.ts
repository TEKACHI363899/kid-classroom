import type { TeacherAccount, TeacherStudent, Classroom, AuthResponse, UserProfile, ClassroomStatus } from '../types';

const STORAGE_KEYS = {
  TEACHERS: 'kid_classroom_teachers',
  STUDENTS: 'kid_classroom_students',
  CLASSROOMS: 'kid_classroom_rooms',
};

const isWindowAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
};

// Initial default classrooms list if localStorage is empty
const DEFAULT_CLASSROOMS: Classroom[] = [
  {
    id: 'cls-001',
    title: 'Bài 1: Toán Tư Duy - Hình Học Cơ Bản',
    teacherId: 'tch-101',
    scheduledStart: new Date().toISOString(),
    scheduledEnd: new Date(Date.now() + 3600000).toISOString(),
    roomCode: 'MATH101',
    status: 'live',
    isActive: true,
  },
  {
    id: 'cls-002',
    title: 'Bài 2: Tiếng Anh Giao Tiếp Trẻ Em',
    teacherId: 'tch-101',
    scheduledStart: new Date(Date.now() + 86400000).toISOString(),
    scheduledEnd: new Date(Date.now() + 90000000).toISOString(),
    roomCode: 'ENG202',
    status: 'scheduled',
    isActive: false,
  },
];

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
    message: 'Tạo tài khoản thành công! Hệ thống đang chuyển về Dashboard...',
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

// Classroom Management Functions (Version 3.1)
export const getTeacherClassrooms = (teacherId?: string): Classroom[] => {
  if (!isWindowAvailable()) return DEFAULT_CLASSROOMS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLASSROOMS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CLASSROOMS, JSON.stringify(DEFAULT_CLASSROOMS));
      return DEFAULT_CLASSROOMS;
    }
    const allRooms: Classroom[] = JSON.parse(raw);
    if (!teacherId) return allRooms;
    return allRooms.filter((r) => r.teacherId === teacherId);
  } catch (error) {
    console.error('Error fetching classrooms:', error);
    return DEFAULT_CLASSROOMS;
  }
};

export const getClassroomByCode = (roomCode: string): Classroom | null => {
  const allRooms = getTeacherClassrooms();
  return allRooms.find((r) => r.roomCode.toLowerCase() === roomCode.toLowerCase()) || null;
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

export const updateClassroomStatus = (classroomId: string, status: ClassroomStatus): Classroom[] => {
  const allRooms = getTeacherClassrooms();
  const updated = allRooms.map((r) =>
    r.id === classroomId ? { ...r, status, isActive: status === 'live' } : r
  );
  if (isWindowAvailable()) {
    try {
      localStorage.setItem(STORAGE_KEYS.CLASSROOMS, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to update classroom status:', error);
    }
  }
  return updated;
};

export const endClassroomByCode = (roomCode: string): Classroom[] => {
  const allRooms = getTeacherClassrooms();
  const updated = allRooms.map((r) =>
    r.roomCode.toLowerCase() === roomCode.toLowerCase()
      ? { ...r, status: 'ended' as ClassroomStatus, isActive: false }
      : r
  );
  if (isWindowAvailable()) {
    try {
      localStorage.setItem(STORAGE_KEYS.CLASSROOMS, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to end classroom:', error);
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
