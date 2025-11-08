import PDFDocument from 'pdfkit'

export const generatePayslipPDF = (payslip, employee) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 })
      const chunks = []

      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      doc.fontSize(20).text('WorkZen HRMS', { align: 'center' })
      doc.fontSize(14).text('Payslip', { align: 'center' })
      doc.moveDown()

      doc.fontSize(12)
      doc.text(`Employee: ${employee.firstName} ${employee.lastName}`)
      doc.text(`Employee ID: ${employee.employeeId}`)
      const payPeriodStart = payslip.payPeriodStart instanceof Date 
        ? payslip.payPeriodStart.toISOString().split('T')[0]
        : payslip.payPeriodStart
      const payPeriodEnd = payslip.payPeriodEnd instanceof Date
        ? payslip.payPeriodEnd.toISOString().split('T')[0]
        : payslip.payPeriodEnd
      const payDate = payslip.payDate instanceof Date
        ? payslip.payDate.toISOString().split('T')[0]
        : payslip.payDate
      
      doc.text(`Pay Period: ${payPeriodStart} - ${payPeriodEnd}`)
      doc.text(`Pay Date: ${payDate}`)
      doc.moveDown()

      doc.fontSize(14).text('Earnings', { underline: true })
      doc.fontSize(12)
      doc.text(`Base Salary: $${payslip.baseSalary.toFixed(2)}`)
      if (payslip.overtime > 0) {
        doc.text(`Overtime: $${payslip.overtime.toFixed(2)}`)
      }
      if (payslip.bonus > 0) {
        doc.text(`Bonus: $${payslip.bonus.toFixed(2)}`)
      }
      if (payslip.allowances > 0) {
        doc.text(`Allowances: $${payslip.allowances.toFixed(2)}`)
      }
      doc.text(`Gross Pay: $${payslip.grossPay.toFixed(2)}`, { bold: true })
      doc.moveDown()

      doc.fontSize(14).text('Deductions', { underline: true })
      doc.fontSize(12)
      if (payslip.tax > 0) {
        doc.text(`Tax: $${payslip.tax.toFixed(2)}`)
      }
      if (payslip.insurance > 0) {
        doc.text(`Insurance: $${payslip.insurance.toFixed(2)}`)
      }
      if (payslip.other > 0) {
        doc.text(`Other: $${payslip.other.toFixed(2)}`)
      }
      doc.text(`Total Deductions: $${payslip.totalDeductions.toFixed(2)}`, { bold: true })
      doc.moveDown()

      doc.fontSize(16).text(`Net Pay: $${payslip.netPay.toFixed(2)}`, { bold: true, align: 'right' })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

