import { supabase } from '../supabase.js'

const notificationSelect = 'id, event_type, actor_name, article_id, article_title, comment_id, comment_preview, created_at, read_at'

export async function listForRecipient(recipientId) {
  const [notificationsResult, unreadResult] = await Promise.all([
    supabase.from('notifications').select(notificationSelect)
      .eq('recipient_id', recipientId).order('created_at', { ascending: false }).limit(40),
    supabase.from('notifications').select('id', { count: 'exact', head: true })
      .eq('recipient_id', recipientId).is('read_at', null),
  ])
  if (notificationsResult.error) throw notificationsResult.error
  if (unreadResult.error) throw unreadResult.error
  return { notifications: notificationsResult.data ?? [], unreadCount: unreadResult.count ?? 0 }
}

export async function markAllRead(recipientId) {
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() })
    .eq('recipient_id', recipientId).is('read_at', null)
  if (error) throw error
}
