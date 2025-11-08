import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import {
  generateEmployeeId,
  generateCompanyCode,
} from "../utils/employee.utils.js";

const prisma = new PrismaClient();

async function createDefaultSalaryStructure(employeeId, totalSalary) {
  // Simple preset split for demo
  const basic = totalSalary * 0.5;
  const hra = totalSalary * 0.25;
  const standardAllowance = totalSalary * 0.1;
  const pfEmployee = basic * 0.12;
  const pfEmployer = basic * 0.12;
  const professionalTax = 200;
  const bonus = totalSalary * 0.05;
  const travelAllowance = totalSalary * 0.02;

  const grossSalary = totalSalary + bonus + travelAllowance;
  const totalDeductions = pfEmployee + professionalTax;
  const netSalary = grossSalary - totalDeductions;

  return prisma.salaryStructure.create({
    data: {
      employeeId,
      name: "Default Salary Structure",
      effectiveFrom: new Date(),
      basicSalary: basic,
      houseRentAllowance: hra,
      standardAllowance,
      bonus,
      travelAllowance,
      pfEmployee,
      pfEmployer,
      professionalTax,
      grossSalary,
      totalDeductions,
      netSalary,
    },
  });
}

async function main() {
  console.log("🌱 Seeding database...");

  const hashedPassword = await bcrypt.hash("password123", 10);

  // Create Company
  const companyName = "WorkZen";
  const companyCode = await generateCompanyCode(companyName);
  const company = await prisma.company.upsert({
    where: { name: companyName },
    update: {},
    create: {
      name: companyName,
      code: companyCode,
    },
  });

  console.log(`✅ Created company: ${companyName} (${companyCode})`);

  // Common creator helper
  async function createUserAndEmployee(role, firstName, lastName, email, hireDate, department, position, totalSalary) {
    const employeeId = await generateEmployeeId(
      companyCode,
      firstName,
      lastName,
      hireDate,
      company.id
    );

    // Create user
    const user = await prisma.user.upsert({
      where: { email },
      update: { companyId: company.id },
      create: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        phone: "+1234567890",
        department,
        position,
        employeeId,
        companyId: company.id,
      },
    });

    // Create employee
    const employee = await prisma.employee.upsert({
      where: { employeeId },
      update: {},
      create: {
        employeeId,
        userId: user.id,
        email,
        firstName,
        lastName,
        phone: "+1234567890",
        department,
        position,
        status: "active",
        hireDate,
        companyId: company.id,
      },
    });

    // Create default salary structure
    await createDefaultSalaryStructure(employee.id, totalSalary);

    return { user, employee };
  }

  // Function to create new salary structure (closing old one)
  async function createNewSalaryStructure(employeeId, totalSalary, structureName) {
    // Find and close current active structure
    const activeStructure = await prisma.salaryStructure.findFirst({
      where: {
        employeeId,
        effectiveTo: null,
      },
    });

    const effectiveFrom = new Date();
    effectiveFrom.setDate(effectiveFrom.getDate() - 30); // Start from 30 days ago

    if (activeStructure) {
      await prisma.salaryStructure.update({
        where: { id: activeStructure.id },
        data: { effectiveTo: effectiveFrom },
      });
    }

    // Calculate salary components
    const basic = totalSalary * 0.5;
    const hra = totalSalary * 0.25;
    const standardAllowance = totalSalary * 0.1;
    const pfEmployee = basic * 0.12;
    const pfEmployer = basic * 0.12;
    const professionalTax = 200;
    const bonus = totalSalary * 0.05;
    const travelAllowance = totalSalary * 0.02;
    const tds = totalSalary * 0.01; // 1% TDS
    const otherDeductions = 0;

    const grossSalary = basic + hra + standardAllowance + bonus + travelAllowance;
    const totalDeductions = pfEmployee + professionalTax + tds + otherDeductions;
    const netSalary = grossSalary - totalDeductions;

    return prisma.salaryStructure.create({
      data: {
        employeeId,
        name: structureName,
        description: `Active salary structure for testing payroll`,
        effectiveFrom,
        effectiveTo: null, // Active structure
        basicSalary: basic,
        houseRentAllowance: hra,
        standardAllowance,
        bonus,
        travelAllowance,
        pfEmployee,
        pfEmployer,
        professionalTax,
        tds,
        otherDeductions,
        grossSalary,
        totalDeductions,
        netSalary,
      },
    });
  }

  // Create Users and Employees
  const admin = await createUserAndEmployee(
    "admin",
    "John",
    "Doe",
    "admin@workzen.com",
    new Date("2023-01-01"),
    "IT",
    "Administrator",
    100000
  );

  const hr = await createUserAndEmployee(
    "hr",
    "Sarah",
    "Williams",
    "hr@workzen.com",
    new Date("2023-02-01"),
    "Human Resources",
    "HR Manager",
    90000
  );

  const manager = await createUserAndEmployee(
    "manager",
    "Michael",
    "Brown",
    "manager@workzen.com",
    new Date("2023-03-01"),
    "Engineering",
    "Engineering Manager",
    85000
  );

  const employee = await createUserAndEmployee(
    "employee",
    "Emily",
    "Davis",
    "employee@workzen.com",
    new Date("2023-04-01"),
    "Engineering",
    "Software Engineer",
    75000
  );

  // Create new salary structures for all employees (for testing)
  console.log("💰 Creating new salary structures for all employees...");
  await createNewSalaryStructure(admin.employee.id, 100000, "Updated Admin Structure");
  await createNewSalaryStructure(hr.employee.id, 90000, "Updated HR Structure");
  await createNewSalaryStructure(manager.employee.id, 85000, "Updated Manager Structure");
  await createNewSalaryStructure(employee.employee.id, 75000, "Updated Employee Structure");
  console.log("✅ Created new salary structures");

  // Payroll Settings
  await prisma.payrollSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      taxRate: 18.5,
      insuranceRate: 3.5,
      payPeriodDays: 30,
    },
  });

  // Create attendance entries for last 5 days with variations
  console.log("📅 Creating attendance entries for last 5 days...");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allEmployees = [admin, hr, manager, employee];
  const attendanceVariations = [
    { status: "present", checkInHour: 9, checkOutHour: 17, hours: 8 },
    { status: "present", checkInHour: 9, checkOutHour: 18, hours: 9 },
    { status: "late", checkInHour: 10, checkOutHour: 18, hours: 8 },
    { status: "absent", checkInHour: null, checkOutHour: null, hours: 0 },
    { status: "half_day", checkInHour: 9, checkOutHour: 13, hours: 4 },
  ];

  for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
    const attendanceDate = new Date(today);
    attendanceDate.setDate(attendanceDate.getDate() - dayOffset);
    attendanceDate.setHours(0, 0, 0, 0);

    // Skip weekends (Saturday = 6, Sunday = 0)
    const dayOfWeek = attendanceDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }

    for (const emp of allEmployees) {
      const variation = attendanceVariations[dayOffset % attendanceVariations.length];
      const status = variation.status;

      let checkIn = null;
      let checkOut = null;
      let hoursWorked = variation.hours;

      if (status !== "absent") {
        checkIn = new Date(attendanceDate);
        checkIn.setHours(variation.checkInHour, 0, 0, 0);
        checkOut = new Date(attendanceDate);
        checkOut.setHours(variation.checkOutHour, 0, 0, 0);
      }

      await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: emp.employee.id,
            date: attendanceDate,
          },
        },
        update: {
          checkIn,
          checkOut,
          hoursWorked,
          status,
        },
        create: {
          employeeId: emp.employee.id,
          userId: emp.user.id,
          date: attendanceDate,
          checkIn,
          checkOut,
          hoursWorked,
          status,
        },
      });
    }
  }

  console.log("✅ Created attendance entries for last 5 days");

  // Leave (future pending leave - kept for reference)
  const leaveStartDate = new Date(today);
  leaveStartDate.setDate(leaveStartDate.getDate() + 7);
  const leaveEndDate = new Date(leaveStartDate);
  leaveEndDate.setDate(leaveEndDate.getDate() + 2);

  const existingFutureLeave = await prisma.leave.findFirst({
    where: {
      employeeId: employee.employee.id,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
    },
  });

  if (!existingFutureLeave) {
    await prisma.leave.create({
      data: {
        employeeId: employee.employee.id,
        userId: employee.user.id,
        type: "vacation",
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        days: 3,
        reason: "Family trip",
        status: "pending",
      },
    });
  }

  // Create a current month payrun for testing (draft status)
  console.log("📊 Creating current month payrun for testing...");
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const payDate = new Date(today.getFullYear(), today.getMonth() + 1, 5);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const payrunName = `Payrun ${monthNames[today.getMonth()]} ${today.getFullYear()}`;

  // Check if payrun already exists for current month
  let currentPayrun = await prisma.payrun.findFirst({
    where: {
      payPeriodStart: currentMonthStart,
      payPeriodEnd: currentMonthEnd,
    },
  });

  if (!currentPayrun) {
    currentPayrun = await prisma.payrun.create({
      data: {
        name: payrunName,
        payPeriodStart: currentMonthStart,
        payPeriodEnd: currentMonthEnd,
        payDate: payDate,
        status: "draft", // Keep as draft for testing
        totalEmployees: 0,
        totalAmount: 0,
      },
    });
  } else {
    // Update existing payrun to draft if needed
    if (currentPayrun.status !== "draft") {
      currentPayrun = await prisma.payrun.update({
        where: { id: currentPayrun.id },
        data: { status: "draft", totalEmployees: 0, totalAmount: 0 },
      });
    }
  }

  console.log(`✅ Created/Updated payrun: ${currentPayrun.name} (Status: ${currentPayrun.status})`);
  console.log(`   Period: ${currentMonthStart.toISOString().split("T")[0]} to ${currentMonthEnd.toISOString().split("T")[0]}`);

  // Create some approved leaves for testing (within current month)
  console.log("🏖️  Creating approved leaves for testing...");
  const leaveDate1 = new Date(today);
  leaveDate1.setDate(leaveDate1.getDate() - 3);
  const leaveDate2 = new Date(leaveDate1);
  leaveDate2.setDate(leaveDate2.getDate() + 1);

  // Check if leave already exists for employee
  const existingEmployeeLeave = await prisma.leave.findFirst({
    where: {
      employeeId: employee.employee.id,
      startDate: leaveDate1,
      endDate: leaveDate2,
    },
  });

  if (!existingEmployeeLeave) {
    await prisma.leave.create({
      data: {
        employeeId: employee.employee.id,
        userId: employee.user.id,
        type: "vacation",
        startDate: leaveDate1,
        endDate: leaveDate2,
        days: 2,
        reason: "Personal leave",
        status: "approved",
        approvedById: admin.user.id,
        approvedAt: new Date(),
      },
    });
  }

  // Create approved leave for manager
  const managerLeaveDate = new Date(today);
  managerLeaveDate.setDate(managerLeaveDate.getDate() - 2);
  
  const existingManagerLeave = await prisma.leave.findFirst({
    where: {
      employeeId: manager.employee.id,
      startDate: managerLeaveDate,
      endDate: managerLeaveDate,
    },
  });

  if (!existingManagerLeave) {
    await prisma.leave.create({
      data: {
        employeeId: manager.employee.id,
        userId: manager.user.id,
        type: "sick",
        startDate: managerLeaveDate,
        endDate: managerLeaveDate,
        days: 1,
        reason: "Sick leave",
        status: "approved",
        approvedById: admin.user.id,
        approvedAt: new Date(),
      },
    });
  }

  console.log("✅ Created approved leaves for testing");

  console.log("\n✅ Database seeded successfully!");
  console.log("\n📋 Test Accounts:");
  console.log(
    `  Admin:    admin@workzen.com / password123 (ID: ${admin.employee.employeeId})`
  );
  console.log(
    `  HR:       hr@workzen.com / password123 (ID: ${hr.employee.employeeId})`
  );
  console.log(
    `  Manager:  manager@workzen.com / password123 (ID: ${manager.employee.employeeId})`
  );
  console.log(
    `  Employee: employee@workzen.com / password123 (ID: ${employee.employee.employeeId})`
  );
  console.log("\n📊 Seed Summary:");
  console.log(`  ✅ Created ${allEmployees.length} employees with new salary structures`);
  console.log(`  ✅ Created attendance entries for last 5 working days (variations: present, late, absent, half_day)`);
  console.log(`  ✅ Created approved leaves for testing payroll calculations`);
  console.log(`  ✅ Created current month payrun (${currentPayrun.name}) in draft status`);
  console.log("\n💡 You can login with either email or employee ID!");
  console.log("💡 The current month payrun is ready for processing and testing!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
