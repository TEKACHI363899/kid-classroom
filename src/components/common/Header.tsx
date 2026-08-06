import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { BookOpen, LogOut, ShieldCheck, User, Menu, X, Users, Pencil, PencilOff } from 'lucide-react';
import { COLORS, ICON_SIZES } from '../../constants';
import type { UserRole, StreamParticipant } from '../../types';

import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

export interface HeaderProps {
  userName: string;
  role: UserRole;
  roomTitle?: string;
  onLogout: () => void;
  participants?: StreamParticipant[];
  elapsedSeconds?: number;
}

export const Header: React.FC<HeaderProps> = ({
  userName,
  role,
  roomTitle,
  onLogout,
  participants,
  elapsedSeconds = 0,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isMobile } = useResponsiveLayout();

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  return (
    <View style={styles.header}>
      <View style={styles.brandGroup}>
        {!isMobile && (
          <View style={styles.logoBadge}>
            <BookOpen size={ICON_SIZES.md} color={COLORS.white} />
          </View>
        )}
        <View style={isMobile ? { maxWidth: 80 } : undefined}>
          <Text style={styles.brandTitle} numberOfLines={1}>
            {isMobile ? 'Lớp Học' : 'Lớp Học Thông Minh'}
          </Text>
          {roomTitle ? (
            <Text style={styles.roomSubtitle} numberOfLines={1}>
              {roomTitle}
            </Text>
          ) : null}
        </View>
      </View>

      {roomTitle && (
        <View style={styles.timerContainer}>
          <View style={styles.timerInner}>
            <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
          </View>
        </View>
      )}

      <View style={styles.userGroup}>
        {!isMobile ? (
          <View style={styles.userInfo}>
            <View style={[styles.roleTag, { backgroundColor: role === 'teacher' ? COLORS.purple : COLORS.success }]}>
              {role === 'teacher' ? (
                <ShieldCheck size={ICON_SIZES.sm} color={COLORS.white} />
              ) : (
                <User size={ICON_SIZES.sm} color={COLORS.white} />
              )}
              <Text style={styles.roleText}>
                {role === 'teacher' ? 'Giáo Viên' : 'Học Sinh'}
              </Text>
            </View>
            <Text style={[styles.userName, { maxWidth: 100 }]} numberOfLines={1}>
              {userName}
            </Text>
          </View>
        ) : (
          <View style={[styles.roleTag, { backgroundColor: role === 'teacher' ? COLORS.purple : COLORS.success, paddingHorizontal: 6, paddingVertical: 6, borderRadius: 10 }]}>
            {role === 'teacher' ? (
              <ShieldCheck size={14} color={COLORS.white} />
            ) : (
              <User size={14} color={COLORS.white} />
            )}
          </View>
        )}

        {participants && (
          <TouchableOpacity onPress={() => setIsMenuOpen(!isMenuOpen)} style={styles.menuBtn}>
            <Menu size={ICON_SIZES.md} color={COLORS.textDark} />
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <LogOut size={ICON_SIZES.md} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      {isMenuOpen && participants && (
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <View style={styles.sidebarTitleRow}>
              <Users size={18} color={COLORS.primary} />
              <Text style={styles.sidebarTitle}>Thành Viên ({participants.length})</Text>
            </View>
            <TouchableOpacity onPress={() => setIsMenuOpen(false)} style={styles.closeBtn}>
              <X size={18} color={COLORS.textDark} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.sidebarContent}>
            {participants.map((p) => (
              <View key={p.id} style={styles.sidebarItem}>
                <View style={[styles.avatarMini, { backgroundColor: p.role === 'teacher' ? COLORS.purple : COLORS.primary }]}>
                  {p.role === 'teacher' ? (
                    <ShieldCheck size={12} color={COLORS.white} />
                  ) : (
                    <User size={12} color={COLORS.white} />
                  )}
                </View>
                <Text style={styles.sidebarItemText} numberOfLines={1}>
                  {p.userName} {p.userName === userName ? '(Bạn)' : ''}
                </Text>
                {p.role === 'student' && (
                  <View style={{ marginRight: 4 }}>
                    {p.canDraw ? (
                      <Pencil size={12} color={COLORS.success} />
                    ) : (
                      <PencilOff size={12} color={COLORS.gray400} />
                    )}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 72,
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    zIndex: 10,
    position: 'relative',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 2,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textDark,
  },
  roomSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  timerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 1,
  },
  timerInner: {
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    pointerEvents: 'auto',
  },
  timerText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    fontFamily: 'monospace',
  },
  userGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    zIndex: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  menuBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
  },
  logoutBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
  },
  sidebar: {
    position: 'absolute',
    top: 72,
    right: 0,
    width: 280,
    height: 400,
    backgroundColor: COLORS.white,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.gray200,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 999,
    padding: 16,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.gray100,
    paddingBottom: 10,
    marginBottom: 12,
  },
  sidebarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sidebarTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  closeBtn: {
    padding: 4,
  },
  sidebarContent: {
    flex: 1,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  avatarMini: {
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarItemText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    flex: 1,
  },
});
