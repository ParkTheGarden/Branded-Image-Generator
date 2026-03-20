import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// If env vars are missing, tracking should be a no-op (safe for local/dev).
export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

// Debug: verify Vercel build-time env is present.
// Do not log secrets; only presence.
try {
  // eslint-disable-next-line no-console
  console.info('[tracking] supabase env present:', {
    hasUrl: Boolean(supabaseUrl),
    hasAnonKey: Boolean(supabaseAnonKey),
    trackingEnabled: Boolean(supabaseUrl && supabaseAnonKey),
  })
} catch (_) {}

