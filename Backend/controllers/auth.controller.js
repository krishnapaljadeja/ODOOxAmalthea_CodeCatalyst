import { PrismaClient } from '@prisma/client'
import { hashPassword, comparePassword } from '../utils/password.utils.js'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.utils.js'

const prisma = new PrismaClient()

/**
 * Login user
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials',
        error: 'Unauthorized',
      })
    }

    // Verify password
    const isValid = await comparePassword(password, user.password)
    if (!isValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials',
        error: 'Unauthorized',
      })
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id)
    const refreshToken = generateRefreshToken(user.id)

    // Store refresh token
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    })

    // Return user without password
    const { password: _, ...userWithoutPassword } = user

    res.json({
      status: 'success',
      data: {
        accessToken,
        refreshToken,
        user: userWithoutPassword,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Logout user
 */
export const logout = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      // Invalidate refresh token if provided
      // For now, just return success
    }

    res.json({
      status: 'success',
      data: {
        success: true,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Refresh access token
 */
export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body

    // Verify refresh token
    let decoded
    try {
      decoded = verifyRefreshToken(refreshToken)
    } catch (error) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token',
        error: 'Unauthorized',
      })
    }

    // Check if refresh token exists in database
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    })

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token expired or invalid',
        error: 'Unauthorized',
      })
    }

    // Generate new access token
    const accessToken = generateAccessToken(decoded.userId)

    res.json({
      status: 'success',
      data: {
        accessToken,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get current user
 */
export const getMe = async (req, res, next) => {
  try {
    const user = req.user

    res.json({
      status: 'success',
      data: user,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Register new user
 */
export const registerUser = async (req, res, next) => {
  try {
    const { employeeId, name, email, password } = req.body

    // Check if user already exists
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

    // Check if employee ID exists
    const employee = await prisma.employee.findUnique({
      where: { employeeId },
    })

    if (!employee) {
      return res.status(400).json({
        status: 'error',
        message: 'Employee ID not found',
        error: 'Validation Error',
      })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Split name
    const nameParts = name.split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'employee',
        employeeId,
        department: employee.department,
        position: employee.position,
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

    // Generate tokens
    const accessToken = generateAccessToken(user.id)
    const refreshToken = generateRefreshToken(user.id)

    // Store refresh token
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    })

    res.status(201).json({
      status: 'success',
      data: {
        accessToken,
        refreshToken,
        user,
      },
    })
  } catch (error) {
    next(error)
  }
}

