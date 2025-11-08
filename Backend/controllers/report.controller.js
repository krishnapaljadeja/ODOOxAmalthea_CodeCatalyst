import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Get salary statement report
 */
export const getSalaryStatementReport = async (req, res, next) => {
  try {
    const { employeeId, year } = req.query
    const user = req.user

    if (!employeeId || !year) {
      return res.status(400).json({
        status: 'error',
        message: 'Employee ID and year are required',
      })
    }

    // Get employee data
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        position: true,
        hireDate: true,
        companyId: true,
        salary: true,
      },
    })

    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found',
        error: 'Not Found',
      })
    }

    // Verify employee belongs to the same company as the requesting user
    if (user.companyId && employee.companyId !== user.companyId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only view reports for employees in your company',
        error: 'Forbidden',
      })
    }

    // Get payslips for the selected year
    const yearStart = new Date(`${year}-01-01`)
    const yearEnd = new Date(`${year}-12-31`)
    
    // Fetch all payslips for this employee in the selected year
    const payslips = await prisma.payslip.findMany({
      where: {
        employeeId: employeeId,
        payroll: {
          payrun: {
            payPeriodStart: {
              gte: yearStart,
              lte: yearEnd,
            },
          },
        },
      },
      include: {
        payroll: {
          include: {
            payrun: {
              select: {
                payPeriodStart: true,
                payPeriodEnd: true,
              },
            },
          },
        },
      },
    })

    // If payslips exist, aggregate data from payslips
    // Otherwise, use salary structure effective during that year
    let earnings = []
    let deductions = []
    let netSalaryMonthly = 0
    let netSalaryYearly = 0

    if (payslips.length > 0) {
      // Aggregate from payslips
      // Get all unique pay periods
      const uniquePeriods = new Map()
      for (const payslip of payslips) {
        const payPeriodStart = payslip.payroll.payrun.payPeriodStart
        const key = `${payPeriodStart.getFullYear()}-${payPeriodStart.getMonth()}`
        if (!uniquePeriods.has(key)) {
          uniquePeriods.set(key, payPeriodStart)
        }
      }

      // Get all salary structures for the year at once
      const salaryStructures = await prisma.salaryStructure.findMany({
        where: {
          employeeId: employeeId,
          effectiveFrom: { lte: yearEnd },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: yearStart } },
          ],
        },
        orderBy: {
          effectiveFrom: 'desc',
        },
      })

      // Map each period to its salary structure
      const salaryDataMap = new Map()
      for (const [key, periodStart] of uniquePeriods) {
        // Find the salary structure effective during this period
        const salaryStructure = salaryStructures.find((ss) => {
          const effectiveFrom = new Date(ss.effectiveFrom)
          const effectiveTo = ss.effectiveTo ? new Date(ss.effectiveTo) : null
          return (
            effectiveFrom <= periodStart &&
            (!effectiveTo || effectiveTo >= periodStart)
          )
        })

        if (salaryStructure) {
          salaryDataMap.set(key, {
            basicSalary: salaryStructure.basicSalary || 0,
            houseRentAllowance: salaryStructure.houseRentAllowance || 0,
            standardAllowance: salaryStructure.standardAllowance || 0,
            performanceBonus: salaryStructure.performanceBonus || 0,
            travelAllowance: salaryStructure.travelAllowance || 0,
            fixedAllowance: salaryStructure.fixedAllowance || 0,
            pfEmployee: salaryStructure.pfEmployee || 0,
            professionalTax: salaryStructure.professionalTax || 0,
            netSalary: salaryStructure.netSalary || 0,
            count: 0,
          })
        }
      }

      // Calculate averages from all months
      let totalBasicSalary = 0
      let totalHRA = 0
      let totalStandardAllowance = 0
      let totalPerformanceBonus = 0
      let totalTravelAllowance = 0
      let totalFixedAllowance = 0
      let totalPFEmployee = 0
      let totalProfessionalTax = 0
      let totalNetSalary = 0
      let monthCount = 0

      salaryDataMap.forEach((data) => {
        totalBasicSalary += data.basicSalary
        totalHRA += data.houseRentAllowance
        totalStandardAllowance += data.standardAllowance
        totalPerformanceBonus += data.performanceBonus
        totalTravelAllowance += data.travelAllowance
        totalFixedAllowance += data.fixedAllowance
        totalPFEmployee += data.pfEmployee
        totalProfessionalTax += data.professionalTax
        totalNetSalary += data.netSalary
        monthCount++
      })

      // Calculate monthly averages
      const avgBasicSalary = monthCount > 0 ? totalBasicSalary / monthCount : 0
      const avgHRA = monthCount > 0 ? totalHRA / monthCount : 0
      const avgStandardAllowance = monthCount > 0 ? totalStandardAllowance / monthCount : 0
      const avgPerformanceBonus = monthCount > 0 ? totalPerformanceBonus / monthCount : 0
      const avgTravelAllowance = monthCount > 0 ? totalTravelAllowance / monthCount : 0
      const avgFixedAllowance = monthCount > 0 ? totalFixedAllowance / monthCount : 0
      const avgPFEmployee = monthCount > 0 ? totalPFEmployee / monthCount : 0
      const avgProfessionalTax = monthCount > 0 ? totalProfessionalTax / monthCount : 0
      netSalaryMonthly = monthCount > 0 ? totalNetSalary / monthCount : 0

      earnings = [
        {
          name: 'Basic Salary',
          monthlyAmount: avgBasicSalary,
          yearlyAmount: avgBasicSalary * 12,
        },
        {
          name: 'House Rent Allowance (HRA)',
          monthlyAmount: avgHRA,
          yearlyAmount: avgHRA * 12,
        },
        {
          name: 'Standard Allowance',
          monthlyAmount: avgStandardAllowance,
          yearlyAmount: avgStandardAllowance * 12,
        },
        {
          name: 'Performance Bonus',
          monthlyAmount: avgPerformanceBonus,
          yearlyAmount: avgPerformanceBonus * 12,
        },
        {
          name: 'Leave Travel Allowance (LTA)',
          monthlyAmount: avgTravelAllowance,
          yearlyAmount: avgTravelAllowance * 12,
        },
        {
          name: 'Fixed Allowance',
          monthlyAmount: avgFixedAllowance,
          yearlyAmount: avgFixedAllowance * 12,
        },
      ]

      deductions = [
        {
          name: 'Provident Fund (PF) - Employee',
          monthlyAmount: avgPFEmployee,
          yearlyAmount: avgPFEmployee * 12,
        },
        {
          name: 'Professional Tax',
          monthlyAmount: avgProfessionalTax,
          yearlyAmount: avgProfessionalTax * 12,
        },
      ]

      netSalaryYearly = netSalaryMonthly * 12
    } else {
      // No payslips found, use salary structure effective during that year
      const yearMid = new Date(`${year}-06-01`) // Use mid-year as reference
      
      const salaryStructure = await prisma.salaryStructure.findFirst({
        where: {
          employeeId: employeeId,
          effectiveFrom: { lte: yearMid },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: yearMid } },
          ],
        },
        orderBy: {
          effectiveFrom: 'desc',
        },
      })

      if (salaryStructure) {
        const basicSalary = salaryStructure.basicSalary || 0
        const hra = salaryStructure.houseRentAllowance || 0
        const standardAllowance = salaryStructure.standardAllowance || 0
        const performanceBonus = salaryStructure.performanceBonus || 0
        const travelAllowance = salaryStructure.travelAllowance || 0
        const fixedAllowance = salaryStructure.fixedAllowance || 0
        const pfEmployee = salaryStructure.pfEmployee || 0
        const professionalTax = salaryStructure.professionalTax || 0
        netSalaryMonthly = salaryStructure.netSalary || 0

        earnings = [
          {
            name: 'Basic Salary',
            monthlyAmount: basicSalary,
            yearlyAmount: basicSalary * 12,
          },
          {
            name: 'House Rent Allowance (HRA)',
            monthlyAmount: hra,
            yearlyAmount: hra * 12,
          },
          {
            name: 'Standard Allowance',
            monthlyAmount: standardAllowance,
            yearlyAmount: standardAllowance * 12,
          },
          {
            name: 'Performance Bonus',
            monthlyAmount: performanceBonus,
            yearlyAmount: performanceBonus * 12,
          },
          {
            name: 'Leave Travel Allowance (LTA)',
            monthlyAmount: travelAllowance,
            yearlyAmount: travelAllowance * 12,
          },
          {
            name: 'Fixed Allowance',
            monthlyAmount: fixedAllowance,
            yearlyAmount: fixedAllowance * 12,
          },
        ]

        deductions = [
          {
            name: 'Provident Fund (PF) - Employee',
            monthlyAmount: pfEmployee,
            yearlyAmount: pfEmployee * 12,
          },
          {
            name: 'Professional Tax',
            monthlyAmount: professionalTax,
            yearlyAmount: professionalTax * 12,
          },
        ]

        netSalaryYearly = netSalaryMonthly * 12
      } else {
        // Fallback to current employee salary data using salary utils
        const { getSalaryData } = await import('../utils/salary.utils.js')
        const salaryData = await getSalaryData(employeeId, employee.salary || 0)
        
        netSalaryMonthly = salaryData.netSalary

        earnings = [
          {
            name: 'Basic Salary',
            monthlyAmount: salaryData.basicSalary,
            yearlyAmount: salaryData.basicSalary * 12,
          },
          {
            name: 'House Rent Allowance (HRA)',
            monthlyAmount: salaryData.houseRentAllowance,
            yearlyAmount: salaryData.houseRentAllowance * 12,
          },
          {
            name: 'Standard Allowance',
            monthlyAmount: salaryData.standardAllowance,
            yearlyAmount: salaryData.standardAllowance * 12,
          },
          {
            name: 'Performance Bonus',
            monthlyAmount: salaryData.performanceBonus,
            yearlyAmount: salaryData.performanceBonus * 12,
          },
          {
            name: 'Leave Travel Allowance (LTA)',
            monthlyAmount: salaryData.travelAllowance,
            yearlyAmount: salaryData.travelAllowance * 12,
          },
          {
            name: 'Fixed Allowance',
            monthlyAmount: salaryData.fixedAllowance,
            yearlyAmount: salaryData.fixedAllowance * 12,
          },
        ]

        deductions = [
          {
            name: 'Provident Fund (PF) - Employee',
            monthlyAmount: salaryData.pfEmployee,
            yearlyAmount: salaryData.pfEmployee * 12,
          },
          {
            name: 'Professional Tax',
            monthlyAmount: salaryData.professionalTax,
            yearlyAmount: salaryData.professionalTax * 12,
          },
        ]

        netSalaryYearly = netSalaryMonthly * 12
      }
    }

    res.json({
      status: 'success',
      earnings,
      deductions,
      netSalary: {
        monthly: netSalaryMonthly,
        yearly: netSalaryYearly,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Download salary statement report as PDF
 * Note: This is a placeholder - you'll need to implement PDF generation
 * using a library like pdfkit, puppeteer, or similar
 */
export const downloadSalaryStatementReport = async (req, res, next) => {
  try {
    const { employeeId, year } = req.query
    const user = req.user

    if (!employeeId || !year) {
      return res.status(400).json({
        status: 'error',
        message: 'Employee ID and year are required',
      })
    }

    // Get employee data (same as getSalaryStatementReport)
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        position: true,
        hireDate: true,
        companyId: true,
        salary: true,
      },
    })

    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found',
        error: 'Not Found',
      })
    }

    // Verify employee belongs to the same company
    if (user.companyId && employee.companyId !== user.companyId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only download reports for employees in your company',
        error: 'Forbidden',
      })
    }

    // For now, return JSON data
    // TODO: Implement PDF generation using pdfkit, puppeteer, or similar library
    // This is a placeholder that returns the data as JSON
    // You should replace this with actual PDF generation
    
    // Get salary data from active salary structure
    const { getSalaryData } = await import('../utils/salary.utils.js')
    const salaryData = await getSalaryData(employeeId, employee.salary || 0)
    
    const monthWage = salaryData.monthWage
    const basicSalary = salaryData.basicSalary
    const hra = salaryData.houseRentAllowance
    const standardAllowance = salaryData.standardAllowance
    const performanceBonus = salaryData.performanceBonus
    const travelAllowance = salaryData.travelAllowance
    const fixedAllowance = salaryData.fixedAllowance
    const grossSalary = salaryData.grossSalary
    const pfEmployee = salaryData.pfEmployee
    const professionalTax = salaryData.professionalTax
    const netSalary = salaryData.netSalary

    // Return JSON for now - frontend can handle PDF generation client-side
    // or you can implement server-side PDF generation here
    res.status(501).json({
      status: 'error',
      message: 'PDF download not yet implemented. Please use the print functionality.',
    })

    // TODO: Uncomment and implement when PDF library is added
    // const PDFDocument = require('pdfkit')
    // const doc = new PDFDocument()
    // 
    // res.setHeader('Content-Type', 'application/pdf')
    // res.setHeader(
    //   'Content-Disposition',
    //   `attachment; filename=salary-statement-${employee.employeeId}-${year}.pdf`
    // )
    // 
    // doc.pipe(res)
    // // Add PDF content here
    // doc.end()
  } catch (error) {
    next(error)
  }
}

