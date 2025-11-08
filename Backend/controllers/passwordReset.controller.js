import { PrismaClient } from "@prisma/client";
import { hashPassword, comparePassword } from "../utils/password.utils.js";
import {
  generatePasswordResetToken,
  sendPasswordResetEmail,
} from "../utils/email.utils.js";

const prisma = new PrismaClient();

/**
 * Request password reset
 */
export const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Email is required",
        error: "Validation Error",
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      return res.json({
        status: "success",
        message: "If the email exists, a password reset link has been sent.",
      });
    }

    // Generate reset token
    const resetToken = generatePasswordResetToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    // Invalidate existing tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        used: false,
      },
      data: {
        used: true,
      },
    });

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        email: user.email,
        expiresAt,
      },
    });

    // Send password reset email
    try {
      await sendPasswordResetEmail(user.email, user.firstName, resetToken);
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
      // Don't fail the request, just log the error
    }

    res.json({
      status: "success",
      message: "If the email exists, a password reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password using token
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token, email, newPassword } = req.body;

    if (!token || !email || !newPassword) {
      return res.status(400).json({
        status: "error",
        message: "Token, email, and new password are required",
        error: "Validation Error",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: "error",
        message: "Password must be at least 6 characters long",
        error: "Validation Error",
      });
    }

    // Find reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        user: true,
      },
    });

    if (!resetToken) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired reset token",
        error: "Validation Error",
      });
    }

    // Check if token is used
    if (resetToken.used) {
      return res.status(400).json({
        status: "error",
        message: "This reset token has already been used",
        error: "Validation Error",
      });
    }

    // Check if token is expired
    if (new Date() > resetToken.expiresAt) {
      return res.status(400).json({
        status: "error",
        message: "Reset token has expired",
        error: "Validation Error",
      });
    }

    // Check if email matches
    if (resetToken.email !== email) {
      return res.status(400).json({
        status: "error",
        message: "Invalid email for this token",
        error: "Validation Error",
      });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        password: hashedPassword,
      },
    });

    // Mark token as used
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: {
        used: true,
      },
    });

    res.json({
      status: "success",
      message: "Password has been reset successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify reset token
 */
export const verifyResetToken = async (req, res, next) => {
  try {
    const { token, email } = req.query;

    if (!token || !email) {
      return res.status(400).json({
        status: "error",
        message: "Token and email are required",
        error: "Validation Error",
      });
    }

    // Find reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return res.status(400).json({
        status: "error",
        message: "Invalid reset token",
        error: "Validation Error",
        valid: false,
      });
    }

    // Check if token is used
    if (resetToken.used) {
      return res.status(400).json({
        status: "error",
        message: "This reset token has already been used",
        error: "Validation Error",
        valid: false,
      });
    }

    // Check if token is expired
    if (new Date() > resetToken.expiresAt) {
      return res.status(400).json({
        status: "error",
        message: "Reset token has expired",
        error: "Validation Error",
        valid: false,
      });
    }

    // Check if email matches
    if (resetToken.email !== email) {
      return res.status(400).json({
        status: "error",
        message: "Invalid email for this token",
        error: "Validation Error",
        valid: false,
      });
    }

    res.json({
      status: "success",
      message: "Token is valid",
      valid: true,
    });
  } catch (error) {
    next(error);
  }
};

