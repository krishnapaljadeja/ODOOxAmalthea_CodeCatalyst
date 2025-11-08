import { PrismaClient } from '@prisma/client'
import { generatePayslipPDF } from '../utils/payslip.utils.js'

const prisma = new PrismaClient()

/**
 * Get payslips
 */
export const getPayslips = async (req, res, next) => {
  try {
    const { payrunId, employeeId } = req.query
    const user = req.user

    // Build where clause
    const where = {}

    // Role-based filtering
    if (user.role === 'employee') {
      where.userId = user.id
    } else if (employeeId) {
      where.employeeId = employeeId
    }
    // Admin and HR can see all

    if (payrunId) {
      where.payrunId = payrunId
    }

    const payslips = await prisma.payslip.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
        payrun: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        payDate: 'desc',
      },
    })

    // Format response
    const formattedPayslips = payslips.map((payslip) => ({
      id: payslip.id,
      employeeId: payslip.employeeId,
      employeeName: `${payslip.employee.firstName} ${payslip.employee.lastName}`,
      payrunId: payslip.payrunId,
      payPeriodStart: payslip.payPeriodStart.toISOString().split('T')[0],
      payPeriodEnd: payslip.payPeriodEnd.toISOString().split('T')[0],
      payDate: payslip.payDate.toISOString().split('T')[0],
      earnings: {
        baseSalary: payslip.baseSalary,
        overtime: payslip.overtime,
        bonus: payslip.bonus,
        allowances: payslip.allowances,
      },
      deductions: {
        tax: payslip.tax,
        insurance: payslip.insurance,
        other: payslip.other,
      },
      grossPay: payslip.grossPay,
      totalDeductions: payslip.totalDeductions,
      netPay: payslip.netPay,
      createdAt: payslip.createdAt.toISOString(),
    }))

    res.json({
      status: 'success',
      data: formattedPayslips,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get single payslip
 */
export const getPayslip = async (req, res, next) => {
  try {
    const { payslipId } = req.params
    const user = req.user

    const payslip = await prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
        payrun: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!payslip) {
      return res.status(404).json({
        status: 'error',
        message: 'Payslip not found',
        error: 'Not Found',
      })
    }

    // Check access
    if (user.role === 'employee' && payslip.userId !== user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions',
        error: 'Forbidden',
      })
    }

    res.json({
      status: 'success',
      data: {
        id: payslip.id,
        employeeId: payslip.employeeId,
        employeeName: `${payslip.employee.firstName} ${payslip.employee.lastName}`,
        payrunId: payslip.payrunId,
        payPeriodStart: payslip.payPeriodStart.toISOString().split('T')[0],
        payPeriodEnd: payslip.payPeriodEnd.toISOString().split('T')[0],
        payDate: payslip.payDate.toISOString().split('T')[0],
        earnings: {
          baseSalary: payslip.baseSalary,
          overtime: payslip.overtime,
          bonus: payslip.bonus,
          allowances: payslip.allowances,
        },
        deductions: {
          tax: payslip.tax,
          insurance: payslip.insurance,
          other: payslip.other,
        },
        grossPay: payslip.grossPay,
        totalDeductions: payslip.totalDeductions,
        netPay: payslip.netPay,
        createdAt: payslip.createdAt.toISOString(),
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Download payslip PDF
 */
export const downloadPayslip = async (req, res, next) => {
  try {
    const { payslipId } = req.params
    const user = req.user

    const payslip = await prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!payslip) {
      return res.status(404).json({
        status: 'error',
        message: 'Payslip not found',
        error: 'Not Found',
      })
    }

    // Check access
    if (user.role === 'employee' && payslip.userId !== user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions',
        error: 'Forbidden',
      })
    }

    // Generate PDF
    const pdfBuffer = await generatePayslipPDF(payslip, payslip.employee)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=payslip-${payslipId}.pdf`)
    res.send(pdfBuffer)
  } catch (error) {
    next(error)
  }
}

