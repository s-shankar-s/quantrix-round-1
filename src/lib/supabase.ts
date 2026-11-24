import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isSupabaseConfigured = () => {
  return (
    supabaseUrl.length > 0 &&
    !supabaseUrl.includes('dummy-quantrix-project') &&
    supabaseAnonKey.length > 0 &&
    !supabaseAnonKey.includes('dummy-anon-key')
  );
};

// Client for frontend and realtime subscriptions
export const supabaseClient = createClient(
  supabaseUrl || 'https://dummy.supabase.co',
  supabaseAnonKey || 'dummy-key',
  {
    auth: { persistSession: true },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// Admin / Service Role Client (Never exposed to client side)
export const getSupabaseAdmin = () => {
  if (!supabaseServiceKey || supabaseServiceKey.includes('dummy')) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
};
