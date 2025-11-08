import { z } from 'zod'

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First name is required').optional(),
    lastName: z.string().min(1, 'Last name is required').optional(),
    email: z.string().email('Invalid email address').optional(),
    phone: z.string().optional(),
    avatar: z.string().optional(),
    about: z.string().optional(),
    whatILoveAboutMyJob: z.string().optional(),
    interestsAndHobbies: z.string().optional(),
    skills: z.array(z.string()).optional(),
    certifications: z.array(z.string()).optional(),
    employeeData: z.object({
      dateOfBirth: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : val),
        z.string().nullable().optional()
      ),
      address: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : val),
        z.string().nullable().optional()
      ),
      nationality: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : val),
        z.string().nullable().optional()
      ),
      personalEmail: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : val),
        z.string().email('Invalid email address').nullable().optional().or(z.literal(''))
      ),
      gender: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : val),
        z.string().nullable().optional()
      ),
      maritalStatus: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : val),
        z.string().nullable().optional()
      ),
      accountNumber: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : val),
        z.string().nullable().optional()
      ),
      bankName: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : val),
        z.string().nullable().optional()
      ),
      ifscCode: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : val),
        z.string().nullable().optional()
      ),
      panNo: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : val),
        z.string().nullable().optional()
      ),
      uanNo: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : val),
        z.string().nullable().optional()
      ),
    }).optional(),
  }),
})

export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  }),
})

