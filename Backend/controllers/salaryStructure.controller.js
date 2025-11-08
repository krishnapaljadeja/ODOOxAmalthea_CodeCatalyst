// controllers/salaryStructure.controller.js

import { prisma } from "../lib/prisma.js";

export const upsertSalaryStructure = async (req, res) => {
    const { employeeId } = req.params;
    const { totalSalary } = req.body; 

    try {
        const basic = totalSalary * 0.5;
        const hra = totalSalary * 0.25;
        const standardAllowance = totalSalary * 0.1;
        const pfEmployee = basic * 0.12;
        const professionalTax = 200;
        const deductions = pfEmployee + professionalTax;
        const gross = totalSalary;
        const net = gross - deductions;

        
        const active = await prisma.salaryStructure.findFirst({
            where: { employeeId, effectiveTo: null },
        });

        
        if (active) {
            await prisma.salaryStructure.update({
                where: { id: active.id },
                data: { effectiveTo: new Date() },
            });
        }

        
        const structure = await prisma.salaryStructure.create({
            data: {
                employeeId,
                name: active ? "Revised Structure" : "Default Structure",
                effectiveFrom: new Date(),
                basicSalary: basic,
                houseRentAllowance: hra,
                standardAllowance,
                pfEmployee,
                professionalTax,
                grossSalary: gross,
                totalDeductions: deductions,
                netSalary: net,
            },
        });

        res.status(200).json({
            message: active
                ? "Salary structure updated"
                : "Salary structure created",
            structure,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to upsert salary structure" });
    }
};
