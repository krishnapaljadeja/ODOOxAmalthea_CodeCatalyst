import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Get dashboard statistics
 */
export const getStats = async (req, res, next) => {
  try {
    const user = req.user

    // Get company employees if user has companyId (for admin/hr/payroll)
    let companyEmployeeIds = []
    let companyUserIds = []
    if (user.companyId && (user.role === 'admin' || user.role === 'hr' || user.role === 'payroll')) {
      const companyEmployees = await prisma.employee.findMany({
        where: { companyId: user.companyId },
        select: { id: true, userId: true },
      })
      companyEmployeeIds = companyEmployees.map(e => e.id)
      companyUserIds = companyEmployees.map(e => e.userId).filter(Boolean)
    }

    // Get total employees (admin/hr/payroll can see all in their company, others see only their own)
    const totalEmployees =
      user.role === 'admin' || user.role === 'hr' || user.role === 'payroll'
        ? await prisma.employee.count({ 
            where: { 
              status: 'active',
              ...(user.companyId ? { companyId: user.companyId } : {})
            } 
          })
        : 1

    // Get present today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const presentToday =
      user.role === 'admin' || user.role === 'hr' || user.role === 'payroll'
        ? await prisma.attendance.count({
            where: {
              date: {
                gte: today,
                lt: tomorrow,
              },
              status: 'present',
              ...(companyEmployeeIds.length > 0 ? { employeeId: { in: companyEmployeeIds } } : {}),
            },
          })
        : await prisma.attendance.count({
            where: {
              userId: user.id,
              date: {
                gte: today,
                lt: tomorrow,
              },
              status: 'present',
            },
          })

    // Get pending leaves
    const pendingLeaves =
      user.role === 'admin' || user.role === 'hr' || user.role === 'payroll'
        ? await prisma.leave.count({
            where: {
              status: 'pending',
              ...(companyEmployeeIds.length > 0 ? { employeeId: { in: companyEmployeeIds } } : {}),
            },
          })
        : await prisma.leave.count({
            where: {
              userId: user.id,
              status: 'pending',
            },
          })

    // Get last payrun (filter by company if user has companyId)
    const lastPayrun = await prisma.payrun.findFirst({
      where: {
        status: 'completed',
        ...(user.companyId ? {
          payrolls: {
            some: {
              employee: {
                companyId: user.companyId,
              },
            },
          },
        } : {}),
      },
      orderBy: {
        payDate: 'desc',
      },
    })

    // Get attendance stats for last 7 days
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const attendanceLast7Days = await prisma.attendance.findMany({
      where: {
        date: {
          gte: sevenDaysAgo,
          lt: tomorrow,
        },
        ...(user.role === 'admin' || user.role === 'hr' || user.role === 'payroll'
          ? (companyEmployeeIds.length > 0 ? { employeeId: { in: companyEmployeeIds } } : {})
          : { userId: user.id }),
      },
      select: {
        date: true,
        status: true,
      },
    })

    // Group attendance by date
    const attendanceByDate = {}
    attendanceLast7Days.forEach((att) => {
      const dateStr = att.date.toISOString().split('T')[0]
      if (!attendanceByDate[dateStr]) {
        attendanceByDate[dateStr] = { present: 0, absent: 0, late: 0 }
      }
      if (att.status === 'present') attendanceByDate[dateStr].present++
      else if (att.status === 'absent') attendanceByDate[dateStr].absent++
      else if (att.status === 'late') attendanceByDate[dateStr].late++
    })

    // Get department distribution
    const departmentStats = await prisma.employee.groupBy({
      by: ['department'],
      where: {
        status: 'active',
        ...(user.companyId ? { companyId: user.companyId } : {}),
      },
      _count: {
        id: true,
      },
    })

    // Get monthly attendance trend (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    sixMonthsAgo.setDate(1)
    
    const monthlyAttendance = await prisma.attendance.groupBy({
      by: ['date'],
      where: {
        date: {
          gte: sixMonthsAgo,
        },
        ...(user.role === 'admin' || user.role === 'hr' || user.role === 'payroll'
          ? (companyEmployeeIds.length > 0 ? { employeeId: { in: companyEmployeeIds } } : {})
          : { userId: user.id }),
      },
      _count: {
        id: true,
      },
    })

    // Process monthly data
    const monthlyData = {}
    monthlyAttendance.forEach((item) => {
      const monthKey = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}`
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = 0
      }
      monthlyData[monthKey] += item._count.id
    })

    // Get leave statistics
    const leaveStats = await prisma.leave.groupBy({
      by: ['status'],
      where: {
        ...(user.role === 'admin' || user.role === 'hr' || user.role === 'payroll'
          ? (companyEmployeeIds.length > 0 ? { employeeId: { in: companyEmployeeIds } } : {})
          : { userId: user.id }),
      },
      _count: {
        id: true,
      },
    })

    res.json({
      status: 'success',
      data: {
        totalEmployees,
        presentToday,
        pendingLeaves,
        lastPayrunAmount: lastPayrun?.totalAmount || 0,
        lastPayrunDate: lastPayrun?.payDate ? lastPayrun.payDate.toISOString() : null,
        attendanceLast7Days: Object.entries(attendanceByDate).map(([date, stats]) => ({
          date,
          present: stats.present,
          absent: stats.absent,
          late: stats.late,
        })),
        departmentStats: departmentStats.map((dept) => ({
          department: dept.department,
          count: dept._count.id,
        })),
        monthlyAttendance: Object.entries(monthlyData).map(([month, count]) => ({
          month,
          count,
        })),
        leaveStats: leaveStats.map((stat) => ({
          status: stat.status,
          count: stat._count.id,
        })),
      },
    })
  } catch (error) {
    next(error)
  }
}

