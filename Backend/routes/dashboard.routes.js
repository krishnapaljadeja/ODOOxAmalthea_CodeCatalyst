import express from 'express'
import { getStats } from '../controllers/dashboard.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'

const router = express.Router()

router.get('/stats', authenticate, getStats)

export default router

