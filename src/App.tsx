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
import { getClassroomByCode } from './services/storageService';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [activeRoomTitle, setActiveRoomTitle] = useState<string>('Lớp Học Trực Tuyến Tương Tác');
  const [endedRoomNoticeVisible, setEndedRoomNoticeVisible] = useState<boolean>(false);

  // Version 3.1: Routing & Distinction of 2 Link Types
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const studentCode = params.get('student_code') || params.get('code');
      const urlName = params.get('name');

      // Link Type 1: Student Account Login Link (?student_code=HS123 or ?name=HocSinhAn on /login or /)
      if (studentCode || (urlName && !pathname.includes('/join/') && !pathname.includes('/room/'))) {
        const studentUser: UserProfile = {
          id: `std-${studentCode || Date.now()}`,
          fullName: urlName || 'Học Sinh',
          role: 'student',
        };
        setCurrentUser(studentUser);
        setActiveRoomCode(null); // Never auto-open meeting room! Opens StudentDashboard.
        return;
      }

      // Link Type 2: Direct Classroom Join Link (/join/:roomCode or /room/:roomCode)
      if (pathname.includes('/room/') || pathname.includes('/join/')) {
        const parts = pathname.split('/');
        const code = parts[parts.length - 1];
        if (code) {
          const roomObj = getClassroomByCode(code);
          if (roomObj && roomObj.status === 'ended') {
            setEndedRoomNoticeVisible(true);
            return;
          }

          setActiveRoomCode(code);
          if (roomObj?.title) {
            setActiveRoomTitle(roomObj.title);
          }

          const sessName = sessionStorage.getItem(`student_name_${code}`) || urlName;
          const sessId = sessionStorage.getItem(`student_id_${code}`);

          if (sessName) {
            const finalId = sessId || `std-${Date.now()}`;
            sessionStorage.setItem(`student_name_${code}`, sessName);
            sessionStorage.setItem(`student_id_${code}`, finalId);
            setCurrentUser({
              id: finalId,
              fullName: sessName,
              role: 'student',
            });
          } else {
            setCurrentUser(null);
          }
        }
      }
    }
  }, []);

  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
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
    setCurrentUser(null);
    setActiveRoomCode(null);
  };

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

  if (currentUser && currentUser.role === 'teacher') {
    return (
      <View style={styles.appWrapper}>
        <Header userName={currentUser.fullName} role={currentUser.role} onLogout={handleLogout} />
        <TeacherDashboard onStartRoom={handleStartRoom} />
      </View>
    );
  }

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
