import cors from 'cors'
import express from 'express'
import { errorHandler, notFoundHandler } from './middleware/error.js'
import { articlesRouter } from './routes/articles.js'
import { categoriesRouter } from './routes/categories.js'
import { profileRouter } from './routes/profile.js'
import { systemRouter } from './routes/system.js'

export const app = express()

const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'

app.use(cors({ origin: clientOrigin }))
app.use(express.json({ limit: '8mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/articles', articlesRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/profile', profileRouter)
app.use('/api', systemRouter)

app.use(notFoundHandler)
app.use(errorHandler)
