import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import type { CanvasStroke, DrawingPermissionState } from '../types';
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
  clearCanvas: () => void;
  updateStudentPermission: (studentId: string, canDraw: boolean) => void;
  setGlobalCanDraw: (canDraw: boolean) => void;
  canCurrentUserDraw: boolean;
  receiveStroke: (stroke: CanvasStroke) => void;
  receiveRemoveStroke: (strokeId: string) => void;
  receiveClear: () => void;
  receivePermission: (state: DrawingPermissionState) => void;
}

export function useCanvasSync({
  roomId,
  userId,
  userName,
  isTeacher,
}: UseCanvasSyncProps): UseCanvasSyncReturn {
  const [strokes, setStrokes] = useState<CanvasStroke[]>([]);
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

  const receiveRemoveStroke = useCallback((strokeId: string) => {
    setStrokes((prev) => prev.filter((s) => s.id !== strokeId));
  }, []);

  const receiveClear = useCallback(() => {
    setStrokes([]);
  }, []);

  const receivePermission = useCallback((nextState: DrawingPermissionState) => {
    setPermissionState(nextState);
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
      .on('broadcast', { event: 'remove_stroke' }, (payload) => {
        if (payload.payload) {
          const strokeId = (payload.payload as { strokeId: string }).strokeId;
          receiveRemoveStroke(strokeId);
        }
      })
      .on('broadcast', { event: 'clear' }, () => {
        receiveClear();
      })
      .on('broadcast', { event: 'permission' }, (payload) => {
        if (payload.payload) {
          receivePermission(payload.payload as DrawingPermissionState);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomId, receiveStroke, receiveRemoveStroke, receiveClear, receivePermission]);

  const addStroke = useCallback(
    (newStroke: CanvasStroke) => {
      setStrokes((prev) => {
        if (prev.some((s) => s.id === newStroke.id)) return prev;
        return [...prev, newStroke];
      });

      if (channelRef.current) {
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

      if (channelRef.current) {
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

  const clearCanvas = useCallback(() => {
    if (!isTeacher) return;

    setStrokes([]);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'clear',
        payload: {},
      });
    }

    peerService.broadcastData({
      type: 'clear',
      payload: {},
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

        if (channelRef.current) {
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

        if (channelRef.current) {
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
    receiveRemoveStroke,
    receiveClear,
    receivePermission,
  };
}
