import express from 'express'
import { getEmployees, createEmployee, importEmployees, exportEmployees, getEmployeeSalary, updateEmployeeSalary } from '../controllers/employee.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { authorize } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { createEmployeeSchema, getEmployeesSchema } from '../validations/employee.validations.js'

const router = express.Router()

router.get('/', authenticate, validate(getEmployeesSchema), getEmployees)
router.post('/', authenticate, authorize('admin', 'hr'), validate(createEmployeeSchema), createEmployee)
router.post('/import', authenticate, authorize('admin', 'hr'), importEmployees)
router.get('/export', authenticate, authorize('admin', 'hr'), exportEmployees)
router.get('/:employeeId/salary', authenticate, authorize('admin', 'hr'), getEmployeeSalary)
router.put('/:employeeId/salary', authenticate, authorize('admin', 'hr'), updateEmployeeSalary)

export default router

