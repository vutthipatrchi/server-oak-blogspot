import { supabase } from '../supabase.js'

export async function findAdminProfile() {
  const owner = await findProfileByRole('owner')
  return owner ?? findProfileByRole('admin')
}

async function findProfileByRole(role) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', role)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function findProfileById(id) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertAdminProfile(profile) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile)
    .select()
    .single()

  if (error) throw error
  return data
}
