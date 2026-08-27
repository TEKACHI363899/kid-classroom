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
import { ErrorBoundary } from './components/common/ErrorBoundary';
import {
  getStoredAuthSession,
  clearAuthSession,
  getClassroomByCode,
  getClassroomByCodeOnline,
  saveAuthSession,
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

      // Check for Direct Link Join (/join/:roomCode or /room/:roomCode or ?room= / ?code=)
      let detectedCode = '';
      const params = new URLSearchParams(window.location.search);
      const queryCode = params.get('room') || params.get('code');

      if (pathname.includes('/room/') || pathname.includes('/join/')) {
        const segments = pathname.split('/').filter(Boolean);
        detectedCode = segments[segments.length - 1] || '';
      } else if (queryCode) {
        detectedCode = queryCode;
      }

      if (detectedCode) {
        const checkAndJoin = async () => {
          const roomObj = await getClassroomByCodeOnline(detectedCode);
          if (roomObj && roomObj.status === 'ended') {
            setEndedRoomNoticeVisible(true);
            return;
          }

          const queryName = params.get('name') || params.get('student');

          // Pre-approve room access for 1-Click direct entry without waiting room barrier
          if (typeof window !== 'undefined') {
            localStorage.setItem(`approved_room_${detectedCode}`, 'true');
          }

          if (storedSession && storedSession.profile.role === 'teacher') {
            // Case A: Logged-in Teacher -> Auto-enter Meeting Room as Teacher
            setCurrentUser(storedSession.profile);
            setActiveRoomCode(detectedCode);
            if (roomObj?.title) setActiveRoomTitle(roomObj.title);
          } else {
            // Case B: Student direct join (no login, no prompt, zero input) -> Auto-enter as "Học sinh 1"
            const effectiveName =
              (queryName ? queryName.trim() : '') ||
              storedSession?.profile?.fullName ||
              'Học sinh 1';

            const guestStudent: UserProfile = {
              id: storedSession?.profile?.id || `std-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              fullName: effectiveName,
              role: 'student',
            };

            saveAuthSession(guestStudent);
            setCurrentUser(guestStudent);
            setActiveRoomCode(detectedCode);
            if (roomObj?.title) setActiveRoomTitle(roomObj.title);
          }
        };

        checkAndJoin();
        return;
      }

      // Default persistent auto-login check
      if (storedSession) {
        setCurrentUser(storedSession.profile);
      }
    }
  }, []);

  const handleLogin = (user: UserProfile, roomCode?: string) => {
    setCurrentUser(user);

    if (roomCode) {
      setActiveRoomCode(roomCode);
      return;
    }

    // Post-Login Direct Link Redirect Check
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
    
    // Open room smoothly: if popup is blocked or on mobile device, fallback seamlessly to in-app view
    if (typeof window !== 'undefined') {
      const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || 
                            ('ontouchstart' in window && window.innerWidth < 1024);
      
      if (isMobileDevice) {
        setActiveRoomCode(roomCode);
        if (title || roomObj?.title) setActiveRoomTitle(title || roomObj?.title || '');
        return;
      }

      const roomUrl = `/room/${roomCode}`;
      const newWin = window.open(roomUrl, '_blank');
      if (!newWin) {
        // Fallback gracefully to active room state without alerting
        setActiveRoomCode(roomCode);
        if (title || roomObj?.title) setActiveRoomTitle(title || roomObj?.title || '');
      }
    } else {
      setActiveRoomCode(roomCode);
      if (title || roomObj?.title) setActiveRoomTitle(title || roomObj?.title || '');
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
          Mất kết nối Internet. Vui lòng kiểm tra lại đường truyền thiết bị!
        </Text>
      </View>
    );
  };

  // Render 1: Inside Active Meeting Room
  if (activeRoomCode) {
    return (
      <ErrorBoundary>
        {renderOfflineBanner()}
        <MeetingRoom
          user={currentUser}
          roomCode={activeRoomCode}
          roomTitle={activeRoomTitle}
          onLeaveRoom={handleLeaveRoom}
        />
      </ErrorBoundary>
    );
  }

  // Render 2: Teacher Dashboard (Post-Login)
  if (currentUser && currentUser.role === 'teacher') {
    return (
      <ErrorBoundary>
        <View style={styles.appWrapper}>
          {renderOfflineBanner()}
          <Header userName={currentUser.fullName} role={currentUser.role} onLogout={handleLogout} />
          <TeacherDashboard user={currentUser} onStartRoom={handleStartRoom} />
        </View>
      </ErrorBoundary>
    );
  }

  // Render 3: Student Dashboard (Post-Login / Auto-Logged-In)
  if (currentUser && currentUser.role === 'student') {
    return (
      <ErrorBoundary>
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
      </ErrorBoundary>
    );
  }

  // Render 4: Login Screen
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
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
