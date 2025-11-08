import { PrismaClient } from "@prisma/client";
import {
  generateEmployeeId,
  generateCompanyCode,
} from "../utils/employee.utils.js";
import { hashPassword } from "../utils/password.utils.js";
import {
  generateRandomPassword,
  generatePasswordResetToken,
  sendAccountCreationEmail,
} from "../utils/email.utils.js";

const prisma = new PrismaClient();

/**
 * Get list of employees
 */
export const getEmployees = async (req, res, next) => {
  try {
    const { search, department, status } = req.query;
    const user = req.user;

    // Build where clause
    const where = {};

    // Role-based filtering
    if (user.role === "employee") {
      // Employees can only see themselves
      where.userId = user.id;
    } else if (user.role === "manager") {
      // Managers can see employees in their department
      if (user.department) {
        where.department = user.department;
      }
      // Also filter by company
      if (user.companyId) {
        where.companyId = user.companyId;
      }
    } else if (user.role === "admin" || user.role === "hr") {
      // Admin and HR can only see employees from their company
      if (user.companyId) {
        where.companyId = user.companyId;
      }
    }

    if (status) {
      where.status = status;
    }

    if (department) {
      where.department = department;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { employeeId: { contains: search, mode: "insensitive" } },
      ];
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
        createdAt: "desc",
      },
    });

    // Format response
    const formattedEmployees = employees.map((emp) => ({
      id: emp.id,
      employeeId: emp.employeeId,
      email: emp.email,
      firstName: emp.firstName,
      lastName: emp.lastName,
      avatar: emp.avatar || emp.user?.avatar,
      phone: emp.phone,
      department: emp.department,
      position: emp.position,
      status: emp.status,
      hireDate: emp.hireDate.toISOString(),
      salary: emp.salary,
      userId: emp.userId,
      user: emp.user ? {
        id: emp.user.id,
        email: emp.user.email,
        avatar: emp.user.avatar,
      } : null,
      createdAt: emp.createdAt.toISOString(),
      updatedAt: emp.updatedAt.toISOString(),
    }));

    res.json({
      status: "success",
      data: formattedEmployees,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new employee
 * Employee automatically inherits the company from the admin/hr creating them
 */
export const createEmployee = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      department,
      position,
      salary,
      hireDate,
      role, // Role selection for the new employee
    } = req.body;

    const currentUser = req.user; // Admin/HR creating the employee

    // Get company from the logged-in user (admin/hr)
    if (!currentUser.companyId) {
      return res.status(400).json({
        status: "error",
        message:
          "User must be associated with a company to create employees. Please contact your administrator.",
        error: "Validation Error",
      });
    }

    // Get company
    const company = await prisma.company.findUnique({
      where: { id: currentUser.companyId },
    });

    if (!company) {
      return res.status(400).json({
        status: "error",
        message: "Company not found",
        error: "Validation Error",
      });
    }

    // Check if email already exists in the same company
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        companyId: company.id,
      },
    });

    if (existingUser) {
      return res.status(400).json({
        status: "error",
        message: "User with this email already exists in this company",
        error: "Validation Error",
      });
    }

    // Check if phone already exists in the same company (if provided)
    if (phone) {
      const existingPhone = await prisma.user.findFirst({
        where: {
          phone,
          companyId: company.id,
        },
      });

      if (existingPhone) {
        return res.status(400).json({
          status: "error",
          message: "User with this phone number already exists in this company",
          error: "Validation Error",
        });
      }
    }

    const companyCode = company.code;

    const employeeId = await generateEmployeeId(
      companyCode,
      firstName,
      lastName,
      hireDate,
      company.id
    );

    // Generate random password for new employee
    const randomPassword = generateRandomPassword(12);
    const hashedPassword = await hashPassword(randomPassword);

    // Validate role (default to 'employee' if not provided or invalid)
    const validRoles = ["admin", "hr", "manager", "employee"];
    const employeeRole =
      role && validRoles.includes(role.toLowerCase())
        ? role.toLowerCase()
        : "employee";

    // Generate password reset token for initial password change
    const resetToken = generatePasswordResetToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: employeeRole,
        phone,
        department,
        position,
        employeeId,
        companyId: company.id,
      },
    });

    // Create password reset token
    await prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        email: user.email,
        expiresAt,
      },
    });

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
        status: "active",
        hireDate: new Date(hireDate),
        salary: parseFloat(salary),
        companyId: company.id,
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
    });

    // Send account creation email with credentials
    try {
      await sendAccountCreationEmail(
        email,
        employeeId,
        randomPassword,
        firstName,
        resetToken
      );
    } catch (emailError) {
      // Log email error but don't fail the request
      console.error("Failed to send account creation email:", emailError);
      // Employee is already created, so we continue
    }

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
    };

    res.status(201).json({
      status: "success",
      data: formattedEmployee,
      message:
        "Employee created successfully. Credentials have been sent to their email.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Import employees from CSV/Excel
 */
export const importEmployees = async (req, res, next) => {
  try {
    // This would require a file parsing library like multer and xlsx
    // For now, return a placeholder
    res.status(501).json({
      status: "error",
      message: "Import functionality not yet implemented",
      error: "Not Implemented",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export employees to CSV
 */
export const exportEmployees = async (req, res, next) => {
  try {
    const user = req.user;
    
    // Build where clause to filter by company
    const where = {};
    if (user.companyId) {
      where.companyId = user.companyId;
    }
    
    const employees = await prisma.employee.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            phone: true,
          },
        },
      },
    });

    // Convert to CSV
    const headers = [
      "Employee ID",
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Department",
      "Position",
      "Status",
      "Hire Date",
      "Salary",
    ];
    const rows = employees.map((emp) => [
      emp.employeeId,
      emp.firstName,
      emp.lastName,
      emp.email,
      emp.phone || "",
      emp.department,
      emp.position,
      emp.status,
      emp.hireDate.toISOString().split("T")[0],
      emp.salary,
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
      "\n"
    );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=employees-${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

/**
 * Get employee salary information
 */
export const getEmployeeSalary = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const user = req.user;

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        employeeId: true,
        salary: true,
        firstName: true,
        lastName: true,
        email: true,
        companyId: true,
      },
    });

    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found',
        error: 'Not Found',
      });
    }

    // Verify employee belongs to the same company as the requesting user
    if (user.companyId && employee.companyId !== user.companyId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only view salary information for employees in your company',
        error: 'Forbidden',
      });
    }

    // Get employee with all salary fields
    const employeeWithSalary = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        employeeId: true,
        salary: true,
        firstName: true,
        lastName: true,
        email: true,
        companyId: true,
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
    });

    if (!employeeWithSalary) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found',
        error: 'Not Found',
      });
    }

    // Verify employee belongs to the same company as the requesting user
    if (user.companyId && employeeWithSalary.companyId !== user.companyId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only view salary information for employees in your company',
        error: 'Forbidden',
      });
    }

    // Use stored values or calculate defaults
    const monthWage = employeeWithSalary.monthWage || employeeWithSalary.salary || 0;
    const yearlyWage = employeeWithSalary.yearlyWage || (monthWage * 12);
    const basicSalary = employeeWithSalary.basicSalary || (monthWage * 0.5);
    const basicSalaryPercent = employeeWithSalary.basicSalaryPercent || 50.0;
    const hra = employeeWithSalary.houseRentAllowance || (basicSalary * 0.5);
    const hraPercent = employeeWithSalary.hraPercent || 50.0;
    const standardAllowance = employeeWithSalary.standardAllowance || (monthWage * 0.1667);
    const standardAllowancePercent = employeeWithSalary.standardAllowancePercent || 16.67;
    const performanceBonus = employeeWithSalary.performanceBonus || (basicSalary * 0.0833);
    const performanceBonusPercent = employeeWithSalary.performanceBonusPercent || 8.33;
    const travelAllowance = employeeWithSalary.travelAllowance || (basicSalary * 0.0833);
    const ltaPercent = employeeWithSalary.ltaPercent || 8.33;
    const fixedAllowance = employeeWithSalary.fixedAllowance || (monthWage * 0.1167);
    const fixedAllowancePercent = employeeWithSalary.fixedAllowancePercent || 11.67;
    
    const grossSalary = basicSalary + hra + standardAllowance + performanceBonus + travelAllowance + fixedAllowance;
    
    const pfEmployee = employeeWithSalary.pfEmployee || (basicSalary * 0.12);
    const pfEmployeePercent = employeeWithSalary.pfEmployeePercent || 12.0;
    const pfEmployer = employeeWithSalary.pfEmployer || (basicSalary * 0.12);
    const pfEmployerPercent = employeeWithSalary.pfEmployerPercent || 12.0;
    const professionalTax = employeeWithSalary.professionalTax || 200;
    
    const netSalary = grossSalary - pfEmployee - professionalTax;

    res.json({
      status: 'success',
      data: {
        monthWage,
        yearlyWage,
        workingDaysPerWeek: employeeWithSalary.workingDaysPerWeek,
        breakTime: employeeWithSalary.breakTime,
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
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update employee salary information
 */
export const updateEmployeeSalary = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const {
      monthWage,
      yearlyWage,
      workingDaysPerWeek,
      breakTime,
      basicSalary,
      basicSalaryPercent,
      houseRentAllowance,
      hraPercent,
      standardAllowance,
      standardAllowancePercent,
      performanceBonus,
      performanceBonusPercent,
      travelAllowance,
      ltaPercent,
      fixedAllowance,
      fixedAllowancePercent,
      pfEmployee,
      pfEmployeePercent,
      pfEmployer,
      pfEmployerPercent,
      professionalTax,
    } = req.body;
    const user = req.user;

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        companyId: true,
      },
    });

    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found',
        error: 'Not Found',
      });
    }

    // Verify employee belongs to the same company as the requesting user
    if (user.companyId && employee.companyId !== user.companyId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only update salary information for employees in your company',
        error: 'Forbidden',
      });
    }

    // Calculate gross salary and net salary
    const grossSalary =
      (basicSalary || 0) +
      (houseRentAllowance || 0) +
      (standardAllowance || 0) +
      (performanceBonus || 0) +
      (travelAllowance || 0) +
      (fixedAllowance || 0);

    const netSalary =
      grossSalary - (pfEmployee || 0) - (professionalTax || 0);

    // Update employee salary structure
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        salary: grossSalary,
        monthWage: monthWage !== undefined ? monthWage : null,
        yearlyWage: yearlyWage !== undefined ? yearlyWage : null,
        workingDaysPerWeek: workingDaysPerWeek !== undefined ? workingDaysPerWeek : null,
        breakTime: breakTime !== undefined ? breakTime : null,
        basicSalary: basicSalary !== undefined ? basicSalary : null,
        basicSalaryPercent: basicSalaryPercent !== undefined ? basicSalaryPercent : null,
        houseRentAllowance: houseRentAllowance !== undefined ? houseRentAllowance : null,
        hraPercent: hraPercent !== undefined ? hraPercent : null,
        standardAllowance: standardAllowance !== undefined ? standardAllowance : null,
        standardAllowancePercent: standardAllowancePercent !== undefined ? standardAllowancePercent : null,
        performanceBonus: performanceBonus !== undefined ? performanceBonus : null,
        performanceBonusPercent: performanceBonusPercent !== undefined ? performanceBonusPercent : null,
        travelAllowance: travelAllowance !== undefined ? travelAllowance : null,
        ltaPercent: ltaPercent !== undefined ? ltaPercent : null,
        fixedAllowance: fixedAllowance !== undefined ? fixedAllowance : null,
        fixedAllowancePercent: fixedAllowancePercent !== undefined ? fixedAllowancePercent : null,
        pfEmployee: pfEmployee !== undefined ? pfEmployee : null,
        pfEmployeePercent: pfEmployeePercent !== undefined ? pfEmployeePercent : null,
        pfEmployer: pfEmployer !== undefined ? pfEmployer : null,
        pfEmployerPercent: pfEmployerPercent !== undefined ? pfEmployerPercent : null,
        professionalTax: professionalTax !== undefined ? professionalTax : null,
      },
    });

    res.json({
      status: 'success',
      data: {
        monthWage,
        yearlyWage,
        workingDaysPerWeek,
        breakTime,
        basicSalary,
        basicSalaryPercent,
        houseRentAllowance,
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
    });
  } catch (error) {
    next(error);
  }
};