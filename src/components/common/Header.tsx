import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BookOpen, LogOut, ShieldCheck, User } from 'lucide-react';
import { COLORS, ICON_SIZES } from '../../constants';
import type { UserRole } from '../../types';

export interface HeaderProps {
  userName: string;
  role: UserRole;
  roomTitle?: string;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userName,
  role,
  roomTitle,
  onLogout,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.brandGroup}>
        <View style={styles.logoBadge}>
          <BookOpen size={ICON_SIZES.md} color={COLORS.white} />
        </View>
        <View>
          <Text style={styles.brandTitle}>Lớp Học Thông Minh</Text>
          {roomTitle ? (
            <Text style={styles.roomSubtitle} numberOfLines={1}>
              {roomTitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.userGroup}>
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
          <Text style={styles.userName}>{userName}</Text>
        </View>

        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <LogOut size={ICON_SIZES.md} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
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
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  userGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
  logoutBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
  },
});
