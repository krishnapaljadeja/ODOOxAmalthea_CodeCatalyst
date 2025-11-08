/*
  Warnings:

  - You are about to drop the column `bonus` on the `SalaryStructure` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "basicSalary" DOUBLE PRECISION,
ADD COLUMN     "basicSalaryPercent" DOUBLE PRECISION,
ADD COLUMN     "breakTime" DOUBLE PRECISION,
ADD COLUMN     "fixedAllowance" DOUBLE PRECISION,
ADD COLUMN     "fixedAllowancePercent" DOUBLE PRECISION,
ADD COLUMN     "houseRentAllowance" DOUBLE PRECISION,
ADD COLUMN     "hraPercent" DOUBLE PRECISION,
ADD COLUMN     "ltaPercent" DOUBLE PRECISION,
ADD COLUMN     "monthWage" DOUBLE PRECISION,
ADD COLUMN     "performanceBonus" DOUBLE PRECISION,
ADD COLUMN     "performanceBonusPercent" DOUBLE PRECISION,
ADD COLUMN     "pfEmployee" DOUBLE PRECISION,
ADD COLUMN     "pfEmployeePercent" DOUBLE PRECISION,
ADD COLUMN     "pfEmployer" DOUBLE PRECISION,
ADD COLUMN     "pfEmployerPercent" DOUBLE PRECISION,
ADD COLUMN     "professionalTax" DOUBLE PRECISION,
ADD COLUMN     "standardAllowance" DOUBLE PRECISION,
ADD COLUMN     "standardAllowancePercent" DOUBLE PRECISION,
ADD COLUMN     "travelAllowance" DOUBLE PRECISION,
ADD COLUMN     "workingDaysPerWeek" INTEGER,
ADD COLUMN     "yearlyWage" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "SalaryStructure" DROP COLUMN "bonus",
ADD COLUMN     "basicSalaryPercent" DOUBLE PRECISION,
ADD COLUMN     "breakTime" DOUBLE PRECISION,
ADD COLUMN     "fixedAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "fixedAllowancePercent" DOUBLE PRECISION,
ADD COLUMN     "hraPercent" DOUBLE PRECISION,
ADD COLUMN     "ltaPercent" DOUBLE PRECISION,
ADD COLUMN     "monthWage" DOUBLE PRECISION,
ADD COLUMN     "performanceBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "performanceBonusPercent" DOUBLE PRECISION,
ADD COLUMN     "pfEmployeePercent" DOUBLE PRECISION,
ADD COLUMN     "pfEmployer" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "pfEmployerPercent" DOUBLE PRECISION,
ADD COLUMN     "standardAllowancePercent" DOUBLE PRECISION,
ADD COLUMN     "workingDaysPerWeek" INTEGER,
ADD COLUMN     "yearlyWage" DOUBLE PRECISION;
