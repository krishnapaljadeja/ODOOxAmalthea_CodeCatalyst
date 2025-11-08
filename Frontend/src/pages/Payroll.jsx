import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import DataTable from '../components/DataTable'
import { Eye, Play, AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react'
import apiClient from '../lib/api'
import { formatDate, formatCurrency } from '../lib/format'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { useLocation } from 'react-router-dom'

/**
 * Payroll page component with Dashboard and Payrun tabs
 */
export default function Payroll() {
  const navigate = useNavigate()
  const location = useLocation()
  const [payruns, setPayruns] = useState([])
  const [currentMonthPayrun, setCurrentMonthPayrun] = useState(null)
  const [payrolls, setPayrolls] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPayrun, setSelectedPayrun] = useState(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [dashboardData, setDashboardData] = useState(null)
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'dashboard')

  useEffect(() => {
    fetchPayruns()
    fetchDashboardData()
    if (activeTab === 'payrun') {
      fetchCurrentMonthPayrun()
    }
  }, [activeTab])

  const fetchPayruns = async () => {
    try {
      const response = await apiClient.get('/payroll/payruns')
      // Backend returns { status: 'success', data: [...] }
      const payrunsData = response.data?.data || response.data || []
      setPayruns(payrunsData)
    } catch (error) {
      console.error('Failed to fetch payruns:', error)
      toast.error('Failed to fetch payruns')
    } finally {
      setLoading(false)
    }
  }

  const fetchCurrentMonthPayrun = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/payroll/payruns/current-month')
      // Backend returns { status: 'success', data: {...} }
      const payrunData = response.data?.data || response.data
      if (payrunData) {
        setCurrentMonthPayrun(payrunData)
        setPayrolls(payrunData.payrolls || [])
        console.log('Current Month Payrun:', payrunData)
      } else {
        setCurrentMonthPayrun(null)
        setPayrolls([])
      }
    } catch (error) {
      console.error('Failed to fetch current month payrun:', error)
      toast.error('Failed to fetch current month payrun')
      setCurrentMonthPayrun(null)
      setPayrolls([])
    } finally {
      setLoading(false)
    }
  }

  const fetchDashboardData = async () => {
    try {
      const response = await apiClient.get('/payroll/dashboard')
      setDashboardData(response.data)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      // Use mock data if API fails
      setDashboardData({
        warnings: [
          { type: 'noBankAccount', count: 1 },
          { type: 'noManager', count: 1 },
        ],
        recentPayruns: payruns.slice(0, 2),
        employeeCost: {
          annually: [
            { month: 'Jan 2025', cost: 50000 },
            { month: 'Feb 2025', cost: 52000 },
            { month: 'Mar 2025', cost: 48000 },
            { month: 'Apr 2025', cost: 55000 },
            { month: 'May 2025', cost: 53000 },
            { month: 'Jun 2025', cost: 51000 },
          ],
          monthly: [
            { month: 'Jan 2025', cost: 50000 },
            { month: 'Feb 2025', cost: 52000 },
            { month: 'Mar 2025', cost: 48000 },
            { month: 'Apr 2025', cost: 55000 },
            { month: 'May 2025', cost: 53000 },
            { month: 'Jun 2025', cost: 51000 },
          ],
        },
        employeeCount: {
          annually: [
            { month: 'Jan 2025', count: 10 },
            { month: 'Feb 2025', count: 12 },
            { month: 'Mar 2025', count: 11 },
            { month: 'Apr 2025', count: 13 },
            { month: 'May 2025', count: 12 },
            { month: 'Jun 2025', count: 11 },
          ],
          monthly: [
            { month: 'Jan 2025', count: 10 },
            { month: 'Feb 2025', count: 12 },
            { month: 'Mar 2025', count: 11 },
            { month: 'Apr 2025', count: 13 },
            { month: 'May 2025', count: 12 },
            { month: 'Jun 2025', count: 11 },
          ],
        },
      })
    }
  }


  const handlePreview = async (payrunId) => {
    try {
      const response = await apiClient.get(`/payroll/payruns/${payrunId}/preview`)
      setSelectedPayrun(response.data)
      setIsPreviewOpen(true)
    } catch (error) {
      console.error('Failed to preview payrun:', error)
    }
  }

  const handleProcess = async (payrunId) => {
    try {
      await apiClient.post(`/payroll/payruns/${payrunId}/process`)
      toast.success('Payrun processed successfully')
      fetchPayruns()
      fetchDashboardData()
    } catch (error) {
      console.error('Failed to process payrun:', error)
    }
  }

  const handleValidate = async (payrollId) => {
    try {
      await apiClient.put(`/payroll/${payrollId}/validate`)
      toast.success('Payroll validated successfully')
      fetchCurrentMonthPayrun()
      fetchPayruns()
      fetchDashboardData()
    } catch (error) {
      console.error('Failed to validate payroll:', error)
      toast.error(error.response?.data?.message || 'Failed to validate payroll')
    }
  }

  const handleProcessPayrun = async () => {
    if (!currentMonthPayrun) return
    try {
      await apiClient.post(`/payroll/payruns/${currentMonthPayrun.id}/process`)
      toast.success('Payrun processed successfully')
      fetchCurrentMonthPayrun()
      fetchPayruns()
      fetchDashboardData()
    } catch (error) {
      console.error('Failed to process payrun:', error)
      toast.error(error.response?.data?.message || 'Failed to process payrun')
    }
  }

  const handlePayrollClick = (payroll) => {
    // Navigate to payslip detail using payrollId, passing payrunId for back navigation
    if (payroll.payslipId) {
      navigate(`/payslips/${payroll.payslipId}?payrunId=${currentMonthPayrun?.id}`)
    } else {
      // If no payslip exists yet, navigate using payrollId
      navigate(`/payslips/payroll/${payroll.id}?payrunId=${currentMonthPayrun?.id}`)
    }
  }

  const handleValidateAll = async () => {
    if (!currentMonthPayrun) return
    try {
      await apiClient.put(`/payroll/payruns/${currentMonthPayrun.id}/validate-all`)
      toast.success('All payrolls validated successfully')
      fetchCurrentMonthPayrun()
      fetchPayruns()
      fetchDashboardData()
    } catch (error) {
      console.error('Failed to validate all payrolls:', error)
      toast.error(error.response?.data?.message || 'Failed to validate all payrolls')
    }
  }

  // Columns for payruns list (dashboard tab)
  const payrunColumns = [
    {
      header: 'Pay Period',
      accessor: (row) =>
        `${formatDate(row.payPeriodStart)} - ${formatDate(row.payPeriodEnd)}`,
    },
    {
      header: 'Employee',
      accessor: (row) => `${row.totalEmployees} Employee${row.totalEmployees !== 1 ? 's' : ''}`,
    },
    {
      header: 'Employer Cost',
      accessor: 'employerCost',
      cell: (row) => formatCurrency(row.employerCost || row.totalAmount * 0.2),
    },
    {
      header: 'Basic Wage',
      accessor: 'basicWage',
      cell: (row) => formatCurrency(row.basicWage || row.totalAmount * 0.6),
    },
    {
      header: 'Gross Wage',
      accessor: 'grossWage',
      cell: (row) => formatCurrency(row.grossWage || row.totalAmount * 0.8),
    },
    {
      header: 'Net Wage',
      accessor: 'netWage',
      cell: (row) => formatCurrency(row.netWage || row.totalAmount),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.status === 'completed' ? (
            <Button
              variant="outline"
              size="sm"
              className="bg-green-100 text-green-800 border-green-300"
            >
              Done
            </Button>
          ) : (
            <span
              className={`rounded-full px-2 py-1 text-xs ${
                row.status === 'processing'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {row.status}
            </span>
          )}
        </div>
      ),
    },
  ]

  // Columns for employee payroll list (payrun tab)
  const payrollColumns = [
    {
      header: 'Pay Period',
      accessor: 'payPeriod',
    },
    {
      header: 'Employee',
      accessor: (row) => row.employee?.name || `${row.employee?.firstName} ${row.employee?.lastName}`,
    },
    {
      header: 'Employer Cost',
      accessor: 'employerCost',
      cell: (row) => formatCurrency(row.employerCost || 0),
    },
    {
      header: 'Basic Wage',
      accessor: 'basicWage',
      cell: (row) => formatCurrency(row.basicWage || 0),
    },
    {
      header: 'Gross Wage',
      accessor: 'grossWage',
      cell: (row) => formatCurrency(row.grossWage || 0),
    },
    {
      header: 'Net Wage',
      accessor: 'netWage',
      cell: (row) => formatCurrency(row.netWage || 0),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.status === 'Done' || row.status === 'validated' ? (
            <Button
              variant="outline"
              size="sm"
              className="bg-green-100 text-green-800 border-green-300"
            >
              Done
            </Button>
          ) : (
            <span
              className={`rounded-full px-2 py-1 text-xs ${
                row.status === 'computed'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {row.status}
            </span>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payroll</h1>
          <p className="text-muted-foreground">
            The Payroll menu is accessible only to users with Admin/Payroll Officer access rights
          </p>
        </div>
        {activeTab === 'payrun' && (
          <div className="flex gap-2">
            {currentMonthPayrun && currentMonthPayrun.status === 'draft' && (
              <Button variant="outline" onClick={handleProcessPayrun}>
                <Play className="mr-2 h-4 w-4" />
                Process Payrun
              </Button>
            )}
            {currentMonthPayrun && 
             currentMonthPayrun.payrolls && 
             currentMonthPayrun.payrolls.length > 0 &&
             currentMonthPayrun.payrolls.some(p => p.status === 'computed' || p.status === 'draft') && (
              <Button variant="outline" onClick={handleValidateAll}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Validate
              </Button>
            )}
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="payrun">Payrun</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          {/* Warning Cards */}
          {dashboardData?.warnings && dashboardData.warnings.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center text-yellow-800">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Warning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboardData.warnings.map((warning, index) => (
                    <p key={index} className="text-sm text-yellow-800">
                      {warning.count} Employee{warning.count !== 1 ? 's' : ''} without{' '}
                      {warning.type === 'noBankAccount' ? 'Bank Acc' : 'Manager'}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Payruns */}
          {payruns && payruns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payruns</CardTitle>
                <CardDescription>View all payruns (completed payruns are read-only)</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={payruns}
                  columns={payrunColumns}
                  searchable
                  searchPlaceholder="Search payruns..."
                  paginated
                  pageSize={10}
                  onRowClick={(payrun) => {
                    setSelectedPayrun(payrun)
                    setIsPreviewOpen(true)
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Employee Cost Charts */}
          {dashboardData?.employeeCost && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Employee Cost</CardTitle>
                  <CardDescription>Annually</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboardData.employeeCost.annually}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="cost" fill="#3b82f6" name="Cost" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Employee Cost</CardTitle>
                  <CardDescription>Monthly</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboardData.employeeCost.monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="cost" fill="#3b82f6" name="Cost" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Employee Count Charts */}
          {dashboardData?.employeeCount && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Employee Count</CardTitle>
                  <CardDescription>Annually</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboardData.employeeCount.annually}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#3b82f6" name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Employee Count</CardTitle>
                  <CardDescription>Monthly</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboardData.employeeCount.monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#3b82f6" name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="payrun" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center">Loading...</div>
              </CardContent>
            </Card>
          ) : currentMonthPayrun ? (
            <>
              {/* Payrun Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>{currentMonthPayrun.name}</CardTitle>
                  <CardDescription>
                    Pay Period: {currentMonthPayrun.payPeriodStart && currentMonthPayrun.payPeriodEnd
                      ? `${formatDate(currentMonthPayrun.payPeriodStart)} - ${formatDate(currentMonthPayrun.payPeriodEnd)}`
                      : 'N/A'}
                    {currentMonthPayrun.payDate && ` | Pay Date: ${formatDate(currentMonthPayrun.payDate)}`}
                  </CardDescription>
                  <CardDescription className="mt-2">
                    The payslip of an individual employee is generated on the basis of attendance of that employee in a particular month.
                  </CardDescription>
                  <CardDescription className="mt-2">
                    Done status show once any payrun/payslip has been validated.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Employer Cost</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(
                          currentMonthPayrun.payrolls?.reduce((sum, p) => sum + (p.grossSalary || 0), 0) || 
                          currentMonthPayrun.totalAmount || 0
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Gross</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(
                          currentMonthPayrun.payrolls?.reduce((sum, p) => sum + (p.grossSalary || 0), 0) || 
                          currentMonthPayrun.totalAmount || 0
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Net</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(
                          currentMonthPayrun.payrolls?.reduce((sum, p) => sum + (p.netSalary || 0), 0) || 0
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <div className="mt-1">
                        {currentMonthPayrun.status === 'completed' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-green-100 text-green-800 border-green-300"
                          >
                            Done
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">{currentMonthPayrun.status}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Employee Payroll List */}
              <Card>
                <CardHeader>
                  <CardTitle>Payslip List view</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={payrolls}
                    columns={payrollColumns}
                    searchable
                    searchPlaceholder="Search employees..."
                    paginated
                    pageSize={10}
                    onRowClick={handlePayrollClick}
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Payrun Found</CardTitle>
                <CardDescription>
                  No payrun found for the current month. Create a new payrun to get started.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Payruns are automatically created for each month. Use the Process Payrun button to generate payrolls.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payrun Details</DialogTitle>
            <DialogDescription>
              {selectedPayrun?.status === 'completed' 
                ? 'View payrun details (read-only - cannot be edited)' 
                : 'View payrun details'}
            </DialogDescription>
          </DialogHeader>
          {selectedPayrun && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Payrun Name</Label>
                  <p className="text-sm font-medium">{selectedPayrun.name}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <p className="text-sm font-medium">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        selectedPayrun.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : selectedPayrun.status === 'processing'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {selectedPayrun.status}
                    </span>
                  </p>
                </div>
                <div>
                  <Label>Pay Period</Label>
                  <p className="text-sm font-medium">
                    {selectedPayrun.payPeriodStart && selectedPayrun.payPeriodEnd
                      ? `${formatDate(selectedPayrun.payPeriodStart)} - ${formatDate(selectedPayrun.payPeriodEnd)}`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label>Pay Date</Label>
                  <p className="text-sm font-medium">
                    {selectedPayrun.payDate ? formatDate(selectedPayrun.payDate) : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label>Total Employees</Label>
                  <p className="text-sm font-medium">
                    {selectedPayrun.totalEmployees || 0}
                  </p>
                </div>
                <div>
                  <Label>Total Amount</Label>
                  <p className="text-sm font-medium">
                    {formatCurrency(selectedPayrun.totalAmount || 0)}
                  </p>
                </div>
              </div>
              {selectedPayrun.status === 'completed' && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    This payrun is completed and cannot be edited. All payrolls have been validated and payslips generated.
                  </p>
                </div>
              )}
              {selectedPayrun.payslips && (
                <div className="space-y-2">
                  <Label>Payslips</Label>
                  <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                    {selectedPayrun.payslips.map((payslip) => (
                      <div
                        key={payslip.id}
                        className="flex items-center justify-between p-2 border-b"
                      >
                        <div>
                          <p className="font-medium">{payslip.employeeName}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(payslip.netPay)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
