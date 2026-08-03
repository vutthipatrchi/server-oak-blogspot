import { supabase } from '../supabase.js'

export async function findMemberProfile(userId) {
  const { data, error } = await supabase
    .from('member_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function findMemberProfileByUsername(username) {
  const { data, error } = await supabase
    .from('member_profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertMemberProfile(profile) {
  const { data, error } = await supabase
    .from('member_profiles')
    .upsert(profile)
    .select()
    .single()

  if (error) throw error
  return data
}
