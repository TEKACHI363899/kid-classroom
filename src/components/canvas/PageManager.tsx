import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Plus, ChevronDown, ChevronUp, X } from 'lucide-react';
import { COLORS } from '../../constants';
import type { CanvasPage } from '../../types';

const MAX_PAGES = 15;

export interface PageManagerProps {
  pages: CanvasPage[];
  activePageId: string;
  onChangePage: (pageId: string) => void;
  onAddPage: () => void;
  onRemovePage: (pageId: string) => void;
  isTeacher: boolean;
}

export const PageManager: React.FC<PageManagerProps> = ({
  pages,
  activePageId,
  onChangePage,
  onAddPage,
  onRemovePage,
  isTeacher,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const lastActionTimeRef = useRef<number>(0);

  const throttledAction = useCallback((action: () => void, cooldownMs: number = 300) => {
    const now = Date.now();
    if (now - lastActionTimeRef.current < cooldownMs) {
      return;
    }
    lastActionTimeRef.current = now;
    action();
  }, []);

  if (!isTeacher) {
    const currentPageIndex = Math.max(0, pages.findIndex(p => p.id === activePageId));
    return (
      <View style={styles.studentIndicator}>
        <Text style={styles.studentIndicatorText}>
          Trang {currentPageIndex + 1} / {pages.length}
        </Text>
      </View>
    );
  }

  const isMaxPagesReached = pages.length >= MAX_PAGES;

  return (
    <View style={[styles.container, isCollapsed && styles.containerCollapsed]} {...({
      onPointerDown: (e: any) => e.stopPropagation(),
      onPointerUp: (e: any) => e.stopPropagation(),
      onClick: (e: any) => e.stopPropagation(),
    } as any)}>
      <View style={styles.headerRow}>
        {!isCollapsed && <Text style={styles.headerTitle}>Trang</Text>}
        <TouchableOpacity onPress={() => setIsCollapsed(!isCollapsed)} style={styles.collapseBtn}>
          {isCollapsed ? <ChevronUp size={16} color={COLORS.gray600} /> : <ChevronDown size={16} color={COLORS.gray600} />}
        </TouchableOpacity>
      </View>
      
      {!isCollapsed && (
        <>
          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.list}>
            {pages.map((page, index) => {
              const isActive = page.id === activePageId;
              const canDelete = page.id !== 'page-1';
              return (
                <View key={page.id} style={styles.pageItemRow}>
                  <TouchableOpacity
                    style={[styles.pageItem, isActive && styles.pageItemActive]}
                    onPress={() => throttledAction(() => onChangePage(page.id), 200)}
                  >
                    <Text style={[styles.pageText, isActive && styles.pageTextActive]}>
                      {index + 1}
                    </Text>
                  </TouchableOpacity>
                  {canDelete && (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => throttledAction(() => onRemovePage(page.id), 350)}
                    >
                      <X size={12} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={[styles.addBtn, isMaxPagesReached && styles.addBtnDisabled]}
            disabled={isMaxPagesReached}
            onPress={() => throttledAction(onAddPage, 350)}
          >
            <Plus size={16} color={isMaxPagesReached ? COLORS.gray400 : COLORS.white} />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: 12,
    padding: 8,
    width: 52,
    maxHeight: 250,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 35,
  } as any,
  containerCollapsed: {
    width: 'auto',
    maxHeight: 'auto',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  studentIndicator: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 35,
  } as any,
  studentIndicatorText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  collapseBtn: {
    padding: 2,
    alignSelf: 'center',
  },
  scrollArea: {
    width: '100%',
    flexGrow: 0,
  },
  list: {
    alignItems: 'center',
    gap: 8,
    paddingBottom: 4,
  },
  pageItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  pageItem: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pageItemActive: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.primary,
  },
  pageText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  pageTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  deleteBtn: {
    position: 'absolute',
    top: -6,
    right: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  addBtn: {
    marginTop: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnDisabled: {
    backgroundColor: COLORS.gray200,
  },
});
