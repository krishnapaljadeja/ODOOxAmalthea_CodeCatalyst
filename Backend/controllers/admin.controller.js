import { PrismaClient } from '@prisma/client'
import { sendAccountCreationEmail } from '../utils/email.utils.js'
import { generatePasswordResetToken } from '../utils/email.utils.js'
import { hashPassword } from '../utils/password.utils.js'

const prisma = new PrismaClient()

/**
 * Get all users (admin only)
 * Only returns users from the admin's company
 */
export const getUsers = async (req, res, next) => {
  try {
    const user = req.user
    
    // Build where clause to filter by company
    const where = {}
    if (user.companyId) {
      where.companyId = user.companyId
    }
    
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        role: true,
        companyId: true,
        avatar: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    res.json({
      status: 'success',
      data: users,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Send login credentials to user via email
 */
export const sendCredentials = async (req, res, next) => {
  try {
    const { userId } = req.params
    const admin = req.user

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        error: 'Not Found',
      })
    }

    // Verify user belongs to the same company as the admin
    if (admin.companyId && user.companyId !== admin.companyId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only send credentials to users in your company',
        error: 'Forbidden',
      })
    }

    // Generate password reset token
    const resetToken = generatePasswordResetToken()

    // Store password reset token
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1) // 1 hour expiry

    await prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        email: user.email,
        expiresAt,
      },
    })

    // Send email with credentials
    // Note: We can't retrieve the plain password, so we'll send a password reset link
    // The email will inform the user to reset their password
    const loginId = user.employeeId || user.email
    
    // Send email with login ID and password reset link
    try {
      await sendAccountCreationEmail(
        user.email,
        loginId,
        '[Please reset your password using the link below]',
        `${user.firstName} ${user.lastName}`,
        resetToken
      )
    } catch (emailError) {
      console.error('Failed to send email:', emailError)
      // Continue even if email fails
    }

    res.json({
      status: 'success',
      data: {
        message: 'Login credentials sent successfully via email',
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Update user password (admin only)
 */
export const updateUserPassword = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { password } = req.body

    if (!password || password.length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters long',
        error: 'Validation Error',
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        error: 'Not Found',
      })
    }

    // Verify user belongs to the same company as the admin
    const admin = req.user
    if (admin.companyId && user.companyId !== admin.companyId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only update passwords for users in your company',
        error: 'Forbidden',
      })
    }

    // Hash the new password
    const hashedPassword = await hashPassword(password)

    // Update user password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    })

    res.json({
      status: 'success',
      data: {
        message: 'Password updated successfully',
      },
    })
  } catch (error) {
    next(error)
  }
}

