import { PrismaClient } from '@prisma/client'
import { calculatePayslip } from '../utils/payroll.utils.js'

const prisma = new PrismaClient()

/**
 * Get payruns
 */
export const getPayruns = async (req, res, next) => {
  try {
    const payruns = await prisma.payrun.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Format response
    const formattedPayruns = payruns.map((payrun) => ({
      id: payrun.id,
      name: payrun.name,
      payPeriodStart: payrun.payPeriodStart.toISOString().split('T')[0],
      payPeriodEnd: payrun.payPeriodEnd.toISOString().split('T')[0],
      payDate: payrun.payDate.toISOString().split('T')[0],
      status: payrun.status,
      totalEmployees: payrun.totalEmployees,
      totalAmount: payrun.totalAmount,
      createdAt: payrun.createdAt.toISOString(),
      updatedAt: payrun.updatedAt.toISOString(),
    }))

    res.json({
      status: 'success',
      data: formattedPayruns,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Create payrun
 */
export const createPayrun = async (req, res, next) => {
  try {
    const { name, payPeriodStart, payPeriodEnd, payDate } = req.body

    // Create payrun
    const payrun = await prisma.payrun.create({
      data: {
        name,
        payPeriodStart: new Date(payPeriodStart),
        payPeriodEnd: new Date(payPeriodEnd),
        payDate: new Date(payDate),
        status: 'draft',
        totalEmployees: 0,
        totalAmount: 0,
      },
    })

    res.status(201).json({
      status: 'success',
      data: {
        id: payrun.id,
        name: payrun.name,
        payPeriodStart: payrun.payPeriodStart.toISOString().split('T')[0],
        payPeriodEnd: payrun.payPeriodEnd.toISOString().split('T')[0],
        payDate: payrun.payDate.toISOString().split('T')[0],
        status: payrun.status,
        totalEmployees: payrun.totalEmployees,
        totalAmount: payrun.totalAmount,
        createdAt: payrun.createdAt.toISOString(),
        updatedAt: payrun.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Preview payrun
 */
export const previewPayrun = async (req, res, next) => {
  try {
    const { payrunId } = req.params

    const payrun = await prisma.payrun.findUnique({
      where: { id: payrunId },
    })

    if (!payrun) {
      return res.status(404).json({
        status: 'error',
        message: 'Payrun not found',
        error: 'Not Found',
      })
    }

    // Get settings
    let settings = await prisma.payrollSettings.findUnique({
      where: { id: 'default' },
    })
    if (!settings) {
      settings = await prisma.payrollSettings.create({
        data: { id: 'default' },
      })
    }

    // Get all active employees
    const employees = await prisma.employee.findMany({
      where: { status: 'active' },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Calculate payslips
    const payslips = []
    let totalAmount = 0

    for (const employee of employees) {
      const calculation = await calculatePayslip(employee, payrun, settings)
      payslips.push({
        id: `preview-${employee.id}`,
        employeeId: employee.id,
        employeeName: `${employee.user.firstName} ${employee.user.lastName}`,
        grossPay: calculation.grossPay,
        totalDeductions: calculation.totalDeductions,
        netPay: calculation.netPay,
      })
      totalAmount += calculation.netPay
    }

    res.json({
      status: 'success',
      data: {
        payrun: {
          id: payrun.id,
          name: payrun.name,
          payPeriodStart: payrun.payPeriodStart.toISOString().split('T')[0],
          payPeriodEnd: payrun.payPeriodEnd.toISOString().split('T')[0],
          payDate: payrun.payDate.toISOString().split('T')[0],
          status: payrun.status,
          totalEmployees: employees.length,
          totalAmount,
        },
        payslips,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Process payrun
 */
export const processPayrun = async (req, res, next) => {
  try {
    const { payrunId } = req.params

    const payrun = await prisma.payrun.findUnique({
      where: { id: payrunId },
    })

    if (!payrun) {
      return res.status(404).json({
        status: 'error',
        message: 'Payrun not found',
        error: 'Not Found',
      })
    }

    if (payrun.status !== 'draft') {
      return res.status(400).json({
        status: 'error',
        message: 'Payrun is not in draft status',
        error: 'Validation Error',
      })
    }

    // Update status to processing
    await prisma.payrun.update({
      where: { id: payrunId },
      data: { status: 'processing' },
    })

    // Get settings
    let settings = await prisma.payrollSettings.findUnique({
      where: { id: 'default' },
    })
    if (!settings) {
      settings = await prisma.payrollSettings.create({
        data: { id: 'default' },
      })
    }

    // Get all active employees
    const employees = await prisma.employee.findMany({
      where: { status: 'active' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Generate payslips
    let totalAmount = 0

    for (const employee of employees) {
      const calculation = await calculatePayslip(employee, payrun, settings)

      await prisma.payslip.create({
        data: {
          employeeId: employee.id,
          userId: employee.user.id,
          payrunId: payrun.id,
          payPeriodStart: payrun.payPeriodStart,
          payPeriodEnd: payrun.payPeriodEnd,
          payDate: payrun.payDate,
          baseSalary: calculation.baseSalary,
          overtime: calculation.overtime,
          bonus: calculation.bonus,
          allowances: calculation.allowances,
          grossPay: calculation.grossPay,
          tax: calculation.tax,
          insurance: calculation.insurance,
          other: calculation.other,
          totalDeductions: calculation.totalDeductions,
          netPay: calculation.netPay,
        },
      })

      totalAmount += calculation.netPay
    }

    // Update payrun
    const updated = await prisma.payrun.update({
      where: { id: payrunId },
      data: {
        status: 'completed',
        totalEmployees: employees.length,
        totalAmount,
      },
    })

    res.json({
      status: 'success',
      data: {
        id: updated.id,
        status: updated.status,
        totalEmployees: updated.totalEmployees,
        totalAmount: updated.totalAmount,
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    next(error)
  }
}

