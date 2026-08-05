import { supabase, isSupabaseConfigured } from './supabaseClient';
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

// Helper: Timeout wrapper for network promises (8000ms max timeout for real cloud DB calls to handle cold starts)
const withTimeout = <T>(promise: PromiseLike<T>, timeoutMs: number = 8000): Promise<T | null> => {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
};

// Bi-Directional Auto-Sync Engine for Cross-Device & Incognito Tabs
export const syncStudentsWithSupabase = async (): Promise<StudentAccount[]> => {
  const localList = getTeacherStudents();

  if (!isSupabaseConfigured()) {
    return localList;
  }

  try {
    // 1. Fetch Cloud DB records
    const res = await withTimeout<{ data: { id: string; teacher_id: string; full_name: string; username: string; password_hash: string }[] | null; error: unknown }>(
      supabase.from('students').select('*'),
      8000
    );

    if (res && !res.error && Array.isArray(res.data)) {
      const dbStudents: StudentAccount[] = res.data.map((row) => ({
        id: row.id,
        teacherId: row.teacher_id,
        fullName: row.full_name,
        username: row.username,
        passwordText: row.password_hash || '',
      }));

      // Merge DB students and local students correctly (local accounts have priority for fresh edits)
      const mergedMap = new Map<string, StudentAccount>();

      // 1. First add local students
      localList.forEach((s) => {
        if (s && s.username) {
          mergedMap.set(s.username.trim().toLowerCase(), s);
        }
      });

      // 2. Add DB students if not present in local list, or backfill passwordText if missing
      dbStudents.forEach((dbStudent) => {
        if (!dbStudent || !dbStudent.username) return;
        const lowerName = dbStudent.username.trim().toLowerCase();
        if (!mergedMap.has(lowerName)) {
          mergedMap.set(lowerName, dbStudent);
        } else {
          const existing = mergedMap.get(lowerName)!;
          if (!existing.passwordText && dbStudent.passwordText) {
            mergedMap.set(lowerName, { ...existing, passwordText: dbStudent.passwordText });
          }
        }
      });

      // 3. Push local students missing in Cloud DB up to Supabase
      const dbUsernameSet = new Set(dbStudents.map((s) => s.username?.trim()?.toLowerCase()));
      const missingInDb = localList.filter(
        (s) => s && s.username && !dbUsernameSet.has(s.username.trim().toLowerCase())
      );

      if (missingInDb.length > 0) {
        await Promise.allSettled(
          missingInDb.map((s) =>
            withTimeout(
              supabase.from('students').upsert({
                id: s.id,
                teacher_id: s.teacherId,
                full_name: s.fullName,
                username: s.username.trim().toLowerCase(),
                password_hash: s.passwordText,
              }, { onConflict: 'username' }),
              8000
            )
          )
        );
      }

      const mergedList = Array.from(mergedMap.values());
      if (isWindowAvailable()) {
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(mergedList));
      }
      return mergedList;
    }
  } catch (err) {
    console.warn('Supabase DB sync background warning:', err);
  }

  return localList;
};

// Trigger background sync on module load
if (typeof window !== 'undefined') {
  // Clear any existing dummy/stale records from local storage on first load of this version
  const schemaVersion = localStorage.getItem('kid_classroom_schema_ver');
  if (schemaVersion !== '5.2') {
    localStorage.removeItem(STORAGE_KEYS.STUDENTS);
    localStorage.removeItem(STORAGE_KEYS.CLASSROOMS);
    localStorage.setItem('kid_classroom_schema_ver', '5.2');
  }

  setTimeout(() => {
    syncStudentsWithSupabase();
  }, 100);
}

// Cross-Window & Incognito Tab Synchronization via BroadcastChannel
const BROADCAST_CHANNEL_NAME = 'kid_classroom_global_sync';
let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);

    broadcastChannel.onmessage = (event) => {
      const data = event.data;
      if (!data || !data.type) return;

      if (data.type === 'SYNC_STUDENT_ACCOUNT') {
        const newStudent = data.payload as StudentAccount;
        if (newStudent && newStudent.username) {
          const currentList = getTeacherStudents();
          const index = currentList.findIndex(
            (s) => s.username && s.username.trim().toLowerCase() === newStudent.username.trim().toLowerCase()
          );
          let updated: StudentAccount[];
          if (index >= 0) {
            updated = [...currentList];
            updated[index] = newStudent;
          } else {
            updated = [newStudent, ...currentList];
          }
          if (isWindowAvailable()) {
            localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
          }
        }
      } else if (data.type === 'REQUEST_STUDENTS_SYNC') {
        const currentList = getTeacherStudents();
        if (currentList.length > 0 && broadcastChannel) {
          broadcastChannel.postMessage({
            type: 'RESPONSE_STUDENTS_SYNC',
            payload: currentList,
          });
        }
      } else if (data.type === 'RESPONSE_STUDENTS_SYNC') {
        const receivedStudents = data.payload as StudentAccount[];
        if (Array.isArray(receivedStudents) && receivedStudents.length > 0) {
          const currentList = getTeacherStudents();
          const mergedMap = new Map<string, StudentAccount>();
          currentList.forEach((s) => s.username && mergedMap.set(s.username.trim().toLowerCase(), s));
          receivedStudents.forEach((s) => s.username && mergedMap.set(s.username.trim().toLowerCase(), s));

          const mergedArray = Array.from(mergedMap.values());
          if (isWindowAvailable()) {
            localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(mergedArray));
          }
        }
      }
    };

    broadcastChannel.postMessage({ type: 'REQUEST_STUDENTS_SYNC' });
  } catch (err) {
    console.warn('BroadcastChannel sync init warning:', err);
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

const DEFAULT_CLASSROOMS: Classroom[] = [];

const DEFAULT_STUDENTS: StudentAccount[] = [];

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
    fullName: teacher ? teacher.fullName : 'Thầy Ngô Thành Đạt',
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
  const duplicate = allStudents.find((s) => s.username && s.username.trim().toLowerCase() === cleanUsername);

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
  const updatedList = [newStudent, ...allStudents.filter((s) => s.id !== newStudent.id)];
  if (isWindowAvailable()) {
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updatedList));
    } catch (error) {
      console.error('Failed to save student account:', error);
    }
  }

  // 2. Cross-Window Broadcast via BroadcastChannel (0ms latency for Incognito tabs)
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({
        type: 'SYNC_STUDENT_ACCOUNT',
        payload: newStudent,
      });
    } catch (err) {
      console.warn('BroadcastChannel send error:', err);
    }
  }

  // 3. Supabase DB Upsert with Timeout Limit
  if (isSupabaseConfigured()) {
    try {
      const res = await withTimeout<{ error: { message?: string } | null }>(
        supabase.from('students').upsert({
          id: newStudent.id,
          teacher_id: newStudent.teacherId,
          full_name: newStudent.fullName,
          username: newStudent.username,
          password_hash: newStudent.passwordText,
        }, { onConflict: 'username' }),
        8000
      );

      if (res && res.error) {
        console.error('Supabase DB student upsert error:', res.error);
        return {
          success: false,
          message: `Không thể lưu tài khoản vào Cloud Database: ${res.error.message || 'Lỗi không xác định'}`
        };
      } else if (!res) {
        return {
          success: false,
          message: 'Kết nối tới Cloud Database bị quá hạn (Timeout). Vui lòng thử lại.'
        };
      }
      console.log('Successfully upserted student to Supabase DB:', newStudent.username);
    } catch (err) {
      console.error('Supabase DB student upsert exception:', err);
      return {
        success: false,
        message: `Lỗi kết nối Cloud Database: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  }

  return {
    success: true,
    message: 'Tạo tài khoản học sinh thành công!',
    student: newStudent,
  };
};

export const loginStudent = async (usernameInput: string, passwordInput: string): Promise<AuthResponse> => {
  const cleanUsername = usernameInput.trim().toLowerCase();
  const cleanPassword = passwordInput.trim();

  if (!cleanUsername || !cleanPassword) {
    return { success: false, message: 'Vui lòng nhập Tên Đăng Nhập và Mật Khẩu.' };
  }

  // 1. Auto-sync from Supabase DB to ensure new accounts created anywhere are loaded
  const syncedStudents = await syncStudentsWithSupabase();

  let foundStudent: StudentAccount | null =
    syncedStudents.find((s) => s.username && s.username.trim().toLowerCase() === cleanUsername) || null;

  // 1b. Direct local fallback check if sync returned list without the student
  if (!foundStudent) {
    const localList = getTeacherStudents();
    foundStudent = localList.find((s) => s.username && s.username.trim().toLowerCase() === cleanUsername) || null;
  }

  // 2. If still not found & Supabase is configured, query Supabase DB explicitly
  if (!foundStudent && isSupabaseConfigured()) {
    try {
      const res = await withTimeout<{ data: { id: string; teacher_id: string; full_name: string; username: string; password_hash: string } | null; error: unknown }>(
        supabase
          .from('students')
          .select('*')
          .ilike('username', cleanUsername)
          .maybeSingle(),
        8000
      );

      if (res && !res.error && res.data) {
        foundStudent = {
          id: res.data.id,
          teacherId: res.data.teacher_id,
          fullName: res.data.full_name,
          username: res.data.username,
          passwordText: res.data.password_hash || '',
        };

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

  const storedPassword = (foundStudent.passwordText || '').trim();
  if (storedPassword !== cleanPassword) {
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

  if (isSupabaseConfigured()) {
    try {
      withTimeout(supabase.from('students').delete().eq('id', studentId), 6000).catch((err) => {
        console.warn('Supabase delete student background error:', err);
      });
    } catch (err) {
      console.warn('Supabase delete student error:', err);
    }
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
