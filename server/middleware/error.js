export function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Route not found.' })
}

export function errorHandler(error, _req, res, _next) {
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'The uploaded file must not exceed 5 MB.' })
  }

  if (error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message })
  }

  if (error.code === '23505') {
    return res.status(409).json({ error: 'A record with this value already exists.' })
  }

  if (error.code === '23503') {
    return res.status(409).json({ error: 'This record is still referenced by other data.' })
  }

  console.error(error)
  res.status(500).json({ error: 'Unexpected server error.' })
}
