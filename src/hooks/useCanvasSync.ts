import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import type { CanvasStroke, DrawingPermissionState, CanvasPage, CanvasPageState } from '../types';
import { peerService } from '../services/peerService';

export interface UseCanvasSyncProps {
  roomId: string;
  userId: string;
  userName: string;
  isTeacher: boolean;
}

export interface UseCanvasSyncReturn {
  strokes: CanvasStroke[];
  permissionState: DrawingPermissionState;
  addStroke: (stroke: CanvasStroke) => void;
  removeStroke: (strokeId: string) => void;
  clearCanvas: (pageId?: string) => void;
  updateStudentPermission: (studentId: string, canDraw: boolean) => void;
  setGlobalCanDraw: (canDraw: boolean) => void;
  canCurrentUserDraw: boolean;
  receiveStroke: (stroke: CanvasStroke) => void;
  receiveBulkStrokes: (strokes: CanvasStroke[]) => void;
  receiveRemoveStroke: (strokeId: string) => void;
  receiveClear: (pageId?: string) => void;
  receivePermission: (state: DrawingPermissionState) => void;
  pages: CanvasPage[];
  activePageId: string;
  addPage: () => void;
  changePage: (pageId: string) => void;
  removePage: (pageId: string) => void;
  receivePageState: (state: CanvasPageState) => void;
}

export function useCanvasSync({
  roomId,
  userId,
  userName,
  isTeacher,
}: UseCanvasSyncProps): UseCanvasSyncReturn {
  const [strokes, setStrokes] = useState<CanvasStroke[]>([]);
  const [pages, setPages] = useState<CanvasPage[]>([{ id: 'page-1', title: 'Trang 1' }]);
  const [activePageId, setActivePageId] = useState<string>('page-1');
  const [permissionState, setPermissionState] = useState<DrawingPermissionState>({
    globalCanDraw: false,
    studentPermissions: {},
  });

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Define receivers for both Supabase Realtime & WebRTC fallback to handle messages
  const receiveStroke = useCallback((incomingStroke: CanvasStroke) => {
    setStrokes((prev) => {
      if (prev.some((s) => s.id === incomingStroke.id)) return prev;
      return [...prev, incomingStroke];
    });
  }, []);

  const receiveBulkStrokes = useCallback((incomingStrokes: CanvasStroke[]) => {
    if (!Array.isArray(incomingStrokes) || incomingStrokes.length === 0) return;
    setStrokes((prev) => {
      const existingIdSet = new Set(prev.map((s) => s.id));
      const newUnique = incomingStrokes.filter((s) => s && s.id && !existingIdSet.has(s.id));
      if (newUnique.length === 0) return prev;
      return [...prev, ...newUnique];
    });
  }, []);

  const receiveRemoveStroke = useCallback((strokeId: string) => {
    setStrokes((prev) => prev.filter((s) => s.id !== strokeId));
  }, []);

  const receiveClear = useCallback((pageId?: string) => {
    if (pageId) {
      setStrokes((prev) => prev.filter((s) => (s.pageId || 'page-1') !== pageId));
    } else {
      setStrokes([]);
    }
  }, []);

  const receivePermission = useCallback((nextState: DrawingPermissionState) => {
    setPermissionState(nextState);
  }, []);

  const receivePageState = useCallback((state: CanvasPageState) => {
    if (state && Array.isArray(state.pages) && state.pages.length > 0) {
      setPages(state.pages);
      const targetId = state.activePageId || state.pages[0].id;
      const exists = state.pages.some((p) => p.id === targetId);
      setActivePageId(exists ? targetId : state.pages[0].id);
    }
  }, []);

  // Initialize Supabase Broadcast Channel
  useEffect(() => {
    if (!roomId) return;

    const channelName = `room_canvas_${roomId}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
      },
    });

    channel
      .on('broadcast', { event: 'stroke' }, (payload) => {
        if (payload.payload) {
          receiveStroke(payload.payload as CanvasStroke);
        }
      })
      .on('broadcast', { event: 'sync_strokes' }, (payload) => {
        if (payload.payload) {
          receiveBulkStrokes(payload.payload as CanvasStroke[]);
        }
      })
      .on('broadcast', { event: 'remove_stroke' }, (payload) => {
        if (payload.payload) {
          const strokeId = (payload.payload as { strokeId: string }).strokeId;
          receiveRemoveStroke(strokeId);
        }
      })
      .on('broadcast', { event: 'clear' }, (payload) => {
        const pageId = (payload.payload as { pageId?: string })?.pageId;
        receiveClear(pageId);
      })
      .on('broadcast', { event: 'permission' }, (payload) => {
        if (payload.payload) {
          receivePermission(payload.payload as DrawingPermissionState);
        }
      })
      .on('broadcast', { event: 'page_state' }, (payload) => {
        if (payload.payload) {
          receivePageState(payload.payload as CanvasPageState);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomId, receiveStroke, receiveBulkStrokes, receiveRemoveStroke, receiveClear, receivePermission, receivePageState]);

  const addStroke = useCallback(
    (newStroke: CanvasStroke) => {
      setStrokes((prev) => {
        if (prev.some((s) => s.id === newStroke.id)) return prev;
        return [...prev, newStroke];
      });

      if (channelRef.current?.state === 'joined') {
        channelRef.current.send({
          type: 'broadcast',
          event: 'stroke',
          payload: newStroke,
        });
      }

      peerService.broadcastData({
        type: 'stroke',
        payload: newStroke,
      });
    },
    []
  );

  const removeStroke = useCallback(
    (strokeId: string) => {
      setStrokes((prev) => prev.filter((s) => s.id !== strokeId));

      if (channelRef.current?.state === 'joined') {
        channelRef.current.send({
          type: 'broadcast',
          event: 'remove_stroke',
          payload: { strokeId },
        });
      }

      peerService.broadcastData({
        type: 'remove_stroke',
        payload: { strokeId },
      });
    },
    []
  );

  const clearCanvas = useCallback((pageId?: string) => {
    if (!isTeacher) return;

    if (pageId) {
      setStrokes((prev) => prev.filter((s) => (s.pageId || 'page-1') !== pageId));
    } else {
      setStrokes([]);
    }

    if (channelRef.current?.state === 'joined') {
      channelRef.current.send({
        type: 'broadcast',
        event: 'clear',
        payload: { pageId },
      });
    }

    peerService.broadcastData({
      type: 'clear',
      payload: { pageId },
    });
  }, [isTeacher]);

  const updateStudentPermission = useCallback(
    (studentId: string, canDraw: boolean) => {
      if (!isTeacher) return;

      setPermissionState((prev) => {
        const nextState: DrawingPermissionState = {
          ...prev,
          studentPermissions: {
            ...prev.studentPermissions,
            [studentId]: canDraw,
          },
        };

        if (channelRef.current?.state === 'joined') {
          channelRef.current.send({
            type: 'broadcast',
            event: 'permission',
            payload: nextState,
          });
        }

        peerService.broadcastData({
          type: 'permission',
          payload: nextState,
        });

        return nextState;
      });
    },
    [isTeacher]
  );

  const setGlobalCanDraw = useCallback(
    (canDraw: boolean) => {
      if (!isTeacher) return;

      setPermissionState((prev) => {
        const nextState: DrawingPermissionState = {
          ...prev,
          globalCanDraw: canDraw,
        };

        if (channelRef.current?.state === 'joined') {
          channelRef.current.send({
            type: 'broadcast',
            event: 'permission',
            payload: nextState,
          });
        }

        peerService.broadcastData({
          type: 'permission',
          payload: nextState,
        });

        return nextState;
      });
    },
    [isTeacher]
  );

  const changePage = useCallback((pageId: string) => {
    if (!isTeacher) return;
    const targetPage = pages.find((p) => p.id === pageId);
    if (!targetPage) return;

    setActivePageId(pageId);
    
    const nextState = { pages, activePageId: pageId };
    
    if (channelRef.current?.state === 'joined') {
      channelRef.current.send({
        type: 'broadcast',
        event: 'page_state',
        payload: nextState,
      });
    }
    peerService.broadcastData({
      type: 'page_state',
      payload: nextState,
    });
  }, [isTeacher, pages]);

  const addPage = useCallback(() => {
    if (!isTeacher) return;
    if (pages.length >= 15) return; // Limit to maximum 15 pages

    const newPageId = `page-${Date.now()}`;
    const newPage = { id: newPageId, title: `Trang ${pages.length + 1}` };
    const nextPages = [...pages, newPage];
    
    setPages(nextPages);
    setActivePageId(newPageId);

    const nextState = { pages: nextPages, activePageId: newPageId };

    if (channelRef.current?.state === 'joined') {
      channelRef.current.send({
        type: 'broadcast',
        event: 'page_state',
        payload: nextState,
      });
    }
    peerService.broadcastData({
      type: 'page_state',
      payload: nextState,
    });
  }, [isTeacher, pages]);

  const removePage = useCallback((pageId: string) => {
    if (!isTeacher) return;
    if (pageId === 'page-1') return; // Cannot delete default page

    const nextPages = pages.filter((p) => p.id !== pageId);
    if (nextPages.length === 0) return;

    // Purge strokes belonging to the removed page to prevent memory leak
    setStrokes((prev) => prev.filter((s) => (s.pageId || 'page-1') !== pageId));

    let nextActiveId = activePageId;
    if (activePageId === pageId) {
      nextActiveId = nextPages[0].id;
    }

    setPages(nextPages);
    setActivePageId(nextActiveId);

    const nextState = { pages: nextPages, activePageId: nextActiveId };

    if (channelRef.current?.state === 'joined') {
      channelRef.current.send({
        type: 'broadcast',
        event: 'page_state',
        payload: nextState,
      });
    }
    peerService.broadcastData({
      type: 'page_state',
      payload: nextState,
    });
  }, [isTeacher, pages, activePageId]);

  const canCurrentUserDraw = isTeacher
    ? true
    : (permissionState.globalCanDraw || (permissionState.studentPermissions[userId] === true || permissionState.studentPermissions[userName] === true));

  return {
    strokes,
    permissionState,
    addStroke,
    removeStroke,
    clearCanvas,
    updateStudentPermission,
    setGlobalCanDraw,
    canCurrentUserDraw,
    receiveStroke,
    receiveBulkStrokes,
    receiveRemoveStroke,
    receiveClear,
    receivePermission,
    pages,
    activePageId,
    addPage,
    changePage,
    removePage,
    receivePageState,
  };
}
