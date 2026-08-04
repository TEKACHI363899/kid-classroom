export type UserRole = 'teacher' | 'student';

export type ToolType = 'pencil' | 'text' | 'eraser' | 'select';

export interface UserProfile {
  id: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt?: string;
  email?: string;
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
  message?: string;
  user?: UserProfile;
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

export interface WebRTCMessage {
  type: 'canvas_stroke' | 'canvas_clear' | 'permission_change' | 'chat_message' | 'user_joined';
  senderId: string;
  payload: unknown;
}

export interface StreamParticipant {
  id: string;
  name: string;
  role: UserRole;
  isMicOn: boolean;
  isCamOn: boolean;
  isScreenSharing: boolean;
  canDraw: boolean;
  stream?: MediaStream;
}
