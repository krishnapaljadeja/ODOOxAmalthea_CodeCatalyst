/**
 * Type definitions for WorkZen HRMS
 * These are JSDoc type definitions for better IDE support
 */

/**
 * @typedef {Object} User
 * @property {string} id - User ID
 * @property {string} email - User email
 * @property {string} firstName - First name
 * @property {string} lastName - Last name
 * @property {string} role - User role (admin, hr, manager, employee)
 * @property {string} [avatar] - Avatar URL
 * @property {string} [phone] - Phone number
 * @property {string} [department] - Department name
 * @property {string} [position] - Job position
 * @property {Date|string} createdAt - Creation date
 * @property {Date|string} updatedAt - Update date
 */

/**
 * @typedef {Object} Employee
 * @property {string} id - Employee ID
 * @property {string} employeeId - Employee number
 * @property {string} email - Email address
 * @property {string} firstName - First name
 * @property {string} lastName - Last name
 * @property {string} [avatar] - Avatar URL
 * @property {string} [phone] - Phone number
 * @property {string} department - Department name
 * @property {string} position - Job position
 * @property {string} status - Employment status (active, inactive, terminated)
 * @property {Date|string} hireDate - Hire date
 * @property {number} salary - Base salary
 * @property {Date|string} createdAt - Creation date
 * @property {Date|string} updatedAt - Update date
 */

/**
 * @typedef {Object} Attendance
 * @property {string} id - Attendance ID
 * @property {string} employeeId - Employee ID
 * @property {string} employeeName - Employee name
 * @property {Date|string} date - Attendance date
 * @property {Date|string} [checkIn] - Check-in time
 * @property {Date|string} [checkOut] - Check-out time
 * @property {number} [hoursWorked] - Hours worked
 * @property {string} status - Status (present, absent, late, half-day)
 * @property {string} [notes] - Additional notes
 * @property {Date|string} createdAt - Creation date
 */

/**
 * @typedef {Object} Leave
 * @property {string} id - Leave ID
 * @property {string} employeeId - Employee ID
 * @property {string} employeeName - Employee name
 * @property {string} type - Leave type (sick, vacation, personal, unpaid)
 * @property {Date|string} startDate - Start date
 * @property {Date|string} endDate - End date
 * @property {number} days - Number of days
 * @property {string} reason - Leave reason
 * @property {string} status - Status (pending, approved, rejected, cancelled)
 * @property {string} [approvedBy] - Approver ID
 * @property {Date|string} [approvedAt] - Approval date
 * @property {string} [rejectionReason] - Rejection reason
 * @property {Date|string} createdAt - Creation date
 * @property {Date|string} updatedAt - Update date
 */

/**
 * @typedef {Object} Payrun
 * @property {string} id - Payrun ID
 * @property {string} name - Payrun name
 * @property {Date|string} payPeriodStart - Pay period start date
 * @property {Date|string} payPeriodEnd - Pay period end date
 * @property {Date|string} payDate - Pay date
 * @property {string} status - Status (draft, processing, completed, failed)
 * @property {number} totalEmployees - Total employees in payrun
 * @property {number} totalAmount - Total amount
 * @property {Date|string} createdAt - Creation date
 * @property {Date|string} updatedAt - Update date
 */

/**
 * @typedef {Object} Payslip
 * @property {string} id - Payslip ID
 * @property {string} employeeId - Employee ID
 * @property {string} employeeName - Employee name
 * @property {string} payrunId - Payrun ID
 * @property {Date|string} payPeriodStart - Pay period start date
 * @property {Date|string} payPeriodEnd - Pay period end date
 * @property {Date|string} payDate - Pay date
 * @property {Object} earnings - Earnings breakdown
 * @property {number} earnings.baseSalary - Base salary
 * @property {number} [earnings.overtime] - Overtime pay
 * @property {number} [earnings.bonus] - Bonus
 * @property {number} [earnings.allowances] - Allowances
 * @property {Object} deductions - Deductions breakdown
 * @property {number} [deductions.tax] - Tax deduction
 * @property {number} [deductions.insurance] - Insurance deduction
 * @property {number} [deductions.other] - Other deductions
 * @property {number} grossPay - Gross pay
 * @property {number} totalDeductions - Total deductions
 * @property {number} netPay - Net pay
 * @property {Date|string} createdAt - Creation date
 */

/**
 * @typedef {Object} DashboardStats
 * @property {number} totalEmployees - Total employees
 * @property {number} presentToday - Employees present today
 * @property {number} pendingLeaves - Pending leave requests
 * @property {number} lastPayrunAmount - Last payrun amount
 * @property {Date|string} [lastPayrunDate] - Last payrun date
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Success flag
 * @property {*} data - Response data
 * @property {string} [message] - Response message
 * @property {*} [error] - Error details
 */

