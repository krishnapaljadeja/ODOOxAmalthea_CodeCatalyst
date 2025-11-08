/*
  Warnings:

  - You are about to drop the column `bonus` on the `SalaryStructure` table. All the data in the column will be lost.

*/
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
