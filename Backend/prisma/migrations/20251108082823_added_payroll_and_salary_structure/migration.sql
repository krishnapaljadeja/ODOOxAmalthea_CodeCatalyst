/*
  Warnings:

  - You are about to drop the column `salary` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `allowances` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `baseSalary` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `bonus` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `grossPay` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `insurance` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `netPay` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `other` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `overtime` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `payDate` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `payPeriodEnd` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `payPeriodStart` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `payrunId` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `tax` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `totalDeductions` on the `Payslip` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[payrollId]` on the table `Payslip` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `payrollId` to the `Payslip` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('draft', 'computed', 'validated', 'cancelled');

-- DropForeignKey
ALTER TABLE "Payslip" DROP CONSTRAINT "Payslip_payrunId_fkey";

-- DropForeignKey
ALTER TABLE "Payslip" DROP CONSTRAINT "Payslip_userId_fkey";

-- DropIndex
DROP INDEX "Payslip_payDate_idx";

-- DropIndex
DROP INDEX "Payslip_payrunId_employeeId_key";

-- DropIndex
DROP INDEX "Payslip_payrunId_idx";

-- DropIndex
DROP INDEX "Payslip_userId_idx";

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "salary";

-- AlterTable
ALTER TABLE "Payslip" DROP COLUMN "allowances",
DROP COLUMN "baseSalary",
DROP COLUMN "bonus",
DROP COLUMN "grossPay",
DROP COLUMN "insurance",
DROP COLUMN "netPay",
DROP COLUMN "other",
DROP COLUMN "overtime",
DROP COLUMN "payDate",
DROP COLUMN "payPeriodEnd",
DROP COLUMN "payPeriodStart",
DROP COLUMN "payrunId",
DROP COLUMN "tax",
DROP COLUMN "totalDeductions",
ADD COLUMN     "payrollId" TEXT NOT NULL,
ADD COLUMN     "pdfUrl" TEXT,
ADD COLUMN     "status" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "SalaryStructure" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "basicSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "houseRentAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "standardAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "travelAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pfEmployee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pfEmployer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "professionalTax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "payrunId" TEXT NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'draft',
    "grossSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "computedAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalaryStructure_employeeId_idx" ON "SalaryStructure"("employeeId");

-- CreateIndex
CREATE INDEX "SalaryStructure_effectiveFrom_effectiveTo_idx" ON "SalaryStructure"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "Payroll_status_idx" ON "Payroll"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_employeeId_payrunId_key" ON "Payroll"("employeeId", "payrunId");

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_payrollId_key" ON "Payslip"("payrollId");

-- AddForeignKey
ALTER TABLE "SalaryStructure" ADD CONSTRAINT "SalaryStructure_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_payrunId_fkey" FOREIGN KEY ("payrunId") REFERENCES "Payrun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
