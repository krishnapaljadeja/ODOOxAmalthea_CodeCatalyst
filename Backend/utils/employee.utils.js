import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Generate unique company code from company name (first 2 letters, uppercase)
 * If code already exists, appends a number to make it unique
 */
export const generateCompanyCode = async (companyName) => {
  if (!companyName || companyName.length < 2) {
    throw new Error("Company name must be at least 2 characters long");
  }

  let baseCode = companyName.substring(0, 2).toUpperCase();
  let code = baseCode;
  let counter = 1;

  // Check if code already exists
  let existingCompany = await prisma.company.findUnique({
    where: { code },
  });

  // If code exists and it's for a different company, append number
  while (existingCompany && existingCompany.name !== companyName) {
    code = `${baseCode}${counter}`;
    existingCompany = await prisma.company.findUnique({
      where: { code },
    });
    counter++;

    // Safety check
    if (counter > 999) {
      throw new Error("Unable to generate unique company code");
    }
  }

  return code;
};

/**
 * Generate unique employee ID in format: [Company Code][First 2 of First Name][First 2 of Last Name][Year][Serial Number]
 * Example: OIJODO20220001
 *   - OI = Company code (Odoo India)
 *   - JODO = First 2 letters of first name (JO) + first 2 letters of last name (DO)
 *   - 2022 = Year of joining
 *   - 0001 = Serial number for that year (increments for ALL employees in the company for that year)
 *
 * Note: Serial number increments based on year only, not name initials.
 * So if two employees join in 2025, they get 20250001 and 20250002 regardless of their names.
 */
export const generateEmployeeId = async (
  companyCode,
  firstName,
  lastName,
  hireDate,
  companyId
) => {
  if (!companyCode || companyCode.length < 2) {
    throw new Error("Company code must be at least 2 characters");
  }
  if (!firstName || firstName.length < 2) {
    throw new Error("First name must be at least 2 characters long");
  }
  if (!lastName || lastName.length < 2) {
    throw new Error("Last name must be at least 2 characters long");
  }

  // Get first 2 letters of first name and last name (uppercase)
  const firstNameCode = firstName.substring(0, 2).toUpperCase();
  const lastNameCode = lastName.substring(0, 2).toUpperCase();

  // Get year from hire date
  const year = new Date(hireDate).getFullYear();
  const yearStr = String(year);

  // Find the highest serial number for this company and year (not based on name initials)
  // Get all employees in this company for this year
  const employeesInYear = await prisma.employee.findMany({
    where: {
      companyId: companyId,
      hireDate: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
    select: {
      employeeId: true,
    },
  });

  let serialNumber = 1;
  if (employeesInYear.length > 0) {
    // Extract serial numbers from all employee IDs for this year
    // Format: [CompanyCode][FirstNameCode][LastNameCode][Year][Serial]
    // Serial is always the last 4 digits of the ID
    const serialNumbers = employeesInYear
      .map((emp) => {
        const id = emp.employeeId;
        // Check if the ID contains the year
        if (id.includes(yearStr)) {
          // Extract the last 4 digits (serial number)
          const serialStr = id.slice(-4);
          const serial = parseInt(serialStr, 10);
          return isNaN(serial) ? 0 : serial;
        }
        return 0;
      })
      .filter((num) => num > 0);

    if (serialNumbers.length > 0) {
      // Get the maximum serial number and increment
      serialNumber = Math.max(...serialNumbers) + 1;
    }
  }

  // Build the employee ID
  const prefix = `${companyCode}${firstNameCode}${lastNameCode}${yearStr}`;
  const serialStr = String(serialNumber).padStart(4, "0");
  let employeeId = `${prefix}${serialStr}`;

  // Ensure uniqueness (in case of any edge cases)
  let attempts = 0;
  while (await prisma.employee.findUnique({ where: { employeeId } })) {
    serialNumber++;
    const serialStr = String(serialNumber).padStart(4, "0");
    employeeId = `${prefix}${serialStr}`;
    attempts++;
    if (attempts > 1000) {
      throw new Error(
        "Unable to generate unique employee ID after 1000 attempts"
      );
    }
  }

  return employeeId;
};
