import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Calculate payslip for an employee
 */
export const calculatePayslip = async (employee, payrun, settings = null) => {
  // Get default settings if not provided
  if (!settings) {
    settings = await prisma.payrollSettings.findUnique({
      where: { id: 'default' },
    })
    if (!settings) {
      settings = await prisma.payrollSettings.create({
        data: { id: 'default' },
      })
    }
  }

  // Get attendance for the pay period
  const attendances = await prisma.attendance.findMany({
    where: {
      employeeId: employee.id,
      date: {
        gte: payrun.payPeriodStart,
        lte: payrun.payPeriodEnd,
      },
      status: 'present',
    },
  })

  const daysWorked = attendances.length
  const totalHours = attendances.reduce((sum, att) => sum + (att.hoursWorked || 0), 0)

  // Calculate base salary (proportional to days worked)
  const dailyRate = employee.salary / settings.payPeriodDays
  const baseSalary = dailyRate * daysWorked

  // Calculate overtime (hours > 8 per day)
  const overtimeHours = Math.max(0, totalHours - daysWorked * 8)
  const overtimeRate = dailyRate / 8 * 1.5 // 1.5x for overtime
  const overtime = overtimeHours * overtimeRate

  // Allowances (10% of base salary)
  const allowances = baseSalary * 0.1

  // Bonus (if applicable)
  const bonus = 0

  // Gross pay
  const grossPay = baseSalary + overtime + allowances + bonus

  // Deductions
  const tax = grossPay * (settings.taxRate / 100)
  const insurance = grossPay * (settings.insuranceRate / 100)
  const other = 0
  const totalDeductions = tax + insurance + other

  // Net pay
  const netPay = grossPay - totalDeductions

  return {
    baseSalary,
    overtime,
    bonus,
    allowances,
    grossPay,
    tax,
    insurance,
    other,
    totalDeductions,
    netPay,
  }
}

