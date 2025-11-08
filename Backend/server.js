import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'
import employeeRoutes from './routes/employee.routes.js'
import attendanceRoutes from './routes/attendance.routes.js'
import leaveRoutes from './routes/leave.routes.js'
import payrollRoutes from './routes/payroll.routes.js'
import payslipRoutes from './routes/payslip.routes.js'
import salaryStructureRoutes from './routes/salaryStructure.routes.js'
import settingsRoutes from './routes/settings.routes.js'
import profileRoutes from './routes/profile.routes.js'
import passwordResetRoutes from './routes/passwordReset.routes.js'

import adminRoutes from './routes/admin.routes.js'
import { errorHandler } from './middleware/error.middleware.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(helmet())
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/employees', employeeRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/leaves', leaveRoutes)
app.use('/api/payroll', payrollRoutes)
app.use('/api/payslips', payslipRoutes)
app.use('/api/salary-structures', salaryStructureRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/password-reset', passwordResetRoutes)

// Error handling
app.use(errorHandler)

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📡 API available at http://localhost:${PORT}/api`)
})

