import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnvUrl = (): string => {
  if (typeof window !== 'undefined') {
    const localUrl = localStorage.getItem('VITE_SUPABASE_URL');
    if (localUrl && localUrl.includes('.supabase.co')) return localUrl;
  }
  return import.meta.env.VITE_SUPABASE_URL || 'https://demo-kid-classroom.supabase.co';
};

const getEnvKey = (): string => {
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem(KEY_NAME);
    if (localKey && localKey.length > 20) return localKey;
  }
  return import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo-key';
};

const KEY_NAME = 'VITE_SUPABASE_ANON_KEY';

export const isSupabaseConfigured = (): boolean => {
  const url = getEnvUrl();
  const key = getEnvKey();
  return Boolean(url && key && !url.includes('demo-kid-classroom') && key.length > 20);
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
