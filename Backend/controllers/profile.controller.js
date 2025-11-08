import { PrismaClient } from '@prisma/client'
import { hashPassword, comparePassword } from '../utils/password.utils.js'

const prisma = new PrismaClient()

/**
 * Update profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, address, dateOfBirth, gender } = req.body
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
        createdAt: true,
        updatedAt: true,
      },
    })

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

