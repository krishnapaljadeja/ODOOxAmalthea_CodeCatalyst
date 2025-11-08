import { PrismaClient } from '@prisma/client'
import { generateEmployeeId } from '../utils/employee.utils.js'
import { hashPassword } from '../utils/password.utils.js'

const prisma = new PrismaClient()

/**
 * Get list of employees
 */
export const getEmployees = async (req, res, next) => {
  try {
    const { search, department, status } = req.query
    const user = req.user

    // Build where clause
    const where = {}

    // Role-based filtering
    if (user.role === 'employee') {
      // Employees can only see themselves
      where.userId = user.id
    } else if (user.role === 'manager') {
      // Managers can see employees in their department
      if (user.department) {
        where.department = user.department
      }
    }
    // Admin and HR can see all

    if (status) {
      where.status = status
    }

    if (department) {
      where.department = department
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
      ]
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            avatar: true,
            phone: true,
            department: true,
            position: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Format response
    const formattedEmployees = employees.map((emp) => ({
      id: emp.id,
      employeeId: emp.employeeId,
      email: emp.email,
      firstName: emp.firstName,
      lastName: emp.lastName,
      avatar: emp.avatar,
      phone: emp.phone,
      department: emp.department,
      position: emp.position,
      status: emp.status,
      hireDate: emp.hireDate.toISOString(),
      salary: emp.salary,
      createdAt: emp.createdAt.toISOString(),
      updatedAt: emp.updatedAt.toISOString(),
    }))

    res.json({
      status: 'success',
      data: formattedEmployees,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Create new employee
 */
export const createEmployee = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, department, position, salary, hireDate } = req.body

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email already exists',
        error: 'Validation Error',
      })
    }

    // Generate employee ID
    const employeeId = await generateEmployeeId()

    // Hash password (default password)
    const defaultPassword = 'password123'
    const hashedPassword = await hashPassword(defaultPassword)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'employee',
        phone,
        department,
        position,
        employeeId,
      },
    })

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        employeeId,
        userId: user.id,
        email,
        firstName,
        lastName,
        phone,
        department,
        position,
        status: 'active',
        hireDate: new Date(hireDate),
        salary: parseFloat(salary),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            avatar: true,
            phone: true,
            department: true,
            position: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })

    // Format response
    const formattedEmployee = {
      id: employee.id,
      employeeId: employee.employeeId,
      email: employee.email,
      firstName: employee.firstName,
      lastName: employee.lastName,
      avatar: employee.avatar,
      phone: employee.phone,
      department: employee.department,
      position: employee.position,
      status: employee.status,
      hireDate: employee.hireDate.toISOString(),
      salary: employee.salary,
      createdAt: employee.createdAt.toISOString(),
      updatedAt: employee.updatedAt.toISOString(),
    }

    res.status(201).json({
      status: 'success',
      data: formattedEmployee,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Import employees from CSV/Excel
 */
export const importEmployees = async (req, res, next) => {
  try {
    // This would require a file parsing library like multer and xlsx
    // For now, return a placeholder
    res.status(501).json({
      status: 'error',
      message: 'Import functionality not yet implemented',
      error: 'Not Implemented',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Export employees to CSV
 */
export const exportEmployees = async (req, res, next) => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        user: {
          select: {
            email: true,
            phone: true,
          },
        },
      },
    })

    // Convert to CSV
    const headers = ['Employee ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Department', 'Position', 'Status', 'Hire Date', 'Salary']
    const rows = employees.map((emp) => [
      emp.employeeId,
      emp.firstName,
      emp.lastName,
      emp.email,
      emp.phone || '',
      emp.department,
      emp.position,
      emp.status,
      emp.hireDate.toISOString().split('T')[0],
      emp.salary,
    ])

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename=employees-${new Date().toISOString().split('T')[0]}.csv`)
    res.send(csv)
  } catch (error) {
    next(error)
  }
}

