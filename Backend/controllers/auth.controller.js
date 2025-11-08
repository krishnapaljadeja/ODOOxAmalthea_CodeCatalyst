import { PrismaClient } from "@prisma/client";
import { hashPassword, comparePassword } from "../utils/password.utils.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.utils.js";
import {
  generateEmployeeId,
  generateCompanyCode,
} from "../utils/employee.utils.js";

const prisma = new PrismaClient();

/**
 * Login user
 * Supports both email and employee ID for login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const loginId = email; // Can be either email or employee ID

    // Try to find user by email first
    let user = await prisma.user.findUnique({
      where: { email: loginId },
    });

    // If not found by email, try to find by employee ID
    if (!user) {
      user = await prisma.user.findUnique({
        where: { employeeId: loginId },
      });
    }

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials",
        error: "Unauthorized",
      });
    }

    // Verify password
    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials",
        error: "Unauthorized",
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      status: "success",
      data: {
        accessToken,
        refreshToken,
        user: userWithoutPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 */
export const logout = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      // Invalidate refresh token if provided
      // For now, just return success
    }

    res.json({
      status: "success",
      data: {
        success: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 */
export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        status: "error",
        message: "Invalid refresh token",
        error: "Unauthorized",
      });
    }

    // Check if refresh token exists in database
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      return res.status(401).json({
        status: "error",
        message: "Refresh token expired or invalid",
        error: "Unauthorized",
      });
    }

    // Generate new access token
    const accessToken = generateAccessToken(decoded.userId);

    res.json({
      status: "success",
      data: {
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user
 */
export const getMe = async (req, res, next) => {
  try {
    const user = req.user;

    res.json({
      status: "success",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register new user
 * Note: This creates both company, employee, and user records
 * Login ID is auto-generated based on company name, employee name, and hire date
 */
export const registerUser = async (req, res, next) => {
  try {
    const { companyName, name, email, phone, password } = req.body;

    // Validate required fields
    if (!companyName || companyName.length < 2) {
      return res.status(400).json({
        status: "error",
        message: "Company name is required and must be at least 2 characters",
        error: "Validation Error",
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        status: "error",
        message: "User with this email already exists",
        error: "Validation Error",
      });
    }

    // Get or create company
    // First check if company with this name already exists
    let company = await prisma.company.findUnique({
      where: { name: companyName },
    });

    // If company doesn't exist, generate unique code and create
    if (!company) {
      const companyCode = await generateCompanyCode(companyName);

      try {
        company = await prisma.company.create({
          data: {
            name: companyName,
            code: companyCode,
          },
        });
      } catch (error) {
        // If code conflict occurs (shouldn't happen, but handle it)
        if (error.code === "P2002" && error.meta?.target?.includes("code")) {
          // Generate fallback code with timestamp
          const fallbackCode = `${companyName
            .substring(0, 2)
            .toUpperCase()}${Date.now().toString().slice(-4)}`;
          company = await prisma.company.create({
            data: {
              name: companyName,
              code: fallbackCode,
            },
          });
        } else {
          throw error;
        }
      }
    }

    // Split name
    const nameParts = name.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || firstName;

    if (firstName.length < 2 || lastName.length < 2) {
      return res.status(400).json({
        status: "error",
        message:
          "First name and last name must each be at least 2 characters long",
        error: "Validation Error",
      });
    }

    // Use current date as hire date for registration
    const hireDate = new Date();

    // Generate employee ID using company code
    const employeeId = await generateEmployeeId(
      companyCode,
      firstName,
      lastName,
      hireDate,
      company.id
    );

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create employee first
    const employee = await prisma.employee.create({
      data: {
        employeeId,
        email,
        firstName,
        lastName,
        phone: phone || null,
        department: "General", // Default department
        position: "Employee", // Default position
        status: "active",
        hireDate,
        salary: 0, // Default salary, can be updated later
        companyId: company.id,
      },
    });

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: "employee",
        phone: phone || null,
        department: employee.department,
        position: employee.position,
        employeeId,
        companyId: company.id,
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
    });

    // Update employee with userId
    await prisma.employee.update({
      where: { id: employee.id },
      data: { userId: user.id },
    });

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    res.status(201).json({
      status: "success",
      data: {
        accessToken,
        refreshToken,
        user: {
          ...user,
          employeeId, // Include the generated employee ID
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
