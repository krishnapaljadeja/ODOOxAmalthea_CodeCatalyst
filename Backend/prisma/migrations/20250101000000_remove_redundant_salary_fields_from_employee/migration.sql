-- AlterTable
-- Remove redundant salary structure fields from Employee table
-- These fields are now only in SalaryStructure table
ALTER TABLE "Employee" DROP COLUMN IF EXISTS "monthWage",
DROP COLUMN IF EXISTS "yearlyWage",
DROP COLUMN IF EXISTS "workingDaysPerWeek",
DROP COLUMN IF EXISTS "breakTime",
DROP COLUMN IF EXISTS "basicSalary",
DROP COLUMN IF EXISTS "basicSalaryPercent",
DROP COLUMN IF EXISTS "houseRentAllowance",
DROP COLUMN IF EXISTS "hraPercent",
DROP COLUMN IF EXISTS "standardAllowance",
DROP COLUMN IF EXISTS "standardAllowancePercent",
DROP COLUMN IF EXISTS "performanceBonus",
DROP COLUMN IF EXISTS "performanceBonusPercent",
DROP COLUMN IF EXISTS "travelAllowance",
DROP COLUMN IF EXISTS "ltaPercent",
DROP COLUMN IF EXISTS "fixedAllowance",
DROP COLUMN IF EXISTS "fixedAllowancePercent",
DROP COLUMN IF EXISTS "pfEmployee",
DROP COLUMN IF EXISTS "pfEmployeePercent",
DROP COLUMN IF EXISTS "pfEmployer",
DROP COLUMN IF EXISTS "pfEmployerPercent",
DROP COLUMN IF EXISTS "professionalTax";

