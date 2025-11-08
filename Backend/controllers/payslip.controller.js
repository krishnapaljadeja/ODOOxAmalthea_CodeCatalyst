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
      const employee = await prisma.employee.findUnique({
        where: { userId: user.id },
      })
      if (employee) {
        where.employeeId = employee.id
      } else {
        return res.json({
          status: 'success',
          data: [],
        })
      }
    } else if (employeeId) {
      where.employeeId = employeeId
    }
    // Admin and HR can see all

    // If payrunId is provided, filter by payrolls in that payrun
    if (payrunId) {
      const payrolls = await prisma.payroll.findMany({
        where: { payrunId },
        select: { id: true },
      })
      where.payrollId = {
        in: payrolls.map((p) => p.id),
      }
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
            department: true,
            position: true,
          },
        },
        payroll: {
          include: {
            payrun: {
              select: {
                id: true,
                name: true,
                payPeriodStart: true,
                payPeriodEnd: true,
                payDate: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Format response
    const formattedPayslips = payslips.map((payslip) => ({
      id: payslip.id,
      employeeId: payslip.employeeId,
      employeeName: `${payslip.employee.firstName} ${payslip.employee.lastName}`,
      payrollId: payslip.payrollId,
      payrun: payslip.payroll.payrun
        ? {
            id: payslip.payroll.payrun.id,
            name: payslip.payroll.payrun.name,
            payPeriodStart: payslip.payroll.payrun.payPeriodStart.toISOString().split('T')[0],
            payPeriodEnd: payslip.payroll.payrun.payPeriodEnd.toISOString().split('T')[0],
            payDate: payslip.payroll.payrun.payDate.toISOString().split('T')[0],
          }
        : null,
      grossSalary: payslip.payroll.grossSalary,
      totalDeductions: payslip.payroll.totalDeductions,
      netSalary: payslip.payroll.netSalary,
      pdfUrl: payslip.pdfUrl,
      status: payslip.status,
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
 * Get single payslip with worked days and salary computation
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
            department: true,
            position: true,
          },
        },
        payroll: {
          include: {
            payrun: {
              select: {
                id: true,
                name: true,
                payPeriodStart: true,
                payPeriodEnd: true,
                payDate: true,
              },
            },
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
    if (user.role === 'employee') {
      const employee = await prisma.employee.findUnique({
        where: { userId: user.id },
      })
      if (!employee || employee.id !== payslip.employeeId) {
        return res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions',
          error: 'Forbidden',
        })
      }
    }

    // Get worked days (attendance) for the pay period
    const payrun = payslip.payroll.payrun
    let workedDays = []
    let totalWorkedDays = 0
    let totalPaidLeaves = 0

    if (payrun) {
      // Get attendance records
      const attendances = await prisma.attendance.findMany({
        where: {
          employeeId: payslip.employeeId,
          date: {
            gte: payrun.payPeriodStart,
            lte: payrun.payPeriodEnd,
          },
        },
        orderBy: {
          date: 'asc',
        },
      })

      // Get approved paid leaves
      const paidLeaves = await prisma.leave.findMany({
        where: {
          employeeId: payslip.employeeId,
          type: { in: ['sick', 'vacation', 'personal'] }, // Paid leave types
          status: 'approved',
          startDate: { lte: payrun.payPeriodEnd },
          endDate: { gte: payrun.payPeriodStart },
        },
      })

      // Calculate worked days
      const presentDays = attendances.filter((a) => a.status === 'present').length
      totalWorkedDays = presentDays
      totalPaidLeaves = paidLeaves.reduce((sum, leave) => {
        const overlapStart = new Date(Math.max(leave.startDate.getTime(), payrun.payPeriodStart.getTime()))
        const overlapEnd = new Date(Math.min(leave.endDate.getTime(), payrun.payPeriodEnd.getTime()))
        const overlapDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1
        return sum + Math.max(0, overlapDays)
      }, 0)

      workedDays = [
        {
          type: 'Attendance',
          days: totalWorkedDays,
          description: 'Working days in period',
          amount: 0, // Will be calculated based on salary structure
        },
        {
          type: 'Paid Time Off',
          days: totalPaidLeaves,
          description: 'Paid leaves in period',
          amount: 0, // Will be calculated based on salary structure
        },
      ]
    }

    // Get active salary structure for the pay period
    let salaryStructure = null
    let salaryComputation = null

    if (payrun) {
      salaryStructure = await prisma.salaryStructure.findFirst({
        where: {
          employeeId: payslip.employeeId,
          effectiveFrom: { lte: payrun.payPeriodStart },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: payrun.payPeriodStart } },
          ],
        },
        orderBy: {
          effectiveFrom: 'desc',
        },
      })

      if (salaryStructure) {
        // Calculate daily rate
        const totalDaysInMonth = Math.ceil(
          (payrun.payPeriodEnd - payrun.payPeriodStart) / (1000 * 60 * 60 * 24)
        ) + 1
        const dailyRate = salaryStructure.grossSalary / totalDaysInMonth

        // Update worked days amounts
        workedDays[0].amount = dailyRate * totalWorkedDays
        workedDays[1].amount = dailyRate * totalPaidLeaves

        // Build salary computation breakdown
        const grossEarnings = [
          {
            ruleName: 'Basic Salary',
            rate: 100,
            amount: salaryStructure.basicSalary,
          },
          {
            ruleName: 'House Rent Allowance',
            rate: 100,
            amount: salaryStructure.houseRentAllowance,
          },
          {
            ruleName: 'Standard Allowance',
            rate: 100,
            amount: salaryStructure.standardAllowance,
          },
          {
            ruleName: 'Performance Bonus',
            rate: 100,
            amount: salaryStructure.bonus,
          },
          {
            ruleName: 'Leave Travel Allowance',
            rate: 100,
            amount: salaryStructure.travelAllowance,
          },
        ]

        // Add fixed allowance if any (can be calculated from other fields)
        const fixedAllowance = salaryStructure.grossSalary - grossEarnings.reduce((sum, item) => sum + item.amount, 0)
        if (fixedAllowance > 0) {
          grossEarnings.push({
            ruleName: 'Fixed Allowance',
            rate: 100,
            amount: fixedAllowance,
          })
        }

        const deductions = [
          {
            ruleName: 'PF Employee',
            rate: 100,
            amount: -salaryStructure.pfEmployee,
          },
          {
            ruleName: 'PF Employer',
            rate: 100,
            amount: -salaryStructure.pfEmployer,
          },
          {
            ruleName: 'Professional Tax',
            rate: 100,
            amount: -salaryStructure.professionalTax,
          },
        ]

        if (salaryStructure.tds > 0) {
          deductions.push({
            ruleName: 'TDS',
            rate: 100,
            amount: -salaryStructure.tds,
          })
        }

        if (salaryStructure.otherDeductions > 0) {
          deductions.push({
            ruleName: 'Other Deductions',
            rate: 100,
            amount: -salaryStructure.otherDeductions,
          })
        }

        salaryComputation = {
          grossEarnings,
          deductions,
          grossTotal: salaryStructure.grossSalary,
          deductionsTotal: salaryStructure.totalDeductions,
          netAmount: salaryStructure.netSalary,
        }
      }
    }

    res.json({
      status: 'success',
      data: {
        id: payslip.id,
        employeeId: payslip.employeeId,
        employee: {
          id: payslip.employee.id,
          employeeId: payslip.employee.employeeId,
          name: `${payslip.employee.firstName} ${payslip.employee.lastName}`,
          department: payslip.employee.department,
          position: payslip.employee.position,
        },
        payrollId: payslip.payrollId,
        payrun: payrun
          ? {
              id: payrun.id,
              name: payrun.name,
              payPeriodStart: payrun.payPeriodStart.toISOString().split('T')[0],
              payPeriodEnd: payrun.payPeriodEnd.toISOString().split('T')[0],
              payDate: payrun.payDate.toISOString().split('T')[0],
            }
          : null,
        salaryStructure: salaryStructure
          ? {
              id: salaryStructure.id,
              name: salaryStructure.name,
            }
          : null,
        period: payrun
          ? {
              start: payrun.payPeriodStart.toISOString().split('T')[0],
              end: payrun.payPeriodEnd.toISOString().split('T')[0],
            }
          : null,
        workedDays: {
          items: workedDays,
          totalDays: totalWorkedDays + totalPaidLeaves,
          totalAmount: workedDays.reduce((sum, item) => sum + item.amount, 0),
        },
        salaryComputation,
        grossSalary: payslip.payroll.grossSalary,
        totalDeductions: payslip.payroll.totalDeductions,
        netSalary: payslip.payroll.netSalary,
        pdfUrl: payslip.pdfUrl,
        status: payslip.status,
        payroll: {
          id: payslip.payroll.id,
          status: payslip.payroll.status,
        },
        createdAt: payslip.createdAt.toISOString(),
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get payslip by payroll ID
 */
export const getPayslipByPayrollId = async (req, res, next) => {
  try {
    const { payrollId } = req.params
    const user = req.user

    // Get payroll
    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
          },
        },
        payrun: {
          select: {
            id: true,
            name: true,
            payPeriodStart: true,
            payPeriodEnd: true,
            payDate: true,
          },
        },
        payslip: true,
      },
    })

    if (!payroll) {
      return res.status(404).json({
        status: 'error',
        message: 'Payroll not found',
        error: 'Not Found',
      })
    }

    // Check access
    if (user.role === 'employee') {
      const employee = await prisma.employee.findUnique({
        where: { userId: user.id },
      })
      if (!employee || employee.id !== payroll.employeeId) {
        return res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions',
          error: 'Forbidden',
        })
      }
    }

    // If payslip exists, return it using the getPayslip logic
    if (payroll.payslip) {
      // Redirect to getPayslip endpoint logic
      req.params.payslipId = payroll.payslip.id
      return getPayslip(req, res, next)
    }

    // If no payslip exists, return payroll data (for preview/computation)
    // Get worked days and salary computation similar to getPayslip
    let workedDays = []
    let totalWorkedDays = 0
    let totalPaidLeaves = 0

    if (payroll.payrun) {
      const attendances = await prisma.attendance.findMany({
        where: {
          employeeId: payroll.employeeId,
          date: {
            gte: payroll.payrun.payPeriodStart,
            lte: payroll.payrun.payPeriodEnd,
          },
        },
      })

      const paidLeaves = await prisma.leave.findMany({
        where: {
          employeeId: payroll.employeeId,
          type: { in: ['sick', 'vacation', 'personal'] },
          status: 'approved',
          startDate: { lte: payroll.payrun.payPeriodEnd },
          endDate: { gte: payroll.payrun.payPeriodStart },
        },
      })

      totalWorkedDays = attendances.filter((a) => a.status === 'present').length
      totalPaidLeaves = paidLeaves.reduce((sum, leave) => {
        const overlapStart = new Date(Math.max(leave.startDate.getTime(), payroll.payrun.payPeriodStart.getTime()))
        const overlapEnd = new Date(Math.min(leave.endDate.getTime(), payroll.payrun.payPeriodEnd.getTime()))
        const overlapDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1
        return sum + Math.max(0, overlapDays)
      }, 0)

      workedDays = [
        {
          type: 'Attendance',
          days: totalWorkedDays,
          description: 'Working days in period',
          amount: 0,
        },
        {
          type: 'Paid Time Off',
          days: totalPaidLeaves,
          description: 'Paid leaves in period',
          amount: 0,
        },
      ]
    }

    // Get salary structure
    let salaryStructure = null
    let salaryComputation = null

    if (payroll.payrun) {
      salaryStructure = await prisma.salaryStructure.findFirst({
        where: {
          employeeId: payroll.employeeId,
          effectiveFrom: { lte: payroll.payrun.payPeriodStart },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: payroll.payrun.payPeriodStart } },
          ],
        },
        orderBy: {
          effectiveFrom: 'desc',
        },
      })

      if (salaryStructure) {
        const totalDaysInMonth = Math.ceil(
          (payroll.payrun.payPeriodEnd - payroll.payrun.payPeriodStart) / (1000 * 60 * 60 * 24)
        ) + 1
        const dailyRate = salaryStructure.grossSalary / totalDaysInMonth

        workedDays[0].amount = dailyRate * totalWorkedDays
        workedDays[1].amount = dailyRate * totalPaidLeaves

        const grossEarnings = [
          { ruleName: 'Basic Salary', rate: 100, amount: salaryStructure.basicSalary },
          { ruleName: 'House Rent Allowance', rate: 100, amount: salaryStructure.houseRentAllowance },
          { ruleName: 'Standard Allowance', rate: 100, amount: salaryStructure.standardAllowance },
          { ruleName: 'Performance Bonus', rate: 100, amount: salaryStructure.bonus },
          { ruleName: 'Leave Travel Allowance', rate: 100, amount: salaryStructure.travelAllowance },
        ]

        const fixedAllowance = salaryStructure.grossSalary - grossEarnings.reduce((sum, item) => sum + item.amount, 0)
        if (fixedAllowance > 0) {
          grossEarnings.push({ ruleName: 'Fixed Allowance', rate: 100, amount: fixedAllowance })
        }

        const deductions = [
          { ruleName: 'PF Employee', rate: 100, amount: -salaryStructure.pfEmployee },
          { ruleName: 'PF Employer', rate: 100, amount: -salaryStructure.pfEmployer },
          { ruleName: 'Professional Tax', rate: 100, amount: -salaryStructure.professionalTax },
        ]

        if (salaryStructure.tds > 0) {
          deductions.push({ ruleName: 'TDS', rate: 100, amount: -salaryStructure.tds })
        }

        if (salaryStructure.otherDeductions > 0) {
          deductions.push({ ruleName: 'Other Deductions', rate: 100, amount: -salaryStructure.otherDeductions })
        }

        salaryComputation = {
          grossEarnings,
          deductions,
          grossTotal: salaryStructure.grossSalary,
          deductionsTotal: salaryStructure.totalDeductions,
          netAmount: salaryStructure.netSalary,
        }
      }
    }

    res.json({
      status: 'success',
      data: {
        id: null, // No payslip yet
        payrollId: payroll.id,
        employee: {
          id: payroll.employee.id,
          employeeId: payroll.employee.employeeId,
          name: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
          department: payroll.employee.department,
          position: payroll.employee.position,
        },
        payrun: payroll.payrun
          ? {
              id: payroll.payrun.id,
              name: payroll.payrun.name,
              payPeriodStart: payroll.payrun.payPeriodStart.toISOString().split('T')[0],
              payPeriodEnd: payroll.payrun.payPeriodEnd.toISOString().split('T')[0],
              payDate: payroll.payrun.payDate.toISOString().split('T')[0],
            }
          : null,
        salaryStructure: salaryStructure
          ? {
              id: salaryStructure.id,
              name: salaryStructure.name,
            }
          : null,
        period: payroll.payrun
          ? {
              start: payroll.payrun.payPeriodStart.toISOString().split('T')[0],
              end: payroll.payrun.payPeriodEnd.toISOString().split('T')[0],
            }
          : null,
        workedDays: {
          items: workedDays,
          totalDays: totalWorkedDays + totalPaidLeaves,
          totalAmount: workedDays.reduce((sum, item) => sum + item.amount, 0),
        },
        salaryComputation,
        grossSalary: payroll.grossSalary,
        totalDeductions: payroll.totalDeductions,
        netSalary: payroll.netSalary,
        status: payroll.status,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Generate payslips for all validated payrolls in a payrun
 */
export const generatePayslipsForPayrun = async (req, res, next) => {
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

    if (payrun.status !== 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'Payrun must be completed before generating payslips',
        error: 'Validation Error',
      })
    }

    // Get all validated payrolls for this payrun
    const validatedPayrolls = await prisma.payroll.findMany({
      where: {
        payrunId,
        status: 'validated',
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    if (validatedPayrolls.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No validated payrolls found for this payrun',
        error: 'Validation Error',
      })
    }

    // Check which payrolls already have payslips
    const existingPayslips = await prisma.payslip.findMany({
      where: {
        payrollId: {
          in: validatedPayrolls.map((p) => p.id),
        },
      },
      select: { payrollId: true },
    })

    const existingPayrollIds = new Set(existingPayslips.map((p) => p.payrollId))
    const payrollsToProcess = validatedPayrolls.filter(
      (p) => !existingPayrollIds.has(p.id)
    )

    // Generate payslips
    const createdPayslips = []

    for (const payroll of payrollsToProcess) {
      const payslip = await prisma.payslip.create({
        data: {
          payrollId: payroll.id,
          employeeId: payroll.employeeId,
          userId: payroll.employee.user.id,
          status: 'validated',
        },
      })

      createdPayslips.push(payslip)
    }

    res.json({
      status: 'success',
      message: `Generated ${createdPayslips.length} payslips`,
      data: {
        payslipsCreated: createdPayslips.length,
        totalValidated: validatedPayrolls.length,
        alreadyExisted: existingPayslips.length,
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
            department: true,
            position: true,
          },
        },
        payroll: {
          include: {
            payrun: true,
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
    if (user.role === 'employee') {
      const employee = await prisma.employee.findUnique({
        where: { userId: user.id },
      })
      if (!employee || employee.id !== payslip.employeeId) {
        return res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions',
          error: 'Forbidden',
        })
      }
    }

    // Generate PDF (you may need to update generatePayslipPDF to work with new structure)
    // For now, we'll create a simple response
    // TODO: Update generatePayslipPDF utility to work with Payroll-based structure
    try {
      const pdfBuffer = await generatePayslipPDF(payslip, payslip.employee, payslip.payroll)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename=payslip-${payslipId}.pdf`)
      res.send(pdfBuffer)
    } catch (pdfError) {
      // If PDF generation fails, return payslip data as JSON
      res.json({
        status: 'success',
        message: 'PDF generation not available, returning payslip data',
        data: {
          id: payslip.id,
          employee: payslip.employee,
          payroll: payslip.payroll,
          pdfUrl: payslip.pdfUrl,
        },
      })
    }
  } catch (error) {
    next(error)
  }
}

