import express from 'express'
import { getPayruns, createPayrun, previewPayrun, processPayrun } from '../controllers/payroll.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { authorize } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { createPayrunSchema } from '../validations/payroll.validations.js'

const router = express.Router()

// Payroll Routes
router.get('/payruns/:payrunId', authenticate, authorize('admin', 'hr'), getPayrollsByPayrun)
router.get('/payruns/employee/:employeeId', authenticate, authorize('admin', 'hr', 'employee'), getPayrollsByEmployee)
router.get('/:payrollId', authenticate, authorize('admin', 'hr'), getPayrollById)
router.post('/:employeeId/compute', authenticate, authorize('admin', 'hr'), computePayroll)
router.put('/:payrollId/validate', authenticate, authorize('admin', 'hr'), validatePayroll)

router.get('/payruns', authenticate, authorize('admin', 'hr'), getPayruns)
router.post('/payruns', authenticate, authorize('admin', 'hr'), validate(createPayrunSchema), createPayrun)
router.get('/payruns/:payrunId/preview', authenticate, authorize('admin', 'hr'), previewPayrun)
router.post('/payruns/:payrunId/process', authenticate, authorize('admin', 'hr'), processPayrun)

export default router

