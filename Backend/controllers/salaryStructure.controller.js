import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Create or update salary structure for an employee
 * Closes current active structure and creates a new one
 */
export const upsertSalaryStructure = async (req, res, next) => {
  try {
    const { employeeId } = req.params
    const {
      name,
      description,
      effectiveFrom,
      // Earnings
      basicSalary,
      houseRentAllowance,
      standardAllowance,
      bonus,
      travelAllowance,
      // Deductions
      pfEmployee,
      pfEmployer,
      professionalTax,
      tds,
      otherDeductions,
    } = req.body

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    })

    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found',
        error: 'Not Found',
      })
    }

    // Find and close current active structure
    const activeStructure = await prisma.salaryStructure.findFirst({
      where: {
        employeeId,
        effectiveTo: null,
      },
    })

    const currentDate = new Date()
    const effectiveFromDate = effectiveFrom ? new Date(effectiveFrom) : currentDate

    // Close active structure if exists
    if (activeStructure) {
      await prisma.salaryStructure.update({
        where: { id: activeStructure.id },
        data: { effectiveTo: effectiveFromDate },
      })
    }

    // Calculate totals
    const earnings = {
      basic: basicSalary || 0,
      hra: houseRentAllowance || 0,
      allowances: standardAllowance || 0,
      bonus: bonus || 0,
      travel: travelAllowance || 0,
    }

    const deductions = {
      pfEmployee: pfEmployee || 0,
      pfEmployer: pfEmployer || 0,
      professionalTax: professionalTax || 0,
      tds: tds || 0,
      other: otherDeductions || 0,
    }

    const grossSalary =
      earnings.basic +
      earnings.hra +
      earnings.allowances +
      earnings.bonus +
      earnings.travel

    const totalDeductions =
      deductions.pfEmployee +
      deductions.professionalTax +
      deductions.tds +
      deductions.other

    const netSalary = grossSalary - totalDeductions

    // Create new salary structure
    const structure = await prisma.salaryStructure.create({
      data: {
        employeeId,
        name: name || (activeStructure ? 'Revised Structure' : 'Default Structure'),
        description: description || null,
        effectiveFrom: effectiveFromDate,
        effectiveTo: null, // Active structure
        // Earnings
        basicSalary: earnings.basic,
        houseRentAllowance: earnings.hra,
        standardAllowance: earnings.allowances,
        bonus: earnings.bonus,
        travelAllowance: earnings.travel,
        // Deductions
        pfEmployee: deductions.pfEmployee,
        pfEmployer: deductions.pfEmployer,
        professionalTax: deductions.professionalTax,
        tds: deductions.tds,
        otherDeductions: deductions.other,
        // Calculated totals
        grossSalary,
        totalDeductions,
        netSalary,
      },
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

    res.status(200).json({
      status: 'success',
      message: activeStructure
        ? 'Salary structure updated successfully'
        : 'Salary structure created successfully',
      data: structure,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get active salary structure for an employee
 */
export const getActiveSalaryStructure = async (req, res, next) => {
  try {
    const { employeeId } = req.params

    const structure = await prisma.salaryStructure.findFirst({
      where: {
        employeeId,
        effectiveTo: null,
      },
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
      orderBy: {
        effectiveFrom: 'desc',
      },
    })

    if (!structure) {
      return res.status(404).json({
        status: 'error',
        message: 'No active salary structure found for this employee',
        error: 'Not Found',
      })
    }

    res.json({
      status: 'success',
      data: structure,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get salary history for an employee
 */
export const getSalaryHistory = async (req, res, next) => {
  try {
    const { employeeId } = req.params

    const structures = await prisma.salaryStructure.findMany({
      where: { employeeId },
      orderBy: {
        effectiveFrom: 'desc',
      },
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

    res.json({
      status: 'success',
      data: structures,
    })
  } catch (error) {
    next(error)
  }
}
