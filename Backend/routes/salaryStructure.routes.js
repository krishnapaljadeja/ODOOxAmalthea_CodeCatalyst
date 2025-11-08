// /routes/salaryStructure.routes.js
import express from 'express'
import {
    upsertSalaryStructure,
    getActiveSalaryStructure,
    getSalaryHistory,
    updateSalaryStructure
} from '../controllers/salaryStructure.controller.js'
import { authenticate, authorize } from '../middleware/auth.middleware.js'

const router = express.Router()

router.post('/:employeeId', authenticate, authorize('admin', 'hr'), upsertSalaryStructure)
router.get('/:employeeId/active', authenticate, authorize('admin', 'hr'), getActiveSalaryStructure)
router.get('/:employeeId/history', authenticate, authorize('admin', 'hr'), getSalaryHistory)

export default router
