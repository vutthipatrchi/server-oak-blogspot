import { supabase } from '../supabase.js'

export async function findCategories(search) {
  let query = supabase.from('categories').select('*').order('name')
  if (search) query = query.ilike('name', `%${search}%`)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function findCategoryById(id) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function insertCategory(category) {
  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCategoryById(id, category) {
  const { data, error } = await supabase
    .from('categories')
    .update(category)
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) throw error
  return data
}

export async function deleteCategoryById(id) {
  const { data, error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) throw error
  return data
}
