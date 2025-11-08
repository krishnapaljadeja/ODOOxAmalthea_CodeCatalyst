import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Get attendance records
 */
export const getAttendance = async (req, res, next) => {
  try {
    const { date, startDate, endDate, employeeId } = req.query
    const user = req.user;

    const where = {};

    // Role-based filtering
    if (user.role === 'employee') {
      where.userId = user.id
    } else if (employeeId) {
      // Filter by specific employee if provided
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { id: true },
      })
      if (employee) {
        where.employeeId = employee.id
      }
    } else if (user.role === 'admin' || user.role === 'hr' || user.role === 'payroll') {
      // Admin, HR, and Payroll can see all employees from their company
      if (user.companyId) {
        const employees = await prisma.employee.findMany({
          where: { companyId: user.companyId },
          select: { id: true },
        })
        where.employeeId = { in: employees.map((e) => e.id) }
      }
    }

    // Date filtering logic:
    if (date) {
      // To get "today's attendance", filter where date >= start of given day AND < start of next day (UTC)
      const dateStart = new Date(date + 'T00:00:00.000Z');
      const dateEnd = new Date(date + 'T00:00:00.000Z');
      dateEnd.setUTCDate(dateEnd.getUTCDate() + 1);
      where.checkIn = {
        gte: dateStart,
        lt: dateEnd,
      };
    } else {
      if (startDate) {
        const startDateObj = new Date(startDate + 'T00:00:00.000Z')
        where.date = { ...where.date, gte: startDateObj }
      }
      if (endDate) {
        const endDateObj = new Date(endDate + 'T23:59:59.999Z')
        where.date = { ...where.date, lte: endDateObj }
      }
    }

    console.log(where)

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    // Format response
    const formattedAttendances = attendances.map((att) => ({
      id: att.id,
      employeeId: att.employeeId,
      employeeName: `${att.employee.firstName} ${att.employee.lastName}`,
      employee: {
        id: att.employee.id,
        employeeId: att.employee.employeeId,
        firstName: att.employee.firstName,
        lastName: att.employee.lastName,
      },
      date: att.date.toISOString(),
      checkIn: att.checkIn?.toISOString() || null,
      checkOut: att.checkOut?.toISOString() || null,
      hoursWorked: att.hoursWorked,
      status: att.status,
      notes: att.notes,
      createdAt: att.createdAt.toISOString(),
    }))

    res.json({
      status: 'success',
      data: formattedAttendances,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get today's attendance
 */
export const getTodayAttendance = async (req, res, next) => {
  try {
    const user = req.user

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get employee
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
    })

    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee record not found',
        error: 'Not Found',
      })
    }

    const attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: today,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!attendance) {
      return res.status(404).json({
        status: 'error',
        message: 'No attendance record found for today',
        error: 'Not Found',
      })
    }

    res.json({
      status: 'success',
      data: {
        id: attendance.id,
        employeeId: attendance.employeeId,
        employeeName: `${attendance.employee.firstName} ${attendance.employee.lastName}`,
        date: attendance.date.toISOString(),
        checkIn: attendance.checkIn?.toISOString() || null,
        checkOut: attendance.checkOut?.toISOString() || null,
        hoursWorked: attendance.hoursWorked,
        status: attendance.status,
        notes: attendance.notes,
        createdAt: attendance.createdAt.toISOString(),
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Check in
 */
export const checkIn = async (req, res, next) => {
  try {
    const user = req.user

    // Get employee
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
    })

    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee record not found',
        error: 'Not Found',
      })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check if already checked in
    const existing = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: today,
        },
      },
    })

    if (existing && existing.checkIn) {
      return res.status(400).json({
        status: 'error',
        message: 'Already checked in today',
        error: 'Validation Error',
      })
    }

    const now = new Date()
    const checkInTime = new Date(now)
    checkInTime.setHours(9, 0, 0, 0) // Default check-in time is 9 AM

    // Determine status (late if after 9:30 AM)
    const lateThreshold = new Date(checkInTime)
    lateThreshold.setMinutes(30)
    const status = now > lateThreshold ? 'late' : 'present'

    // Create or update attendance
    const attendance = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: today,
        },
      },
      create: {
        employeeId: employee.id,
        userId: user.id,
        date: today,
        checkIn: now,
        status,
      },
      update: {
        checkIn: now,
        status,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    res.status(201).json({
      status: 'success',
      message: 'Checked in successfully',
      data: {
        id: attendance.id,
        employeeId: attendance.employeeId,
        employeeName: `${attendance.employee.firstName} ${attendance.employee.lastName}`,
        date: attendance.date.toISOString(),
        checkIn: attendance.checkIn?.toISOString() || null,
        checkOut: attendance.checkOut?.toISOString() || null,
        hoursWorked: attendance.hoursWorked,
        status: attendance.status,
        notes: attendance.notes,
        createdAt: attendance.createdAt.toISOString(),
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Check out
 */
export const checkOut = async (req, res, next) => {
  try {
    const user = req.user

    // Get employee
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
    })

    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee record not found',
        error: 'Not Found',
      })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get today's attendance
    const attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: today,
        },
      },
    })

    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({
        status: 'error',
        message: 'Must check in before checking out',
        error: 'Validation Error',
      })
    }

    if (attendance.checkOut) {
      return res.status(400).json({
        status: 'error',
        message: 'Already checked out today',
        error: 'Validation Error',
      })
    }

    const now = new Date()
    const checkInTime = attendance.checkIn
    const hoursWorked = (now - checkInTime) / (1000 * 60 * 60) // Convert to hours

    // Update attendance
    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut: now,
        hoursWorked,
        status: hoursWorked >= 4 ? 'present' : 'half_day',
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    res.json({
      status: 'success',
      message: 'Checked out successfully',
      data: {
        id: updated.id,
        employeeId: updated.employeeId,
        employeeName: `${updated.employee.firstName} ${updated.employee.lastName}`,
        date: updated.date.toISOString(),
        checkIn: updated.checkIn?.toISOString() || null,
        checkOut: updated.checkOut?.toISOString() || null,
        hoursWorked: updated.hoursWorked,
        status: updated.status,
        notes: updated.notes,
        createdAt: updated.createdAt.toISOString(),
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Admin: Check in employee by employeeId
 */
export const adminCheckIn = async (req, res, next) => {
  try {
    const user = req.user
    const { employeeId } = req.body

    // Only admin or hr can check in employees
    if (!['admin', 'hr'].includes(user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions',
        error: 'Forbidden',
      })
    }

    if (!employeeId) {
      return res.status(400).json({
        status: 'error',
        message: 'Employee ID is required',
        error: 'Validation Error',
      })
    }

    // Get employee
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    })

    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found',
        error: 'Not Found',
      })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check if already checked in
    const existing = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: today,
        },
      },
    })

    if (existing && existing.checkIn) {
      return res.status(400).json({
        status: 'error',
        message: 'Employee already checked in today',
        error: 'Validation Error',
      })
    }

    const now = new Date()
    const checkInTime = new Date(now)
    checkInTime.setHours(9, 0, 0, 0) // Default check-in time is 9 AM

    // Determine status (late if after 9:30 AM)
    const lateThreshold = new Date(checkInTime)
    lateThreshold.setMinutes(30)
    const status = now > lateThreshold ? 'late' : 'present'

    // Create or update attendance
    const attendance = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: today,
        },
      },
      create: {
        employeeId: employee.id,
        userId: employee.userId,
        date: today,
        checkIn: now,
        status,
      },
      update: {
        checkIn: now,
        status,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    res.status(201).json({
      status: 'success',
      message: 'Employee checked in successfully',
      data: {
        id: attendance.id,
        employeeId: attendance.employeeId,
        employeeName: `${attendance.employee.firstName} ${attendance.employee.lastName}`,
        date: attendance.date.toISOString(),
        checkIn: attendance.checkIn?.toISOString() || null,
        checkOut: attendance.checkOut?.toISOString() || null,
        hoursWorked: attendance.hoursWorked,
        status: attendance.status,
        notes: attendance.notes,
        createdAt: attendance.createdAt.toISOString(),
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Admin: Check out employee by employeeId
 */
export const adminCheckOut = async (req, res, next) => {
  try {
    const user = req.user
    const { employeeId } = req.body

    // Only admin or hr can check out employees
    if (!['admin', 'hr'].includes(user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions',
        error: 'Forbidden',
      })
    }

    if (!employeeId) {
      return res.status(400).json({
        status: 'error',
        message: 'Employee ID is required',
        error: 'Validation Error',
      })
    }

    // Get employee
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    })

    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found',
        error: 'Not Found',
      })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get today's attendance
    const attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: today,
        },
      },
    })

    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({
        status: 'error',
        message: 'Employee must check in before checking out',
        error: 'Validation Error',
      })
    }

    if (attendance.checkOut) {
      return res.status(400).json({
        status: 'error',
        message: 'Employee already checked out today',
        error: 'Validation Error',
      })
    }

    const now = new Date()
    const checkInTime = attendance.checkIn
    const hoursWorked = (now - checkInTime) / (1000 * 60 * 60) // Convert to hours

    // Update attendance
    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut: now,
        hoursWorked,
        status: hoursWorked >= 4 ? 'present' : 'half_day',
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    res.json({
      status: 'success',
      message: 'Employee checked out successfully',
      data: {
        id: updated.id,
        employeeId: updated.employeeId,
        employeeName: `${updated.employee.firstName} ${updated.employee.lastName}`,
        date: updated.date.toISOString(),
        checkIn: updated.checkIn?.toISOString() || null,
        checkOut: updated.checkOut?.toISOString() || null,
        hoursWorked: updated.hoursWorked,
        status: updated.status,
        notes: updated.notes,
        createdAt: updated.createdAt.toISOString(),
      },
    })
  } catch (error) {
    next(error)
  }
}

