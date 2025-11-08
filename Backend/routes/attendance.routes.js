import express from 'express'
import { getAttendance, getTodayAttendance, checkIn, checkOut } from '../controllers/attendance.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { getAttendanceSchema } from '../validations/attendance.validations.js'

const router = express.Router()

router.get('/', authenticate, validate(getAttendanceSchema), getAttendance)
router.get('/today', authenticate, getTodayAttendance)
router.post('/check-in', authenticate, checkIn)
router.post('/check-out', authenticate, checkOut)

export default router

