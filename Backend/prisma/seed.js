import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Hash password
  const hashedPassword = await bcrypt.hash('password123', 10)

  // Create Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@workzen.com' },
    update: {},
    create: {
      email: 'admin@workzen.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Doe',
      role: 'admin',
      phone: '+1234567890',
      department: 'IT',
      position: 'Administrator',
      employeeId: 'HRMS-001',
    },
  })

  // Create Admin Employee
  const adminEmployee = await prisma.employee.upsert({
    where: { employeeId: 'HRMS-001' },
    update: {},
    create: {
      employeeId: 'HRMS-001',
      userId: adminUser.id,
      email: 'admin@workzen.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      department: 'IT',
      position: 'Administrator',
      status: 'active',
      hireDate: new Date('2023-01-01'),
      salary: 100000,
    },
  })

  // Create HR User
  const hrUser = await prisma.user.upsert({
    where: { email: 'hr@workzen.com' },
    update: {},
    create: {
      email: 'hr@workzen.com',
      password: hashedPassword,
      firstName: 'Sarah',
      lastName: 'Williams',
      role: 'hr',
      phone: '+1234567891',
      department: 'Human Resources',
      position: 'HR Manager',
      employeeId: 'HRMS-002',
    },
  })

  // Create HR Employee
  const hrEmployee = await prisma.employee.upsert({
    where: { employeeId: 'HRMS-002' },
    update: {},
    create: {
      employeeId: 'HRMS-002',
      userId: hrUser.id,
      email: 'hr@workzen.com',
      firstName: 'Sarah',
      lastName: 'Williams',
      phone: '+1234567891',
      department: 'Human Resources',
      position: 'HR Manager',
      status: 'active',
      hireDate: new Date('2023-02-01'),
      salary: 90000,
    },
  })

  // Create Manager User
  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@workzen.com' },
    update: {},
    create: {
      email: 'manager@workzen.com',
      password: hashedPassword,
      firstName: 'Michael',
      lastName: 'Brown',
      role: 'manager',
      phone: '+1234567892',
      department: 'Engineering',
      position: 'Engineering Manager',
      employeeId: 'HRMS-003',
    },
  })

  // Create Manager Employee
  const managerEmployee = await prisma.employee.upsert({
    where: { employeeId: 'HRMS-003' },
    update: {},
    create: {
      employeeId: 'HRMS-003',
      userId: managerUser.id,
      email: 'manager@workzen.com',
      firstName: 'Michael',
      lastName: 'Brown',
      phone: '+1234567892',
      department: 'Engineering',
      position: 'Engineering Manager',
      status: 'active',
      hireDate: new Date('2023-03-01'),
      salary: 85000,
    },
  })

  // Create Employee User
  const employeeUser = await prisma.user.upsert({
    where: { email: 'employee@workzen.com' },
    update: {},
    create: {
      email: 'employee@workzen.com',
      password: hashedPassword,
      firstName: 'Emily',
      lastName: 'Davis',
      role: 'employee',
      phone: '+1234567893',
      department: 'Engineering',
      position: 'Software Engineer',
      employeeId: 'HRMS-004',
    },
  })

  // Create Employee
  const employee = await prisma.employee.upsert({
    where: { employeeId: 'HRMS-004' },
    update: {},
    create: {
      employeeId: 'HRMS-004',
      userId: employeeUser.id,
      email: 'employee@workzen.com',
      firstName: 'Emily',
      lastName: 'Davis',
      phone: '+1234567893',
      department: 'Engineering',
      position: 'Software Engineer',
      status: 'active',
      hireDate: new Date('2023-04-01'),
      salary: 75000,
    },
  })

  // Create Payroll Settings
  const existingSettings = await prisma.payrollSettings.findUnique({
    where: { id: 'default' },
  })

  if (!existingSettings) {
    await prisma.payrollSettings.create({
      data: {
        id: 'default',
        taxRate: 18.5,
        insuranceRate: 3.5,
        payPeriodDays: 30,
      },
    })
  }

  // Create sample attendance records
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Today's attendance for employee
  await prisma.attendance.upsert({
    where: {
      employeeId_date: {
        employeeId: employee.id,
        date: today,
      },
    },
    update: {},
    create: {
      employeeId: employee.id,
      userId: employeeUser.id,
      date: today,
      checkIn: new Date(today.getTime() + 9 * 60 * 60 * 1000), // 9 AM
      status: 'present',
      hoursWorked: 8,
    },
  })

  // Create sample leave request
  const leaveStartDate = new Date(today)
  leaveStartDate.setDate(leaveStartDate.getDate() + 7)
  const leaveEndDate = new Date(leaveStartDate)
  leaveEndDate.setDate(leaveEndDate.getDate() + 2)

  await prisma.leave.create({
    data: {
      employeeId: employee.id,
      userId: employeeUser.id,
      type: 'vacation',
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      days: 3,
      reason: 'Family vacation',
      status: 'pending',
    },
  })

  // Create sample payrun
  const payrun = await prisma.payrun.create({
    data: {
      name: `Payrun ${today.toISOString().split('T')[0]}`,
      payPeriodStart: new Date(today.getFullYear(), today.getMonth(), 1),
      payPeriodEnd: new Date(today.getFullYear(), today.getMonth() + 1, 0),
      payDate: new Date(today.getFullYear(), today.getMonth() + 1, 5),
      status: 'completed',
      totalEmployees: 4,
      totalAmount: 350000,
    },
  })

  // Create sample payslip
  await prisma.payslip.create({
    data: {
      employeeId: employee.id,
      userId: employeeUser.id,
      payrunId: payrun.id,
      payPeriodStart: payrun.payPeriodStart,
      payPeriodEnd: payrun.payPeriodEnd,
      payDate: payrun.payDate,
      baseSalary: 75000 / 12, // Monthly
      overtime: 0,
      bonus: 5000,
      allowances: 2000,
      grossPay: 8750,
      tax: 1618.75,
      insurance: 306.25,
      other: 0,
      totalDeductions: 1925,
      netPay: 6825,
    },
  })

  console.log('✅ Database seeded successfully!')
  console.log('\n📋 Test Accounts:')
  console.log('  Admin:    admin@workzen.com / password123')
  console.log('  HR:      hr@workzen.com / password123')
  console.log('  Manager: manager@workzen.com / password123')
  console.log('  Employee: employee@workzen.com / password123')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

