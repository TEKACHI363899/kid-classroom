export type UserRole = 'teacher' | 'student';

export type ToolType = 'pencil' | 'text' | 'eraser' | 'select';

export interface UserProfile {
  id: string;
  fullName: string;
  role: UserRole;
  email?: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface TeacherAccount {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: UserProfile;
}

export interface Participant {
  id: string;
  userName: string;
  role: UserRole;
  isCamOn: boolean;
  isMicOn: boolean;
  canDraw: boolean;
  stream?: MediaStream;
}

export interface FloatingTextInputState {
  visible: boolean;
  x: number; // Absolute px on canvas
  y: number; // Absolute px on canvas
  normX: number; // 0.0 - 1.0
  normY: number; // 0.0 - 1.0
  text: string;
  color: string;
}

export interface TeacherStudent {
  id: string;
  teacherId: string;
  studentName: string;
  accessCode: string;
  createdAt?: string;
}

export interface Classroom {
  id: string;
  title: string;
  teacherId: string;
  scheduledStart: string;
  scheduledEnd: string;
  roomCode: string;
  isActive: boolean;
  createdAt?: string;
}

export interface ClassroomStudent {
  id: string;
  classroomId: string;
  studentId?: string;
  studentName: string;
  canDraw: boolean;
  joinedAt?: string;
}

export interface StrokePoint {
  x: number; // Normalized 0.0 to 1.0
  y: number; // Normalized 0.0 to 1.0
}

export interface CanvasStroke {
  id: string;
  userId: string;
  userName: string;
  toolType: ToolType;
  points: StrokePoint[];
  color: string;
  strokeWidth: number;
  textContent?: string;
  fontSize?: number;
}

export interface DrawingPermissionState {
  globalCanDraw: boolean;
  studentPermissions: Record<string, boolean>;
}

export interface StreamParticipant extends Participant {}
