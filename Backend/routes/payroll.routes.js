import express from 'express'
import { getPayruns, createPayrun, previewPayrun, processPayrun } from '../controllers/payroll.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { authorize } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { createPayrunSchema } from '../validations/payroll.validations.js'

const router = express.Router()

router.get('/payruns', authenticate, authorize('admin', 'hr'), getPayruns)
router.post('/payruns', authenticate, authorize('admin', 'hr'), validate(createPayrunSchema), createPayrun)
router.get('/payruns/:payrunId/preview', authenticate, authorize('admin', 'hr'), previewPayrun)
router.post('/payruns/:payrunId/process', authenticate, authorize('admin', 'hr'), processPayrun)

export default router

