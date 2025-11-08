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

    // Get employee data with salary structure
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        employeeId: true,
        salary: true,
        firstName: true,
        lastName: true,
        email: true,
        monthWage: true,
        yearlyWage: true,
        workingDaysPerWeek: true,
        breakTime: true,
        basicSalary: true,
        basicSalaryPercent: true,
        houseRentAllowance: true,
        hraPercent: true,
        standardAllowance: true,
        standardAllowancePercent: true,
        performanceBonus: true,
        performanceBonusPercent: true,
        travelAllowance: true,
        ltaPercent: true,
        fixedAllowance: true,
        fixedAllowancePercent: true,
        pfEmployee: true,
        pfEmployeePercent: true,
        pfEmployer: true,
        pfEmployerPercent: true,
        professionalTax: true,
      },
    })

    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee record not found',
        error: 'Not Found',
      })
    }

    // Use stored values or calculate defaults
    const monthWage = employee.monthWage || employee.salary || 0
    const yearlyWage = employee.yearlyWage || (monthWage * 12)
    const basicSalary = employee.basicSalary || (monthWage * 0.5)
    const basicSalaryPercent = employee.basicSalaryPercent || 50.0
    const hra = employee.houseRentAllowance || (basicSalary * 0.5)
    const hraPercent = employee.hraPercent || 50.0
    const standardAllowance = employee.standardAllowance || (monthWage * 0.1667)
    const standardAllowancePercent = employee.standardAllowancePercent || 16.67
    const performanceBonus = employee.performanceBonus || (basicSalary * 0.0833)
    const performanceBonusPercent = employee.performanceBonusPercent || 8.33
    const travelAllowance = employee.travelAllowance || (basicSalary * 0.0833)
    const ltaPercent = employee.ltaPercent || 8.33
    const fixedAllowance = employee.fixedAllowance || (monthWage * 0.1167)
    const fixedAllowancePercent = employee.fixedAllowancePercent || 11.67
    
    const grossSalary = basicSalary + hra + standardAllowance + performanceBonus + travelAllowance + fixedAllowance
    
    const pfEmployee = employee.pfEmployee || (basicSalary * 0.12)
    const pfEmployeePercent = employee.pfEmployeePercent || 12.0
    const pfEmployer = employee.pfEmployer || (basicSalary * 0.12)
    const pfEmployerPercent = employee.pfEmployerPercent || 12.0
    const professionalTax = employee.professionalTax || 200
    
    const netSalary = grossSalary - pfEmployee - professionalTax

    res.json({
      status: 'success',
      data: {
        monthWage,
        yearlyWage,
        workingDaysPerWeek: employee.workingDaysPerWeek,
        breakTime: employee.breakTime,
        basicSalary,
        basicSalaryPercent,
        houseRentAllowance: hra,
        hraPercent,
        standardAllowance,
        standardAllowancePercent,
        performanceBonus,
        performanceBonusPercent,
        travelAllowance,
        ltaPercent,
        fixedAllowance,
        fixedAllowancePercent,
        grossSalary,
        pfEmployee,
        pfEmployeePercent,
        pfEmployer,
        pfEmployerPercent,
        professionalTax,
        netSalary,
      },
    })
  } catch (error) {
    next(error)
  }
}

