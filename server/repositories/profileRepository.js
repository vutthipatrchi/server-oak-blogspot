import { supabase } from '../supabase.js'

export async function findAdminProfile() {
  const { data, error } = await supabase
    .from('admin_profiles')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertAdminProfile(profile) {
  const { data, error } = await supabase
    .from('admin_profiles')
    .upsert(profile)
    .select()
    .single()

  if (error) throw error
  return data
}
