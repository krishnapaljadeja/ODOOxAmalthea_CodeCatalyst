import { PrismaClient } from '@prisma/client'
import { hashPassword, comparePassword } from '../utils/password.utils.js'

const prisma = new PrismaClient()

/**
 * Get current user profile
 */
export const getProfile = async (req, res, next) => {
  try {
    const user = req.user

    // Get user with employee data if available
    const userWithEmployee = await prisma.user.findUnique({
      where: { id: user.id },
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
        employeeId: true,
        companyId: true,
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            department: true,
            position: true,
            status: true,
            hireDate: true,
            salary: true,
            dateOfBirth: true,
            address: true,
            nationality: true,
            personalEmail: true,
            gender: true,
            maritalStatus: true,
            accountNumber: true,
            bankName: true,
            ifscCode: true,
            panNo: true,
            uanNo: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            code: true,
            logo: true,
          },
        },
        about: true,
        whatILoveAboutMyJob: true,
        interestsAndHobbies: true,
        skills: true,
        certifications: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    res.json({
      status: 'success',
      data: userWithEmployee,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Update profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      avatar,
      about,
      whatILoveAboutMyJob,
      interestsAndHobbies,
      skills,
      certifications,
      employeeData 
    } = req.body
    const user = req.user

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Email already in use',
          error: 'Validation Error',
        })
      }
    }

    // Update user
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(avatar !== undefined && { avatar }),
        ...(about !== undefined && { about }),
        ...(whatILoveAboutMyJob !== undefined && { whatILoveAboutMyJob }),
        ...(interestsAndHobbies !== undefined && { interestsAndHobbies }),
        ...(skills !== undefined && { skills }),
        ...(certifications !== undefined && { certifications }),
      },
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
        employeeId: true,
        about: true,
        whatILoveAboutMyJob: true,
        interestsAndHobbies: true,
        skills: true,
        certifications: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Update employee data if provided
    if (employeeData && user.employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { userId: user.id },
      })

      if (employee) {
        const updateData = {}
        
        // Handle dateOfBirth
        if (employeeData.dateOfBirth !== undefined) {
          if (employeeData.dateOfBirth && employeeData.dateOfBirth.trim()) {
            updateData.dateOfBirth = new Date(employeeData.dateOfBirth)
          } else {
            updateData.dateOfBirth = null
          }
        }
        
        // Handle other optional fields
        const optionalFields = ['address', 'nationality', 'personalEmail', 'gender', 'maritalStatus', 'accountNumber', 'bankName', 'ifscCode', 'panNo', 'uanNo']
        optionalFields.forEach(field => {
          if (employeeData[field] !== undefined) {
            if (employeeData[field] && String(employeeData[field]).trim()) {
              updateData[field] = employeeData[field]
            } else {
              updateData[field] = null
            }
          }
        })
        
        await prisma.employee.update({
          where: { id: employee.id },
          data: updateData,
        })
      }
    }

    res.json({
      status: 'success',
      data: updated,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Change password
 */
export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body
    const user = req.user

    // Get user with password
    const userWithPassword = await prisma.user.findUnique({
      where: { id: user.id },
    })

    // Verify old password
    const isValid = await comparePassword(oldPassword, userWithPassword.password)
    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password is incorrect',
        error: 'Validation Error',
      })
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword)

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    res.json({
      status: 'success',
      data: {
        message: 'Password changed successfully',
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get salary information for current user
 */
export const getSalaryInfo = async (req, res, next) => {
  try {
    const user = req.user

    // Get employee data
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        employeeId: true,
        salary: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    })

    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee record not found',
        error: 'Not Found',
      })
    }

    // Calculate salary components
    const basicSalary = employee.salary * 0.5
    const hra = basicSalary * 0.5
    const conveyance = employee.salary * 0.1
    const medicalAllowance = employee.salary * 0.1
    const specialAllowance = employee.salary * 0.05
    const grossSalary = employee.salary
    const pf = basicSalary * 0.12
    const esi = 0
    const professionalTax = 200
    const netSalary = grossSalary - pf - esi - professionalTax

    res.json({
      status: 'success',
      data: {
        basicSalary,
        hra,
        conveyance,
        medicalAllowance,
        specialAllowance,
        grossSalary,
        pf,
        esi,
        professionalTax,
        netSalary,
      },
    })
  } catch (error) {
    next(error)
  }
}

