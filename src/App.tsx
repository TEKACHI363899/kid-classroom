import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Lock, AlertCircle } from 'lucide-react';
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
  getClassroomByCodeOnline,
} from './services/storageService';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [activeRoomTitle, setActiveRoomTitle] = useState<string>('Lớp Học Trực Tuyến Tương Tác');
  const [endedRoomNoticeVisible, setEndedRoomNoticeVisible] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

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
          const checkAndJoin = async () => {
            const roomObj = await getClassroomByCodeOnline(code);
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
          };

          checkAndJoin();
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

  const handleStartRoom = (roomCode: string, _title?: string) => {
    const roomObj = getClassroomByCode(roomCode);
    if (roomObj && roomObj.status === 'ended') {
      setEndedRoomNoticeVisible(true);
      return;
    }
    
    // Open room in a new browser tab/window
    if (typeof window !== 'undefined') {
      const roomUrl = `/room/${roomCode}`;
      const newWin = window.open(roomUrl, '_blank');
      if (!newWin) {
        alert('Trinh duyet da chan cua so bat len (pop-up). Vui long cho phep bat len de vao lop hoc!');
      }
    }
  };

  const handleLeaveRoom = () => {
    if (
      typeof window !== 'undefined' &&
      (window.location.pathname.includes('/room/') || window.location.pathname.includes('/join/'))
    ) {
      try {
        window.close();
      } catch (e) {
        console.warn('Failed to close window automatically:', e);
      }
      // Fallback redirection in case tab closing was blocked
      window.location.href = '/';
      return;
    }
    setActiveRoomCode(null);
  };

  const handleLogout = () => {
    clearAuthSession();
    setCurrentUser(null);
    setActiveRoomCode(null);
  };

  const renderOfflineBanner = () => {
    if (isOnline) return null;
    return (
      <View style={styles.offlineBanner}>
        <AlertCircle size={18} color="#92400E" />
        <Text style={styles.offlineText}>
          Mat ket noi Internet. Vui long kiem tra lai duong truyen thiet bi!
        </Text>
      </View>
    );
  };

  // Render 1: Inside Active Meeting Room
  if (activeRoomCode) {
    return (
      <>
        {renderOfflineBanner()}
        <MeetingRoom
          user={currentUser}
          roomCode={activeRoomCode}
          roomTitle={activeRoomTitle}
          onLeaveRoom={handleLeaveRoom}
        />
      </>
    );
  }

  // Render 2: Teacher Dashboard (Post-Login)
  if (currentUser && currentUser.role === 'teacher') {
    return (
      <View style={styles.appWrapper}>
        {renderOfflineBanner()}
        <Header userName={currentUser.fullName} role={currentUser.role} onLogout={handleLogout} />
        <TeacherDashboard user={currentUser} onStartRoom={handleStartRoom} />
      </View>
    );
  }

  // Render 3: Student Dashboard (Post-Login / Auto-Logged-In)
  if (currentUser && currentUser.role === 'student') {
    return (
      <View style={styles.appWrapper}>
        {renderOfflineBanner()}
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
      {renderOfflineBanner()}
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
  offlineBanner: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: '#F59E0B',
    zIndex: 999,
  },
  offlineText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default App;

