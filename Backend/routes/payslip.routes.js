import express from 'express'
import { getPayslips, getPayslip, downloadPayslip } from '../controllers/payslip.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'

const router = express.Router()

router.get('/', authenticate, getPayslips)
router.get('/:payslipId', authenticate, getPayslip)
router.get('/:payslipId/download', authenticate, downloadPayslip)

export default router

