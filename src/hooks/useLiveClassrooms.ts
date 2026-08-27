import { useState, useEffect, useRef } from 'react';
import type { Classroom } from '../types';
import { fetchClassroomsFromSupabase } from '../services/storageService';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

export const useLiveClassrooms = (teacherId?: string) => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const classroomsRef = useRef<Classroom[]>(classrooms);
  classroomsRef.current = classrooms;

  useEffect(() => {
    let active = true;

    const loadClassrooms = async () => {
      try {
        const data = await fetchClassroomsFromSupabase(teacherId);
        if (active) {
          setClassrooms(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching classrooms in hook:', err);
      }
    };

    // Initial fetch
    loadClassrooms();

    // 1. Setup Supabase Realtime subscription if configured
    let channel: any = null;
    if (isSupabaseConfigured()) {
      channel = supabase
        .channel('public-classrooms-live')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'classrooms',
          },
          () => {
            console.log('Realtime classroom change detected');
            loadClassrooms();
          }
        )
        .subscribe();
    }

    // 2. Setup BroadcastChannel listener for local cross-tab sync
    let broadcastChannel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        broadcastChannel = new BroadcastChannel('kid_classroom_global_sync');
        broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'SYNC_CLASSROOMS') {
            const updatedRooms = event.data.payload as Classroom[];
            if (active && Array.isArray(updatedRooms)) {
              // Filter by teacherId if specified
              const filtered = teacherId
                ? updatedRooms.filter((r) => r.teacherId === teacherId)
                : updatedRooms;
              setClassrooms(filtered);
            }
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel sync classrooms init warning:', e);
      }
    }

    // 3. Setup polling interval only as fallback when Supabase Realtime is not configured
    const pollInterval = !isSupabaseConfigured()
      ? setInterval(() => {
          loadClassrooms();
        }, 5000)
      : null;

    return () => {
      active = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (broadcastChannel) {
        broadcastChannel.close();
      }
    };
  }, [teacherId]);

  return { classrooms, setClassrooms, loading };
};
