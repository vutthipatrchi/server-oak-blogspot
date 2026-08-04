import cors from 'cors'
import express from 'express'
import { apiInfo, basicHealth } from './controllers/systemController.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'
import { articlesRouter } from './routes/articles.js'
import { authRouter } from './routes/auth.js'
import { categoriesRouter } from './routes/categories.js'
import { profileRouter } from './routes/profile.js'
import { systemRouter } from './routes/system.js'
import { uploadsRouter } from './routes/uploads.js'

export const app = express()

const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'
const trustProxy = process.env.TRUST_PROXY

if (trustProxy) {
  app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy)
}

app.use(cors({ origin: clientOrigin, credentials: true }))
app.use(express.json({ limit: '8mb' }))

app.get('/', apiInfo)
app.get('/health', basicHealth)

app.use('/api/articles', articlesRouter)
app.use('/api/auth', authRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/profile', profileRouter)
app.use('/api/uploads', uploadsRouter)
app.use('/api', systemRouter)

app.use(notFoundHandler)
app.use(errorHandler)
