import { PrismaClient } from '@prisma/client'
import { calculatePayroll } from '../utils/payroll.utils.js'

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
 * Get current month's payrun with all payrolls
 */
export const  getCurrentMonthPayrun = async (req, res, next) => {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Find payrun for current month
    const payrun = await prisma.payrun.findFirst({
      where: {
        payPeriodStart: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        payrolls: {
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
            payslip: {
              select: {
                id: true,
                status: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!payrun) {
      return res.json({
        status: 'success',
        data: null,
        message: 'No payrun found for current month',
      })
    }

    // Get salary structures for each employee to calculate basic wage
    const employeeIds = payrun.payrolls.map((p) => p.employeeId)
    const salaryStructures = await prisma.salaryStructure.findMany({
      where: {
        employeeId: { in: employeeIds },
        effectiveFrom: { lte: payrun.payPeriodStart },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: payrun.payPeriodStart } },
        ],
      },
    })

    const structureMap = new Map()
    salaryStructures.forEach((struct) => {
      if (!structureMap.has(struct.employeeId)) {
        structureMap.set(struct.employeeId, struct)
      }
    })

    // Format response
    const formattedPayrun = {
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
      payrolls: payrun.payrolls.map((payroll) => {
        const structure = structureMap.get(payroll.employeeId)
        const basicWage = structure?.basicSalary || 0

        return {
          id: payroll.id,
          employeeId: payroll.employeeId,
          employee: {
            id: payroll.employee.id,
            employeeId: payroll.employee.employeeId,
            name: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
            department: payroll.employee.department,
            position: payroll.employee.position,
          },
          status: payroll.status === 'validated' ? 'Done' : payroll.status,
          grossSalary: payroll.grossSalary,
          totalDeductions: payroll.totalDeductions,
          netSalary: payroll.netSalary,
          employerCost: payroll.grossSalary, // Employer cost = gross salary
          basicWage,
          grossWage: payroll.grossSalary,
          netWage: payroll.netSalary,
          computedAt: payroll.computedAt?.toISOString(),
          validatedAt: payroll.validatedAt?.toISOString(),
          hasPayslip: !!payroll.payslip,
          payslipId: payroll.payslip?.id,
          payslipStatus: payroll.payslip?.status,
        }
      }),
    }

    res.json({
      status: 'success',
      data: formattedPayrun,
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
 * Preview payrun - shows what payrolls will be generated
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

    // Calculate payroll previews
    const payrolls = []
    let totalAmount = 0
    const errors = []

    for (const employee of employees) {
      try {
        const calculation = await calculatePayroll(employee, payrun)
        payrolls.push({
          id: `preview-${employee.id}`,
          employeeId: employee.id,
          employeeName: `${employee.user.firstName} ${employee.user.lastName}`,
          grossSalary: calculation.grossSalary,
          totalDeductions: calculation.totalDeductions,
          netSalary: calculation.netSalary,
        })
        totalAmount += calculation.netSalary
      } catch (error) {
        errors.push({
          employeeId: employee.id,
          employeeName: `${employee.user.firstName} ${employee.user.lastName}`,
          error: error.message,
        })
      }
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
        payrolls,
        errors: errors.length > 0 ? errors : undefined,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Process payrun - Generate Payroll records for all active employees
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

    // Check if payrolls already exist for this payrun
    const existingPayrolls = await prisma.payroll.findMany({
      where: { payrunId },
    })

    if (existingPayrolls.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Payrolls already generated for this payrun',
        error: 'Validation Error',
      })
    }

    // Update status to processing
    await prisma.payrun.update({
      where: { id: payrunId },
      data: { status: 'processing' },
    })

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

    // Generate Payroll records
    let totalAmount = 0
    const createdPayrolls = []
    const errors = []

    for (const employee of employees) {
      try {
        const calculation = await calculatePayroll(employee, payrun)

        const payroll = await prisma.payroll.create({
          data: {
            employeeId: employee.id,
            payrunId: payrun.id,
            status: 'computed',
            grossSalary: calculation.grossSalary,
            totalDeductions: calculation.totalDeductions,
            netSalary: calculation.netSalary,
            computedAt: new Date(),
          },
        })

        createdPayrolls.push(payroll)
        totalAmount += calculation.netSalary
      } catch (error) {
        errors.push({
          employeeId: employee.id,
          employeeName: `${employee.user.firstName} ${employee.user.lastName}`,
          error: error.message,
        })
      }
    }

    // Update payrun status back to draft (will be completed after validation)
    const updated = await prisma.payrun.update({
      where: { id: payrunId },
      data: {
        status: 'draft', // Keep as draft until all validated
        totalEmployees: createdPayrolls.length,
        totalAmount,
      },
    })

    res.json({
      status: 'success',
      message: `Generated ${createdPayrolls.length} payroll records`,
      data: {
        id: updated.id,
        status: updated.status,
        totalEmployees: updated.totalEmployees,
        totalAmount: updated.totalAmount,
        payrollsCreated: createdPayrolls.length,
        errors: errors.length > 0 ? errors : undefined,
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    // Revert payrun status on error
    try {
      await prisma.payrun.update({
        where: { id: req.params.payrunId },
        data: { status: 'draft' },
      })
    } catch (revertError) {
      // Ignore revert errors
    }
    next(error)
  }
}

/**
 * Get payrolls for a payrun - Employee-wise list view
 */
export const getPayrollsByPayrun = async (req, res, next) => {
  try {
    const { payrunId } = req.params

    // Get payrun details
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

    // Get all payrolls for this payrun with employee and salary structure info
    const payrolls = await prisma.payroll.findMany({
      where: { payrunId },
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
        payslip: {
          select: {
            id: true,
            pdfUrl: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Get salary structures for each employee to calculate basic wage
    const employeeIds = payrolls.map((p) => p.employeeId)
    const salaryStructures = await prisma.salaryStructure.findMany({
      where: {
        employeeId: { in: employeeIds },
        effectiveFrom: { lte: payrun.payPeriodStart },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: payrun.payPeriodStart } },
        ],
      },
    })

    const structureMap = new Map()
    salaryStructures.forEach((struct) => {
      if (!structureMap.has(struct.employeeId)) {
        structureMap.set(struct.employeeId, struct)
      }
    })

    // Format response for list view
    const formattedPayrolls = payrolls.map((payroll) => {
      const structure = structureMap.get(payroll.employeeId)
      const basicWage = structure?.basicSalary || 0

      return {
        id: payroll.id,
        payPeriod: payrun.name,
        employee: {
          id: payroll.employee.id,
          employeeId: payroll.employee.employeeId,
          name: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
          department: payroll.employee.department,
          position: payroll.employee.position,
        },
        employerCost: payroll.grossSalary, // Employer cost = gross salary
        basicWage,
        grossWage: payroll.grossSalary,
        netWage: payroll.netSalary,
        status: payroll.status === 'validated' ? 'Done' : payroll.status,
        hasPayslip: !!payroll.payslip,
        payslipId: payroll.payslip?.id,
        payslipStatus: payroll.payslip?.status,
      }
    })

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
        },
        payrolls: formattedPayrolls,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get payrolls for an employee
 */
export const getPayrollsByEmployee = async (req, res, next) => {
  try {
    const { employeeId } = req.params
    const user = req.user

    // Check access
    if (user.role === 'employee') {
      const employee = await prisma.employee.findUnique({
        where: { userId: user.id },
      })
      if (!employee || employee.id !== employeeId) {
        return res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions',
          error: 'Forbidden',
        })
      }
    }

    const payrolls = await prisma.payroll.findMany({
      where: { employeeId },
      include: {
        payrun: {
          select: {
            id: true,
            name: true,
            payPeriodStart: true,
            payPeriodEnd: true,
            payDate: true,
            status: true,
          },
        },
        payslip: {
          select: {
            id: true,
            pdfUrl: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    res.json({
      status: 'success',
      data: payrolls,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get single payroll by ID
 */
export const getPayrollById = async (req, res, next) => {
  try {
    const { payrollId } = req.params
    const user = req.user

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
            status: true,
          },
        },
        payslip: {
          select: {
            id: true,
            pdfUrl: true,
            status: true,
          },
        },
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

    res.json({
      status: 'success',
      data: payroll,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Update payroll values (for editing)
 */
export const updatePayroll = async (req, res, next) => {
  try {
    const { payrollId } = req.params
    const { grossSalary, totalDeductions, netSalary } = req.body

    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
    })

    if (!payroll) {
      return res.status(404).json({
        status: 'error',
        message: 'Payroll not found',
        error: 'Not Found',
      })
    }

    // Only allow editing if status is computed or draft
    if (payroll.status === 'validated') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot edit validated payroll',
        error: 'Validation Error',
      })
    }

    // Calculate net if not provided
    const calculatedNet = netSalary !== undefined 
      ? netSalary 
      : (grossSalary || payroll.grossSalary) - (totalDeductions || payroll.totalDeductions)

    // Update payroll
    const updated = await prisma.payroll.update({
      where: { id: payrollId },
      data: {
        grossSalary: grossSalary !== undefined ? grossSalary : payroll.grossSalary,
        totalDeductions: totalDeductions !== undefined ? totalDeductions : payroll.totalDeductions,
        netSalary: calculatedNet,
      },
    })

    res.json({
      status: 'success',
      message: 'Payroll updated successfully',
      data: updated,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Validate a single payroll
 */
export const validatePayroll = async (req, res, next) => {
  try {
    const { payrollId } = req.params

    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
      include: {
        payrun: true,
      },
    })

    if (!payroll) {
      return res.status(404).json({
        status: 'error',
        message: 'Payroll not found',
        error: 'Not Found',
      })
    }

    if (payroll.status !== 'computed' && payroll.status !== 'draft') {
      return res.status(400).json({
        status: 'error',
        message: `Payroll is not in computed or draft status. Current status: ${payroll.status}`,
        error: 'Validation Error',
      })
    }

    // Update payroll status to validated
    const updated = await prisma.payroll.update({
      where: { id: payrollId },
      data: {
        status: 'validated',
        validatedAt: new Date(),
      },
    })

    // Check if all payrolls in the payrun are validated
    const allPayrolls = await prisma.payroll.findMany({
      where: { payrunId: payroll.payrunId },
    })

    const allValidated = allPayrolls.every((p) => p.status === 'validated')
    const totalAmount = allPayrolls.reduce((sum, p) => sum + p.netSalary, 0)

    // If all validated, update payrun status to completed
    if (allValidated) {
      await prisma.payrun.update({
        where: { id: payroll.payrunId },
        data: {
          status: 'completed',
          totalAmount,
        },
      })
    }

    res.json({
      status: 'success',
      message: 'Payroll validated successfully',
      data: {
        ...updated,
        payrunCompleted: allValidated,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Validate all payrolls in a payrun
 */
export const validateAllPayrolls = async (req, res, next) => {
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

    // Get all payrolls that are not validated
    const payrolls = await prisma.payroll.findMany({
      where: {
        payrunId,
        status: { in: ['draft', 'computed'] },
      },
    })

    if (payrolls.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No payrolls to validate',
        error: 'Validation Error',
      })
    }

    // Validate all payrolls
    await prisma.payroll.updateMany({
      where: {
        payrunId,
        status: { in: ['draft', 'computed'] },
      },
      data: {
        status: 'validated',
        validatedAt: new Date(),
      },
    })

    // Get all payrolls to calculate total
    const allPayrolls = await prisma.payroll.findMany({
      where: { payrunId },
    })

    const totalAmount = allPayrolls.reduce((sum, p) => sum + p.netSalary, 0)

    // Update payrun status to completed
    await prisma.payrun.update({
      where: { id: payrunId },
      data: {
        status: 'completed',
        totalAmount,
      },
    })

    res.json({
      status: 'success',
      message: `Validated ${payrolls.length} payroll(s) successfully`,
      data: {
        validatedCount: payrolls.length,
        payrunStatus: 'completed',
        totalAmount,
      },
    })
  } catch (error) {
    next(error)
  }
}

