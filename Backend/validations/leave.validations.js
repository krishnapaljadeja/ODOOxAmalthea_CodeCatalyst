import { z } from 'zod'

export const createLeaveSchema = z.object({
  body: z.object({
    type: z.enum(['sick', 'vacation', 'personal', 'unpaid']),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    days: z.number().int().positive('Days must be positive'),
    reason: z.string().min(1, 'Reason is required'),
  }),
})

export const getLeavesSchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
    employeeId: z.string().optional(),
  }),
})

export const rejectLeaveSchema = z.object({
  body: z.object({
    rejectionReason: z.string().optional(),
  }),
})

