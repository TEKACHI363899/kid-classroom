import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react';
import type { UserProfile } from './types';
import { HomeScreen } from './screens/HomeScreen';
import { TeacherDashboard } from './screens/TeacherDashboard';
import { StudentDashboard } from './screens/StudentDashboard';
import { MeetingRoom } from './screens/MeetingRoom';
import { Header } from './components/common/Header';
import { Modal } from './components/common/Modal';
import {
  getStoredAuthSession,
  clearAuthSession,
  getClassroomByCode,
} from './services/storageService';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [activeRoomTitle, setActiveRoomTitle] = useState<string>('Lớp Học Trực Tuyến Tương Tác');
  const [endedRoomNoticeVisible, setEndedRoomNoticeVisible] = useState<boolean>(false);

  // Version 5.0: App Launch Hook - Persistent Auto-Login & Dual Join Direct Link Auto-Detect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const storedSession = getStoredAuthSession();

      // Check for Direct Link Join (/join/:roomCode or /room/:roomCode)
      if (pathname.includes('/room/') || pathname.includes('/join/')) {
        const parts = pathname.split('/');
        const code = parts[parts.length - 1];

        if (code) {
          const roomObj = getClassroomByCode(code);
          if (roomObj && roomObj.status === 'ended') {
            setEndedRoomNoticeVisible(true);
            return;
          }

          if (storedSession) {
            // Case A: Already logged in -> Auto-enter Meeting Room immediately
            setCurrentUser(storedSession.profile);
            setActiveRoomCode(code);
            if (roomObj?.title) setActiveRoomTitle(roomObj.title);
          } else {
            // Case B: Not logged in -> Save redirect_room_code and open Login Screen
            sessionStorage.setItem('redirect_room_code', code);
            if (roomObj?.title) {
              sessionStorage.setItem('redirect_room_title', roomObj.title);
            }
          }
          return;
        }
      }

      // Default persistent auto-login check
      if (storedSession) {
        setCurrentUser(storedSession.profile);
      }
    }
  }, []);

  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);

    // Version 5.0: Post-Login Direct Link Redirect Check
    if (typeof window !== 'undefined') {
      const redirectCode = sessionStorage.getItem('redirect_room_code');
      const redirectTitle = sessionStorage.getItem('redirect_room_title');

      if (redirectCode) {
        sessionStorage.removeItem('redirect_room_code');
        sessionStorage.removeItem('redirect_room_title');
        setActiveRoomCode(redirectCode);
        if (redirectTitle) setActiveRoomTitle(redirectTitle);
        return;
      }
    }

    setActiveRoomCode(null);
  };

  const handleStartRoom = (roomCode: string, title?: string) => {
    const roomObj = getClassroomByCode(roomCode);
    if (roomObj && roomObj.status === 'ended') {
      setEndedRoomNoticeVisible(true);
      return;
    }
    setActiveRoomCode(roomCode);
    if (title) setActiveRoomTitle(title);
  };

  const handleLeaveRoom = () => {
    setActiveRoomCode(null);
  };

  const handleLogout = () => {
    clearAuthSession();
    setCurrentUser(null);
    setActiveRoomCode(null);
  };

  // Render 1: Inside Active Meeting Room
  if (activeRoomCode) {
    return (
      <MeetingRoom
        user={currentUser}
        roomCode={activeRoomCode}
        roomTitle={activeRoomTitle}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  // Render 2: Teacher Dashboard (Post-Login)
  if (currentUser && currentUser.role === 'teacher') {
    return (
      <View style={styles.appWrapper}>
        <Header userName={currentUser.fullName} role={currentUser.role} onLogout={handleLogout} />
        <TeacherDashboard user={currentUser} onStartRoom={handleStartRoom} />
      </View>
    );
  }

  // Render 3: Student Dashboard (Post-Login / Auto-Logged-In)
  if (currentUser && currentUser.role === 'student') {
    return (
      <View style={styles.appWrapper}>
        <Header userName={currentUser.fullName} role={currentUser.role} onLogout={handleLogout} />
        <StudentDashboard user={currentUser} onJoinRoom={handleStartRoom} />
        <Modal
          visible={endedRoomNoticeVisible}
          onClose={() => setEndedRoomNoticeVisible(false)}
          title="Buổi Học Đã Kết Thúc"
          icon={Lock}
          description="Buổi học này đã được Giáo viên kết thúc. Bạn vui lòng xem các buổi học khác trên lịch dạy."
          confirmLabel="Đã Hiểu"
          confirmVariant="primary"
          onConfirm={() => setEndedRoomNoticeVisible(false)}
        />
      </View>
    );
  }

  // Render 4: Login Screen
  return (
    <>
      <HomeScreen onLogin={handleLogin} />
      <Modal
        visible={endedRoomNoticeVisible}
        onClose={() => setEndedRoomNoticeVisible(false)}
        title="Buổi Học Đã Kết Thúc"
        icon={Lock}
        description="Buổi học này đã được Giáo viên kết thúc. Bạn vui lòng xem các buổi học khác trên lịch dạy."
        confirmLabel="Đã Hiểu"
        confirmVariant="primary"
        onConfirm={() => setEndedRoomNoticeVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  appWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});

export default App;
