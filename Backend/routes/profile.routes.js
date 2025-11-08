import express from 'express'
import { updateProfile, changePassword } from '../controllers/profile.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { updateProfileSchema, changePasswordSchema } from '../validations/profile.validations.js'

const router = express.Router()

router.put('/', authenticate, validate(updateProfileSchema), updateProfile)
router.put('/password', authenticate, validate(changePasswordSchema), changePassword)

export default router

