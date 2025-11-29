import nodemailer from "nodemailer";
import crypto from "crypto";

const createTransporter = () => {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587");
  const secure = false; // Use STARTTLS instead of direct SSL
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // Log configuration (without sensitive data) for debugging
  console.log("[Email Config] SMTP Configuration:", {
    host,
    port,
    secure,
    user: user ? `${user.substring(0, 3)}***` : "NOT SET",
    hasPassword: !!pass,
    nodeEnv: process.env.NODE_ENV || "development",
  });

  // Validate required environment variables
  if (!user || !pass) {
    const error = new Error(
      "SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS environment variables."
    );
    console.error("[Email Config] Missing credentials:", {
      hasUser: !!user,
      hasPass: !!pass,
    });
    throw error;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    // Add connection timeout settings to prevent hanging
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 5000, // 5 seconds
    socketTimeout: 10000, // 10 seconds
    // Enable debug logging in development
    debug: process.env.NODE_ENV === "development",
    logger: process.env.NODE_ENV === "development",
  });

  // Verify connection configuration
  transporter.verify((error, success) => {
    if (error) {
      console.error("[Email Config] SMTP connection verification failed:", {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
      });
    } else {
      console.log("[Email Config] SMTP connection verified successfully");
    }
  });

  return transporter;
};

export const generateRandomPassword = (length = 12) => {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

export const generatePasswordResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

export const sendAccountCreationEmail = async (
  email,
  loginId,
  password,
  firstName,
  resetToken
) => {
  const startTime = Date.now();
  console.log(`[Email] Attempting to send account creation email to: ${email}`);

  try {
    const transporter = createTransporter();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || "WorkZen HRMS"}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Welcome to WorkZen HRMS - Your Account Credentials",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Credentials</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
            <h2 style="color: #2563eb; margin-top: 0;">Welcome to WorkZen HRMS!</h2>
            <p>Hello ${firstName},</p>
            <p>Your account has been created successfully. Below are your login credentials:</p>
            
            <div style="background-color: #ffffff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <p style="margin: 5px 0;"><strong>Login ID:</strong> ${loginId}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
            </div>
            
            <p><strong>⚠️ Important:</strong> For security reasons, please change your password after your first login.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #2563eb; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Change Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link in your browser:<br>
              <a href="${resetLink}" style="color: #2563eb; word-break: break-all;">${resetLink}</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="color: #666; font-size: 12px;">
              If you did not request this account, please contact your administrator immediately.
            </p>
            
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Best regards,<br>
              WorkZen HRMS Team
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to WorkZen HRMS!
        
        Hello ${firstName},
        
        Your account has been created successfully. Below are your login credentials:
        
        Login ID: ${loginId}
        Email: ${email}
        Password: ${password}
        
        IMPORTANT: For security reasons, please change your password after your first login.
        
        Change Password: ${resetLink}
        
        If you did not request this account, please contact your administrator immediately.
        
        Best regards,
        WorkZen HRMS Team
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    const duration = Date.now() - startTime;
    console.log(`[Email] Account creation email sent successfully to ${email} in ${duration}ms`, {
      messageId: info.messageId,
      response: info.response,
    });
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Email] Failed to send account creation email to ${email} after ${duration}ms:`, {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });

    // Provide more specific error messages
    if (error.code === "ETIMEDOUT" || error.code === "ECONNECTIONTIMEOUT") {
      throw new Error(
        `SMTP connection timeout. Check your SMTP host and port settings, and ensure Render allows outbound connections on port ${process.env.SMTP_PORT || "587"}.`
      );
    } else if (error.code === "EAUTH") {
      throw new Error(
        "SMTP authentication failed. Please verify your SMTP_USER and SMTP_PASS credentials."
      );
    } else if (error.code === "ECONNREFUSED") {
      throw new Error(
        `SMTP connection refused. Check if the SMTP host (${process.env.SMTP_HOST || "smtp.gmail.com"}) and port (${process.env.SMTP_PORT || "587"}) are correct.`
      );
    }

    throw error;
  }
};

export const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  const startTime = Date.now();
  console.log(`[Email] Attempting to send password reset email to: ${email}`);

  try {
    const transporter = createTransporter();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || "WorkZen HRMS"}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Reset Your WorkZen HRMS Password",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
            <h2 style="color: #2563eb; margin-top: 0;">Password Reset Request</h2>
            <p>Hello ${firstName},</p>
            <p>You have requested to reset your password. Click the button below to reset it:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #2563eb; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link in your browser:<br>
              <a href="${resetLink}" style="color: #2563eb; word-break: break-all;">${resetLink}</a>
            </p>
            
            <p style="color: #666; font-size: 12px;">
              This link will expire in 1 hour. If you did not request a password reset, please ignore this email.
            </p>
            
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Best regards,<br>
              WorkZen HRMS Team
            </p>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    const duration = Date.now() - startTime;
    console.log(`[Email] Password reset email sent successfully to ${email} in ${duration}ms`, {
      messageId: info.messageId,
      response: info.response,
    });
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Email] Failed to send password reset email to ${email} after ${duration}ms:`, {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });

    // Provide more specific error messages
    if (error.code === "ETIMEDOUT" || error.code === "ECONNECTIONTIMEOUT") {
      throw new Error(
        `SMTP connection timeout. Check your SMTP host and port settings, and ensure Render allows outbound connections on port ${process.env.SMTP_PORT || "587"}.`
      );
    } else if (error.code === "EAUTH") {
      throw new Error(
        "SMTP authentication failed. Please verify your SMTP_USER and SMTP_PASS credentials."
      );
    } else if (error.code === "ECONNREFUSED") {
      throw new Error(
        `SMTP connection refused. Check if the SMTP host (${process.env.SMTP_HOST || "smtp.gmail.com"}) and port (${process.env.SMTP_PORT || "587"}) are correct.`
      );
    }

    throw error;
  }
};

