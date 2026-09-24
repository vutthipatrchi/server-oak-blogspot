import * as notificationRepository from '../repositories/notificationRepository.js'

export async function list(req, res) {
  res.set('Cache-Control', 'private, no-store')
  const result = await notificationRepository.listForRecipient(req.user.id)
  res.json({
    notifications: result.notifications.map((notification) => ({
      id: notification.id,
      eventType: notification.event_type,
      actorName: notification.actor_name,
      articleId: notification.article_id,
      articleTitle: notification.article_title,
      commentId: notification.comment_id,
      commentPreview: notification.comment_preview,
      createdAt: notification.created_at,
      readAt: notification.read_at,
    })),
    unreadCount: result.unreadCount,
  })
}

export async function markAllRead(req, res) {
  await notificationRepository.markAllRead(req.user.id)
  res.status(204).send()
}
