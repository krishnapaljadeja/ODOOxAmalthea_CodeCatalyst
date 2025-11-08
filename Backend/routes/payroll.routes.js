import express from 'express'
import {
  getPayruns,
  getCurrentMonthPayrun,
  createPayrun,
  previewPayrun,
  processPayrun,
  getPayrollsByPayrun,
  getPayrollsByEmployee,
  getPayrollById,
  updatePayroll,
  validatePayroll,
  validateAllPayrolls,
} from '../controllers/payroll.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { authorize } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { createPayrunSchema } from '../validations/payroll.validations.js'

const router = express.Router()

// Payrun Routes
router.get('/payruns', authenticate, authorize('admin', 'hr'), getPayruns)
router.get('/payruns/current-month', authenticate, authorize('admin', 'hr'), getCurrentMonthPayrun)
router.post('/payruns', authenticate, authorize('admin', 'hr'), validate(createPayrunSchema), createPayrun)
router.get('/payruns/:payrunId/preview', authenticate, authorize('admin', 'hr'), previewPayrun)
router.post('/payruns/:payrunId/process', authenticate, authorize('admin', 'hr'), processPayrun)
router.get('/payruns/:payrunId/payrolls', authenticate, authorize('admin', 'hr'), getPayrollsByPayrun)

// Payroll Routes
router.get('/employee/:employeeId', authenticate, authorize('admin', 'hr', 'employee'), getPayrollsByEmployee)
router.get('/:payrollId', authenticate, authorize('admin', 'hr', 'employee'), getPayrollById)
router.put('/:payrollId', authenticate, authorize('admin', 'hr'), updatePayroll)
router.put('/:payrollId/validate', authenticate, authorize('admin', 'hr'), validatePayroll)
router.put('/payruns/:payrunId/validate-all', authenticate, authorize('admin', 'hr'), validateAllPayrolls)

export default router

