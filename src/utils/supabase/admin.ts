import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client using the Service Role Key to bypass Row Level Security (RLS).
 * This should ONLY be used in secure server-side contexts (like admin API routes)
 * after verifying the user's session and administrative role.
 */
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
