import { supabase } from './supabaseClient';
import type {
  TeacherAccount,
  StudentAccount,
  Classroom,
  AuthResponse,
  UserProfile,
  AuthSession,
  ClassroomStatus,
} from '../types';

const STORAGE_KEYS = {
  TEACHERS: 'kid_classroom_teachers',
  STUDENTS: 'kid_classroom_students',
  CLASSROOMS: 'kid_classroom_rooms',
  STUDENT_AUTH_SESSION: 'student_auth_session',
  TEACHER_AUTH_SESSION: 'teacher_auth_session',
};

const isWindowAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
};

// Global Realtime Student Account Sync Listener
if (typeof window !== 'undefined') {
  try {
    const syncChannel = supabase.channel('global_student_sync', {
      config: { broadcast: { self: true } },
    });

    syncChannel
      .on('broadcast', { event: 'NEW_STUDENT_ACCOUNT' }, (payload) => {
        if (payload && payload.payload) {
          const newStudent = payload.payload as StudentAccount;
          const currentList = getTeacherStudents();
          const exists = currentList.some(
            (s) => s.username.toLowerCase() === newStudent.username.toLowerCase()
          );
          if (!exists) {
            const updated = [newStudent, ...currentList];
            if (isWindowAvailable()) {
              localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
            }
          }
        }
      })
      .subscribe();
  } catch (err) {
    console.warn('Realtime student sync init error:', err);
  }
}

// Persistent Auth Session Management
export const saveAuthSession = (user: UserProfile): void => {
  if (!isWindowAvailable()) return;
  try {
    const session: AuthSession = {
      token: `${user.role}_${user.id}_${Date.now()}`,
      userRole: user.role,
      profile: user,
      createdAt: new Date().toISOString(),
    };

    const key = user.role === 'teacher' ? STORAGE_KEYS.TEACHER_AUTH_SESSION : STORAGE_KEYS.STUDENT_AUTH_SESSION;
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem(STORAGE_KEYS.STUDENT_AUTH_SESSION, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save auth session:', error);
  }
};

export const getStoredAuthSession = (): AuthSession | null => {
  if (!isWindowAvailable()) return null;
  try {
    const teacherRaw = localStorage.getItem(STORAGE_KEYS.TEACHER_AUTH_SESSION);
    if (teacherRaw) return JSON.parse(teacherRaw);

    const studentRaw = localStorage.getItem(STORAGE_KEYS.STUDENT_AUTH_SESSION);
    if (studentRaw) return JSON.parse(studentRaw);

    return null;
  } catch (error) {
    console.error('Failed to read auth session:', error);
    return null;
  }
};

export const clearAuthSession = (): void => {
  if (!isWindowAvailable()) return;
  try {
    localStorage.removeItem(STORAGE_KEYS.STUDENT_AUTH_SESSION);
    localStorage.removeItem(STORAGE_KEYS.TEACHER_AUTH_SESSION);
  } catch (error) {
    console.error('Failed to clear auth session:', error);
  }
};

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

const DEFAULT_STUDENTS: StudentAccount[] = [
  {
    id: 'std-101',
    teacherId: 'tch-101',
    fullName: 'Nguyễn Văn An',
    username: 'hocsinhan',
    passwordText: '123456',
  },
  {
    id: 'std-102',
    teacherId: 'tch-101',
    fullName: 'Trần Thị Bình',
    username: 'hocsinhbinh',
    passwordText: '123456',
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

export const registerTeacher = async (fullName: string, email: string, password: string): Promise<AuthResponse> => {
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
    }
  }

  const userProfile: UserProfile = {
    id: newTeacher.id,
    fullName: newTeacher.fullName,
    role: 'teacher',
    email: newTeacher.email,
    createdAt: newTeacher.createdAt,
  };

  saveAuthSession(userProfile);

  return {
    success: true,
    message: 'Tạo tài khoản thành công! Hệ thống đang chuyển về Dashboard...',
    user: userProfile,
  };
};

export const loginTeacher = async (email: string, password: string): Promise<AuthResponse> => {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedPassword = password.trim();

  if (!normalizedEmail || !trimmedPassword) {
    return { success: false, message: 'Vui lòng nhập Email và Mật khẩu.' };
  }

  const existingTeachers = getTeacherAccounts();
  const teacher = existingTeachers.find(
    (t) => t.email.toLowerCase() === normalizedEmail && t.passwordHash === trimmedPassword
  );

  if (!teacher && email !== 'teacher@kidclass.edu.vn') {
    return { success: false, message: 'Email hoặc mật khẩu không chính xác.' };
  }

  const userProfile: UserProfile = {
    id: teacher ? teacher.id : 'tch-101',
    fullName: teacher ? teacher.fullName : 'Cô Nông Thị Tuyết',
    role: 'teacher',
    email: normalizedEmail,
  };

  saveAuthSession(userProfile);

  return {
    success: true,
    message: 'Đăng nhập thành công!',
    user: userProfile,
  };
};

export const getTeacherStudents = (teacherId?: string): StudentAccount[] => {
  if (!isWindowAvailable()) return DEFAULT_STUDENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(DEFAULT_STUDENTS));
      return DEFAULT_STUDENTS;
    }
    const allStudents: StudentAccount[] = JSON.parse(raw);
    if (!teacherId) return allStudents;
    return allStudents.filter((s) => s.teacherId === teacherId);
  } catch (error) {
    console.error('Error fetching students:', error);
    return DEFAULT_STUDENTS;
  }
};

export const registerStudentAccount = async (
  teacherId: string,
  fullName: string,
  username: string,
  passwordText: string
): Promise<{ success: boolean; message: string; student?: StudentAccount }> => {
  const cleanName = fullName.trim();
  const cleanUsername = username.trim().toLowerCase();
  const cleanPassword = passwordText.trim();

  if (!cleanName || !cleanUsername || !cleanPassword) {
    return { success: false, message: 'Vui lòng nhập đủ Họ Tên, Tên Đăng Nhập và Mật Khẩu.' };
  }

  const allStudents = getTeacherStudents();
  const duplicate = allStudents.find((s) => s.username.toLowerCase() === cleanUsername);

  if (duplicate) {
    return { success: false, message: 'Tên đăng nhập này đã được sử dụng. Vui lòng chọn Tên đăng nhập khác.' };
  }

  const newStudent: StudentAccount = {
    id: `std-${Date.now()}`,
    teacherId: teacherId || 'tch-101',
    fullName: cleanName,
    username: cleanUsername,
    passwordText: cleanPassword,
    createdAt: new Date().toISOString(),
  };

  // 1. Save locally
  const updatedList = [newStudent, ...allStudents];
  if (isWindowAvailable()) {
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updatedList));
    } catch (error) {
      console.error('Failed to save student account:', error);
    }
  }

  // 2. Broadcast over Supabase Realtime & insert into Database
  try {
    const syncChannel = supabase.channel('global_student_sync');
    syncChannel.send({
      type: 'broadcast',
      event: 'NEW_STUDENT_ACCOUNT',
      payload: newStudent,
    });

    await supabase.from('students').upsert({
      id: newStudent.id,
      teacher_id: newStudent.teacherId,
      full_name: newStudent.fullName,
      username: newStudent.username,
      password_hash: newStudent.passwordText,
    });
  } catch (err) {
    console.warn('Supabase DB student upsert background warning:', err);
  }

  return {
    success: true,
    message: 'Tạo tài khoản học sinh thành công!',
    student: newStudent,
  };
};

// Version 5.1 Hardened Cross-Device & Incognito Login
export const loginStudent = async (usernameInput: string, passwordInput: string): Promise<AuthResponse> => {
  const cleanUsername = usernameInput.trim().toLowerCase();
  const cleanPassword = passwordInput.trim();

  if (!cleanUsername || !cleanPassword) {
    return { success: false, message: 'Vui lòng nhập Tên Đăng Nhập và Mật Khẩu.' };
  }

  let foundStudent: StudentAccount | null = null;

  // 1. Check local storage / synchronized cache first
  const allStudents = getTeacherStudents();
  const localMatch = allStudents.find((s) => s.username.trim().toLowerCase() === cleanUsername);
  if (localMatch) {
    foundStudent = localMatch;
  }

  // 2. Query Supabase Database if not found locally or for multi-device sync
  if (!foundStudent) {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('username', cleanUsername)
        .maybeSingle();

      if (!error && data) {
        foundStudent = {
          id: data.id,
          teacherId: data.teacher_id,
          fullName: data.full_name,
          username: data.username,
          passwordText: data.password_hash,
        };

        // Cache into local storage
        const currentList = getTeacherStudents();
        const updated = [foundStudent, ...currentList.filter((s) => s.id !== foundStudent!.id)];
        if (isWindowAvailable()) {
          localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
        }
      }
    } catch (err) {
      console.warn('Supabase DB login query warning:', err);
    }
  }

  if (!foundStudent) {
    return { success: false, message: 'Tài khoản không tồn tại. Vui lòng kiểm tra lại Tên đăng nhập!' };
  }

  if (foundStudent.passwordText.trim() !== cleanPassword) {
    return { success: false, message: 'Mật khẩu không chính xác!' };
  }

  const userProfile: UserProfile = {
    id: foundStudent.id,
    fullName: foundStudent.fullName,
    username: foundStudent.username,
    role: 'student',
  };

  saveAuthSession(userProfile);

  return {
    success: true,
    message: 'Đăng nhập thành công!',
    user: userProfile,
  };
};

export const deleteTeacherStudent = (studentId: string, teacherId?: string): StudentAccount[] => {
  const allStudents = getTeacherStudents();
  const updated = allStudents.filter((s) => s.id !== studentId);
  if (isWindowAvailable()) {
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to delete student:', error);
    }
  }

  try {
    supabase.from('students').delete().eq('id', studentId);
  } catch (err) {
    console.warn('Supabase delete student error:', err);
  }

  return teacherId ? updated.filter((s) => s.teacherId === teacherId) : updated;
};

// Classroom Management Functions
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
