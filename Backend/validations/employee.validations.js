import { z } from "zod";

export const createEmployeeSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    phone: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((val) => (val === "" || !val ? undefined : val)),
    department: z.string().min(1, "Department is required"),
    position: z.string().min(1, "Position is required"),
    salary: z
      .union([z.number(), z.string()])
      .transform((val) => {
        const num = typeof val === "string" ? parseFloat(val) : val;
        if (isNaN(num)) throw new Error("Salary must be a valid number");
        return num;
      })
      .pipe(z.number().min(0, "Salary must be positive")),
    hireDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    // Company name is automatically inherited from the admin/hr creating the employee
  }),
});

export const getEmployeesSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    department: z.string().optional(),
    status: z.enum(["active", "inactive", "terminated"]).optional(),
  }),
});
