import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Generate unique employee ID
 */
export const generateEmployeeId = async () => {
  const prefix = 'HRMS'
  let counter = 1
  let employeeId = `${prefix}-${String(counter).padStart(3, '0')}`

  // Find the highest existing employee ID
  const lastEmployee = await prisma.employee.findFirst({
    where: {
      employeeId: {
        startsWith: prefix,
      },
    },
    orderBy: {
      employeeId: 'desc',
    },
  })

  if (lastEmployee) {
    const lastNumber = parseInt(lastEmployee.employeeId.split('-')[1])
    counter = lastNumber + 1
    employeeId = `${prefix}-${String(counter).padStart(3, '0')}`
  }

  // Ensure uniqueness
  while (await prisma.employee.findUnique({ where: { employeeId } })) {
    counter++
    employeeId = `${prefix}-${String(counter).padStart(3, '0')}`
  }

  return employeeId
}

