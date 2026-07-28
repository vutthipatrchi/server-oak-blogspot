export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Route not found.' })
}

export function errorHandler(error, _req, res, _next) {
  console.error(error)
  res.status(500).json({ error: 'Unexpected server error.' })
}
