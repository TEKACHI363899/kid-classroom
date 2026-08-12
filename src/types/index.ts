export type UserRole = 'teacher' | 'student';

export type ToolType = 'pencil' | 'text' | 'eraser' | 'select';

export type ClassroomStatus = 'scheduled' | 'live' | 'ended';

export interface UserProfile {
  id: string;
  fullName: string;
  role: UserRole;
  username?: string;
  email?: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface AuthSession {
  token: string;
  userRole: UserRole;
  profile: UserProfile;
  createdAt: string;
}

export interface TeacherAccount {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface StudentAccount {
  id: string;
  teacherId: string;
  fullName: string;
  username: string;
  passwordText: string;
  createdAt?: string;
}

export interface WebRTCConnection {
  connectionId: string;
  userId: string;
  userName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  streamType: 'user_media' | 'screen_share';
  stream?: MediaStream;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: UserProfile;
}

export interface Participant {
  id: string;
  userId?: string;
  userName: string;
  role: UserRole;
  isCamOn: boolean;
  isMicOn: boolean;
  canDraw: boolean;
  stream?: MediaStream;
  isScreenSharing?: boolean;
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

export interface TeacherStudent extends StudentAccount {}

export interface Classroom {
  id: string;
  title: string;
  teacherId: string;
  scheduledStart: string;
  scheduledEnd: string;
  roomCode: string;
  status: ClassroomStatus;
  assignedStudents?: string[];
  isActive?: boolean;
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
  pageId?: string;
}

export interface CanvasPage {
  id: string;
  title: string;
}

export interface CanvasPageState {
  pages: CanvasPage[];
  activePageId: string;
}

export interface DrawingPermissionState {
  globalCanDraw: boolean;
  studentPermissions: Record<string, boolean>;
}

export interface StreamParticipant extends Participant {}
