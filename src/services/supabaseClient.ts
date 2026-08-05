import { createClient, SupabaseClient } from '@supabase/supabase-js';

const REAL_SUPABASE_URL = 'https://pgjjxunzdeiubhdezstl.supabase.co';
const REAL_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnamp4dW56ZGVpdWJoZGV6c3RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4MzAyNzcsImV4cCI6MjEwMTQwNjI3N30.cz-6A51lwtAv86t4BpFREpg8hK-NdwG4ICWmgnMQEEA';

const KEY_NAME = 'VITE_SUPABASE_ANON_KEY';

const getEnvUrl = (): string => {
  if (typeof window !== 'undefined') {
    const localUrl = localStorage.getItem('VITE_SUPABASE_URL');
    if (localUrl && localUrl.includes('.supabase.co')) return localUrl;
  }
  return import.meta.env.VITE_SUPABASE_URL || REAL_SUPABASE_URL;
};

const getEnvKey = (): string => {
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem(KEY_NAME);
    if (localKey && localKey.length > 20) return localKey;
  }
  return import.meta.env.VITE_SUPABASE_ANON_KEY || REAL_SUPABASE_ANON_KEY;
};

export const isSupabaseConfigured = (): boolean => {
  const url = getEnvUrl();
  const key = getEnvKey();
  return Boolean(url && key && key.length > 20);
};

export const supabase: SupabaseClient = createClient(getEnvUrl(), getEnvKey(), {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 60,
    },
  },
});

