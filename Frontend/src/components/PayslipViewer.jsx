import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Download } from 'lucide-react'
import { formatDate, formatCurrency } from '../lib/format'

/**
 * PayslipViewer component - Displays a payslip in a printable format
 * @param {Object} props
 * @param {Object} props.payslip - Payslip data
 * @param {Function} props.onDownload - Download handler
 */
export default function PayslipViewer({ payslip, onDownload }) {
  if (!payslip) return null

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={onDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </div>

      <Card className="print:p-8" id="payslip">
        <CardHeader className="border-b">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">WorkZen HRMS</CardTitle>
              <p className="text-sm text-muted-foreground">Payslip</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Pay Date</p>
              <p className="font-semibold">{formatDate(payslip.payDate)}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Employee Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Employee</p>
              <p className="font-semibold">{payslip.employeeName}</p>
              <p className="text-sm">{payslip.employeeId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pay Period</p>
              <p className="font-semibold">
                {formatDate(payslip.payPeriodStart)} -{' '}
                {formatDate(payslip.payPeriodEnd)}
              </p>
            </div>
          </div>

          {/* Earnings */}
          <div>
            <h3 className="font-semibold mb-2">Earnings</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Base Salary</span>
                <span className="font-medium">
                  {formatCurrency(payslip.earnings?.baseSalary || 0)}
                </span>
              </div>
              {payslip.earnings?.overtime > 0 && (
                <div className="flex justify-between">
                  <span>Overtime</span>
                  <span className="font-medium">
                    {formatCurrency(payslip.earnings.overtime)}
                  </span>
                </div>
              )}
              {payslip.earnings?.bonus > 0 && (
                <div className="flex justify-between">
                  <span>Bonus</span>
                  <span className="font-medium">
                    {formatCurrency(payslip.earnings.bonus)}
                  </span>
                </div>
              )}
              {payslip.earnings?.allowances > 0 && (
                <div className="flex justify-between">
                  <span>Allowances</span>
                  <span className="font-medium">
                    {formatCurrency(payslip.earnings.allowances)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Gross Pay</span>
                <span>{formatCurrency(payslip.grossPay)}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <h3 className="font-semibold mb-2">Deductions</h3>
            <div className="space-y-2">
              {payslip.deductions?.tax > 0 && (
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span className="font-medium">
                    {formatCurrency(payslip.deductions.tax)}
                  </span>
                </div>
              )}
              {payslip.deductions?.insurance > 0 && (
                <div className="flex justify-between">
                  <span>Insurance</span>
                  <span className="font-medium">
                    {formatCurrency(payslip.deductions.insurance)}
                  </span>
                </div>
              )}
              {payslip.deductions?.other > 0 && (
                <div className="flex justify-between">
                  <span>Other</span>
                  <span className="font-medium">
                    {formatCurrency(payslip.deductions.other)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Total Deductions</span>
                <span>{formatCurrency(payslip.totalDeductions)}</span>
              </div>
            </div>
          </div>

          {/* Net Pay */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Net Pay</span>
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(payslip.netPay)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

