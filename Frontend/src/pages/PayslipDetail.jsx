import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Plus, FileText, CheckCircle, XCircle, Printer, Download } from 'lucide-react'
import apiClient from '../lib/api'
import { formatDate, formatCurrency } from '../lib/format'
import { toast } from 'sonner'
import PayslipViewer from '../components/PayslipViewer'

/**
 * Individual Payslip Detail page with tabs
 * Shows worked days and salary computation
 */
export default function PayslipDetail() {
  const { payslipId } = useParams()
  const navigate = useNavigate()
  const [payslip, setPayslip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [workedDays, setWorkedDays] = useState(null)
  const [salaryComputation, setSalaryComputation] = useState(null)

  useEffect(() => {
    if (payslipId) {
      fetchPayslip()
      fetchWorkedDays()
      fetchSalaryComputation()
    }
  }, [payslipId])

  const fetchPayslip = async () => {
    try {
      const response = await apiClient.get(`/payslips/${payslipId}`)
      setPayslip(response.data)
    } catch (error) {
      console.error('Failed to fetch payslip:', error)
      toast.error('Failed to load payslip')
    } finally {
      setLoading(false)
    }
  }

  const fetchWorkedDays = async () => {
    try {
      const response = await apiClient.get(`/payslips/${payslipId}/worked-days`)
      setWorkedDays(response.data)
    } catch (error) {
      console.error('Failed to fetch worked days:', error)
      // Use mock data
      setWorkedDays({
        attendance: { days: 30, description: '5 working days/week', amount: 45633.33 },
        paidTimeOff: { days: 2, description: '2 Paid leaves/Month', amount: 4166.67 },
        total: { days: 32, amount: 50000 },
      })
    }
  }

  const fetchSalaryComputation = async () => {
    try {
      const response = await apiClient.get(`/payslips/${payslipId}/computation`)
      setSalaryComputation(response.data)
    } catch (error) {
      console.error('Failed to fetch salary computation:', error)
      // Use mock data
      setSalaryComputation({
        gross: [
          { ruleName: 'Basic Salary', rate: 100, amount: 125000 },
          { ruleName: 'House Rent Allowance', rate: 100, amount: 25000 },
          { ruleName: 'Medical Allowance', rate: 100, amount: 10000 },
          { ruleName: 'Performance Bonus', rate: 100, amount: 15000 },
          { ruleName: 'Leave Travel Allowance', rate: 100, amount: 7500 },
          { ruleName: 'Fixed Allowance', rate: 100, amount: 5000 },
          { ruleName: 'Gross', rate: 100, amount: 187500 },
        ],
        deductions: [
          { ruleName: 'PF Employee', rate: 100, amount: -3700 },
          { ruleName: 'PF Employer', rate: 100, amount: -3700 },
          { ruleName: 'Professional Tax', rate: 100, amount: -200 },
          { ruleName: 'Net Payable', rate: 100, amount: 180000 },
        ],
      })
    }
  }

  const handleNewPayslip = () => {
    navigate('/payslips')
  }

  const handleGenerate = async () => {
    try {
      await apiClient.post(`/payslips/${payslipId}/generate`)
      toast.success('Payslip generated successfully')
      fetchPayslip()
      fetchWorkedDays()
      fetchSalaryComputation()
    } catch (error) {
      console.error('Failed to generate payslip:', error)
      toast.error('Failed to generate payslip')
    }
  }

  const handleValidate = async () => {
    try {
      await apiClient.post(`/payslips/${payslipId}/validate`)
      toast.success('Payslip validated successfully')
      fetchPayslip()
    } catch (error) {
      console.error('Failed to validate payslip:', error)
      toast.error('Failed to validate payslip')
    }
  }

  const handleCancel = () => {
    navigate('/payslips')
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = async () => {
    try {
      const response = await apiClient.get(`/payslips/${payslipId}/download`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `payslip-${payslipId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Payslip downloaded successfully')
    } catch (error) {
      console.error('Failed to download payslip:', error)
      toast.error('Failed to download payslip')
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!payslip) {
    return <div>Payslip not found</div>
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payslip</h1>
          <p className="text-muted-foreground">
            {payslip.employeeName} - {formatDate(payslip.payDate)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleNewPayslip}>
            <Plus className="mr-2 h-4 w-4" />
            New Payslip
          </Button>
          <Button variant="outline" onClick={handleGenerate}>
            <FileText className="mr-2 h-4 w-4" />
            Generate
          </Button>
          <Button variant="outline" onClick={handleValidate}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Validate
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            <XCircle className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      {/* Employee and Payrun Info */}
      <Card>
        <CardHeader>
          <CardTitle>Payslip Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Employee</p>
              <p className="font-semibold">{payslip.employeeName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payrun</p>
              <p className="font-semibold">
                {payslip.payrunId ? `Payrun ${payslip.payrunId}` : formatDate(payslip.payDate, 'MMM YYYY')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Salary Structure</p>
              <p className="font-semibold">Regular Pay</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Period</p>
              <p className="font-semibold">
                {payslip.payPeriodStart && payslip.payPeriodEnd
                  ? `${formatDate(payslip.payPeriodStart)} to ${formatDate(payslip.payPeriodEnd)}`
                  : formatDate(payslip.payDate)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="worked-days" className="space-y-4">
        <TabsList>
          <TabsTrigger value="worked-days">Worked Days</TabsTrigger>
          <TabsTrigger value="salary-computation">Salary Computation</TabsTrigger>
        </TabsList>

        <TabsContent value="worked-days" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Worked Days</CardTitle>
              <CardDescription>
                Salary is calculated based on the employee's monthly attendance. Paid leaves are included in the total payable days, while unpaid leaves are deducted from the salary.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workedDays && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Days</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Attendance</TableCell>
                      <TableCell className="text-right">
                        {workedDays.attendance?.days || 0} ({workedDays.attendance?.description || ''})
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(workedDays.attendance?.amount || 0)}
                      </TableCell>
                    </TableRow>
                    {workedDays.paidTimeOff && (
                      <TableRow>
                        <TableCell>Paid Time off</TableCell>
                        <TableCell className="text-right">
                          {workedDays.paidTimeOff.days} ({workedDays.paidTimeOff.description})
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(workedDays.paidTimeOff.amount)}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow className="font-semibold border-t-2">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">
                        {workedDays.total?.days || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(workedDays.total?.amount || 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary-computation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Salary Computation</CardTitle>
              <CardDescription>
                Users can also view the payslip computation, which shows how the total amount is calculated from different salary heads, including allowances and deductions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {salaryComputation && (
                <div className="space-y-6">
                  {/* Gross Section */}
                  <div>
                    <h3 className="font-semibold mb-4">Gross</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rule Name</TableHead>
                          <TableHead className="text-right">Rate %</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salaryComputation.gross?.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.ruleName}</TableCell>
                            <TableCell className="text-right">{item.rate}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Deductions Section */}
                  <div>
                    <h3 className="font-semibold mb-4">Deductions</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rule Name</TableHead>
                          <TableHead className="text-right">Rate %</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salaryComputation.deductions?.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.ruleName}</TableCell>
                            <TableCell className="text-right">{item.rate}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payslip Viewer */}
      <Card>
        <CardHeader>
          <CardTitle>Payslip Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <PayslipViewer
            payslip={payslip}
            onDownload={handleDownload}
          />
        </CardContent>
      </Card>
    </div>
  )
}

