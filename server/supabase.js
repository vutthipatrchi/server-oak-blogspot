import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? anonKey

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null

export const authClient = supabaseUrl && anonKey
  ? createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null

export const canWriteWithSupabase = Boolean(
  process.env.SUPABASE_SERVICE_ROLE_KEY && supabase,
)
