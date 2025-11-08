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
    // Employees can view all employees in their company (view-only access)
    // Admin and HR can view and manage all employees in their company
    // Also filter by company
    if (user.companyId) {
      where.companyId = user.companyId;
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
    const validRoles = ["admin", "hr", "payroll", "employee"];
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
      console.error("Failed to send account creation email:", emailError);
    }

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

    if (user.companyId && employee.companyId !== user.companyId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only view salary information for employees in your company',
        error: 'Forbidden',
      });
    }

    const { getSalaryData } = await import('../utils/salary.utils.js');
    const salaryData = await getSalaryData(employee.id, employee.salary);

    res.json({
      status: 'success',
      data: salaryData,
    });
  } catch (error) {
    next(error);
  }
};

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
      effectiveFrom,
    } = req.body;
    const user = req.user;

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        companyId: true,
        salary: true,
      },
    });

    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found',
        error: 'Not Found',
      });
    }

    if (user.companyId && employee.companyId !== user.companyId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only update salary information for employees in your company',
        error: 'Forbidden',
      });
    }

    const grossSalary =
      (basicSalary || 0) +
      (houseRentAllowance || 0) +
      (standardAllowance || 0) +
      (performanceBonus || 0) +
      (travelAllowance || 0) +
      (fixedAllowance || 0);

    const totalDeductions = (pfEmployee || 0) + (professionalTax || 0);
    const netSalary = grossSalary - totalDeductions;

    const activeStructure = await prisma.salaryStructure.findFirst({
      where: {
        employeeId,
        effectiveTo: null,
      },
    });

    const currentDate = new Date();
    const effectiveFromDate = effectiveFrom ? new Date(effectiveFrom) : currentDate;

    if (activeStructure) {
      await prisma.salaryStructure.update({
        where: { id: activeStructure.id },
        data: { effectiveTo: effectiveFromDate },
      });
    }

    const salaryStructure = await prisma.salaryStructure.create({
      data: {
        employeeId,
        name: activeStructure ? 'Revised Structure' : 'Default Structure',
        description: null,
        effectiveFrom: effectiveFromDate,
        effectiveTo: null,
        monthWage: monthWage !== undefined ? monthWage : null,
        yearlyWage: yearlyWage !== undefined ? yearlyWage : null,
        workingDaysPerWeek: workingDaysPerWeek !== undefined ? workingDaysPerWeek : null,
        breakTime: breakTime !== undefined ? breakTime : null,
        basicSalary: basicSalary || 0,
        basicSalaryPercent: basicSalaryPercent !== undefined ? basicSalaryPercent : null,
        houseRentAllowance: houseRentAllowance || 0,
        hraPercent: hraPercent !== undefined ? hraPercent : null,
        standardAllowance: standardAllowance || 0,
        standardAllowancePercent: standardAllowancePercent !== undefined ? standardAllowancePercent : null,
        performanceBonus: performanceBonus || 0,
        performanceBonusPercent: performanceBonusPercent !== undefined ? performanceBonusPercent : null,
        travelAllowance: travelAllowance || 0,
        ltaPercent: ltaPercent !== undefined ? ltaPercent : null,
        fixedAllowance: fixedAllowance || 0,
        fixedAllowancePercent: fixedAllowancePercent !== undefined ? fixedAllowancePercent : null,
        pfEmployee: pfEmployee || 0,
        pfEmployeePercent: pfEmployeePercent !== undefined ? pfEmployeePercent : null,
        pfEmployer: pfEmployer || 0,
        pfEmployerPercent: pfEmployerPercent !== undefined ? pfEmployerPercent : null,
        professionalTax: professionalTax || 0,
        tds: 0,
        otherDeductions: 0,
        grossSalary,
        totalDeductions,
        netSalary,
      },
    });

    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        salary: grossSalary,
      },
    });

    res.json({
      status: 'success',
      message: activeStructure
        ? 'Salary structure updated successfully'
        : 'Salary structure created successfully',
      data: {
        monthWage: salaryStructure.monthWage,
        yearlyWage: salaryStructure.yearlyWage,
        workingDaysPerWeek: salaryStructure.workingDaysPerWeek,
        breakTime: salaryStructure.breakTime,
        basicSalary: salaryStructure.basicSalary,
        basicSalaryPercent: salaryStructure.basicSalaryPercent,
        houseRentAllowance: salaryStructure.houseRentAllowance,
        hraPercent: salaryStructure.hraPercent,
        standardAllowance: salaryStructure.standardAllowance,
        standardAllowancePercent: salaryStructure.standardAllowancePercent,
        performanceBonus: salaryStructure.performanceBonus,
        performanceBonusPercent: salaryStructure.performanceBonusPercent,
        travelAllowance: salaryStructure.travelAllowance,
        ltaPercent: salaryStructure.ltaPercent,
        fixedAllowance: salaryStructure.fixedAllowance,
        fixedAllowancePercent: salaryStructure.fixedAllowancePercent,
        grossSalary: salaryStructure.grossSalary,
        pfEmployee: salaryStructure.pfEmployee,
        pfEmployeePercent: salaryStructure.pfEmployeePercent,
        pfEmployer: salaryStructure.pfEmployer,
        pfEmployerPercent: salaryStructure.pfEmployerPercent,
        professionalTax: salaryStructure.professionalTax,
        netSalary: salaryStructure.netSalary,
      },
    });
  } catch (error) {
    next(error);
  }
};