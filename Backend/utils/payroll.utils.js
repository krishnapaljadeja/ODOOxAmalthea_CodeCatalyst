import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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

export const calculatePayroll = async (employee, payrun) => {
  const salaryStructure = await getActiveSalaryStructure(
    employee.id,
    payrun.payPeriodStart
  )

  if (!salaryStructure) {
    throw new Error(
      `No active salary structure found for employee ${employee.employeeId}`
    )
  }

  const grossSalary =
    salaryStructure.basicSalary +
    salaryStructure.houseRentAllowance +
    salaryStructure.standardAllowance +
    salaryStructure.bonus +
    salaryStructure.travelAllowance

  const totalDeductions =
    salaryStructure.pfEmployee +
    salaryStructure.professionalTax +
    salaryStructure.tds +
    salaryStructure.otherDeductions

  const netSalary = grossSalary - totalDeductions

  return {
    grossSalary,
    totalDeductions,
    netSalary,
    salaryStructure,
  }
}

