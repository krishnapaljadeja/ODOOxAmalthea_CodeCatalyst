import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Get dashboard statistics
 */
export const getStats = async (req, res, next) => {
  try {
    const user = req.user

    // Get total employees (admin/hr can see all, others see only their own)
    const totalEmployees =
      user.role === 'admin' || user.role === 'hr'
        ? await prisma.employee.count({ where: { status: 'active' } })
        : 1

    // Get present today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const presentToday =
      user.role === 'admin' || user.role === 'hr' || user.role === 'manager'
        ? await prisma.attendance.count({
            where: {
              date: today,
              status: 'present',
            },
          })
        : await prisma.attendance.count({
            where: {
              userId: user.id,
              date: today,
              status: 'present',
            },
          })

    // Get pending leaves
    const pendingLeaves =
      user.role === 'admin' || user.role === 'hr' || user.role === 'manager'
        ? await prisma.leave.count({
            where: {
              status: 'pending',
            },
          })
        : await prisma.leave.count({
            where: {
              userId: user.id,
              status: 'pending',
            },
          })

    // Get last payrun
    const lastPayrun = await prisma.payrun.findFirst({
      where: {
        status: 'completed',
      },
      orderBy: {
        payDate: 'desc',
      },
    })

    res.json({
      status: 'success',
      data: {
        totalEmployees,
        presentToday,
        pendingLeaves,
        lastPayrunAmount: lastPayrun?.totalAmount || 0,
        lastPayrunDate: lastPayrun?.payDate || null,
      },
    })
  } catch (error) {
    next(error)
  }
}

