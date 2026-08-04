import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import type { UserProfile } from './types';
import { HomeScreen } from './screens/HomeScreen';
import { TeacherDashboard } from './screens/TeacherDashboard';
import { StudentDashboard } from './screens/StudentDashboard';
import { MeetingRoom } from './screens/MeetingRoom';
import { Header } from './components/common/Header';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [activeRoomTitle, setActiveRoomTitle] = useState<string>('Lớp Học Trực Tuyến Tương Tác');

  // Bug 2: Handle Direct Link Access (/room/:roomCode or /join/:roomCode)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const urlName = params.get('name');

      if (pathname.includes('/room/') || pathname.includes('/join/')) {
        const parts = pathname.split('/');
        const code = parts[parts.length - 1];
        if (code) {
          setActiveRoomCode(code);
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
            // No student name in session -> set user null to trigger JoinRoomNameModal
            setCurrentUser(null);
          }
        }
      }
    }
  }, []);

  const handleLogin = (user: UserProfile, roomCode?: string) => {
    setCurrentUser(user);
    if (roomCode) {
      setActiveRoomCode(roomCode);
      if (user.role === 'student' && typeof window !== 'undefined') {
        sessionStorage.setItem(`student_name_${roomCode}`, user.fullName);
        sessionStorage.setItem(`student_id_${roomCode}`, user.id);
      }
    }
  };

  const handleStartRoom = (roomCode: string, title?: string) => {
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
      </View>
    );
  }

  return <HomeScreen onLogin={handleLogin} />;
};

const styles = StyleSheet.create({
  appWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});

export default App;
