import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Get active salary structure for an employee for a given date
 */
export const getActiveSalaryStructure = async (employeeId, date) => {
  const targetDate = date || new Date()

  const structure = await prisma.salaryStructure.findFirst({
    where: {
      employeeId,
      AND: [
        {
          effectiveFrom: {
            lte: targetDate,
          },
        },
        {
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: targetDate } },
          ],
        },
      ],
    },
    orderBy: {
      effectiveFrom: 'desc',
    },
  })

  return structure
}

/**
 * Calculate payroll for an employee using their active salary structure
 */
export const calculatePayroll = async (employee, payrun) => {
  // Get active salary structure for the pay period
  const salaryStructure = await getActiveSalaryStructure(
    employee.id,
    payrun.payPeriodStart
  )

  if (!salaryStructure) {
    throw new Error(
      `No active salary structure found for employee ${employee.employeeId}`
    )
  }

  // Calculate gross salary from structure
  // gross = basic + hra + allowances + bonus
  const grossSalary =
    salaryStructure.basicSalary +
    salaryStructure.houseRentAllowance +
    salaryStructure.standardAllowance +
    salaryStructure.bonus +
    salaryStructure.travelAllowance

  // Calculate deductions from structure
  // deductions = pf + professionalTax + tds + otherDeductions
  const totalDeductions =
    salaryStructure.pfEmployee +
    salaryStructure.professionalTax +
    salaryStructure.tds +
    salaryStructure.otherDeductions

  // Calculate net salary
  const netSalary = grossSalary - totalDeductions

  return {
    grossSalary,
    totalDeductions,
    netSalary,
    salaryStructure,
  }
}

