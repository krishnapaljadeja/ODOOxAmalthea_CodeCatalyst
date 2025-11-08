import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Save, Search, Eye, Pencil } from 'lucide-react'
import apiClient from '../lib/api'
import { formatDate, formatCurrency } from '../lib/format'
import { toast } from 'sonner'
import { useAuthStore } from '../store/auth'
import ProtectedRoute from '../components/ProtectedRoute'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'

/**
 * Salary Management page component
 * Allows admin/payroll manager to view and manage employee salaries
 */
export default function SalaryManagement() {
  const { user } = useAuthStore()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [salaryInfo, setSalaryInfo] = useState(null)
  const [isEditingSalary, setIsEditingSalary] = useState(false)

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const response = await apiClient.get('/employees')
      const employeesData = response.data?.data || response.data || []
      setEmployees(Array.isArray(employeesData) ? employeesData : [])
    } catch (error) {
      console.error('Failed to fetch employees:', error)
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }

  const handleViewSalary = async (employee) => {
    setSelectedEmployee(employee)
    setIsDialogOpen(true)
    setIsEditingSalary(false)
    try {
      const response = await apiClient.get(`/employees/${employee.id}/salary`)
      const salaryData = response.data?.data || response.data
      setSalaryInfo(salaryData)
    } catch (error) {
      console.error('Failed to fetch salary info:', error)
      // Use employee salary if available
      if (employee.salary) {
        const basicSalary = employee.salary * 0.5
        const hra = basicSalary * 0.5
        const conveyance = employee.salary * 0.1
        const medicalAllowance = employee.salary * 0.1
        const specialAllowance = employee.salary * 0.05
        const grossSalary = employee.salary
        const pf = basicSalary * 0.12
        const esi = 0
        const professionalTax = 200
        const netSalary = grossSalary - pf - esi - professionalTax
        setSalaryInfo({
          basicSalary,
          hra,
          conveyance,
          medicalAllowance,
          specialAllowance,
          grossSalary,
          pf,
          esi,
          professionalTax,
          netSalary,
        })
      }
    }
  }

  const handleSaveSalary = async () => {
    if (!selectedEmployee || !salaryInfo) return

    try {
      await apiClient.put(`/employees/${selectedEmployee.id}/salary`, salaryInfo)
      toast.success('Salary information updated successfully')
      setIsEditingSalary(false)
      fetchEmployees()
    } catch (error) {
      console.error('Failed to update salary:', error)
      toast.error('Failed to update salary information')
    }
  }

  const filteredEmployees = employees.filter((emp) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      emp.firstName?.toLowerCase().includes(searchLower) ||
      emp.lastName?.toLowerCase().includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower) ||
      emp.employeeId?.toLowerCase().includes(searchLower)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading employees...</p>
      </div>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'hr', 'payroll']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Salary Management</h1>
          <p className="text-muted-foreground">
            View and manage employee salary details
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Employee Salaries</CardTitle>
            <CardDescription>
              Click on an employee to view and update their salary information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Current Salary</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No employees found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">
                          {employee.employeeId}
                        </TableCell>
                        <TableCell>
                          {employee.firstName} {employee.lastName}
                        </TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>{employee.department}</TableCell>
                        <TableCell>{employee.position}</TableCell>
                        <TableCell>{formatCurrency(employee.salary || 0)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewSalary(employee)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View/Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Salary Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>
                    Salary Information - {selectedEmployee?.firstName} {selectedEmployee?.lastName}
                  </DialogTitle>
                  <DialogDescription>
                    View and update employee salary details
                  </DialogDescription>
                </div>
                {salaryInfo && (
                  <Button
                    variant={isEditingSalary ? "outline" : "default"}
                    onClick={() => {
                      if (isEditingSalary) {
                        handleSaveSalary()
                      } else {
                        setIsEditingSalary(true)
                      }
                    }}
                  >
                    {isEditingSalary ? (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    ) : (
                      <>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </>
                    )}
                  </Button>
                )}
              </div>
            </DialogHeader>
            {salaryInfo && (
              <div className="space-y-6">
                {/* Salary Components */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Salary Components</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Basic Salary */}
                  <div className="p-4 border rounded-lg space-y-3">
                    <Label className="text-base font-semibold block">
                      Basic Salary
                    </Label>
                    {isEditingSalary && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={salaryInfo.basicSalary || ""}
                          onChange={(e) =>
                            setSalaryInfo({
                              ...salaryInfo,
                              basicSalary: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-32"
                          placeholder="Amount"
                        />
                        <span className="text-sm text-muted-foreground">
                          ₹/month
                        </span>
                      </div>
                    )}
                    {!isEditingSalary && (
                      <div className="text-lg font-semibold">
                        {formatCurrency(salaryInfo.basicSalary || 0)}{" "}
                        <span className="text-sm text-muted-foreground font-normal">
                          ₹/month
                        </span>
                      </div>
                    )}
                  </div>

                  {/* HRA */}
                  <div className="p-4 border rounded-lg space-y-3">
                    <Label className="text-base font-semibold block">
                      House Rent Allowance (HRA)
                    </Label>
                    {isEditingSalary && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={salaryInfo.hra || ""}
                          onChange={(e) =>
                            setSalaryInfo({
                              ...salaryInfo,
                              hra: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-32"
                          placeholder="Amount"
                        />
                        <span className="text-sm text-muted-foreground">
                          ₹/month
                        </span>
                      </div>
                    )}
                    {!isEditingSalary && (
                      <div className="text-lg font-semibold">
                        {formatCurrency(salaryInfo.hra || 0)}{" "}
                        <span className="text-sm text-muted-foreground font-normal">
                          ₹/month
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Conveyance */}
                  {salaryInfo.conveyance !== undefined && (
                    <div className="p-4 border rounded-lg space-y-3">
                      <Label className="text-base font-semibold block">
                        Conveyance
                      </Label>
                      {isEditingSalary && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={salaryInfo.conveyance || ""}
                            onChange={(e) =>
                              setSalaryInfo({
                                ...salaryInfo,
                                conveyance: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-32"
                            placeholder="Amount"
                          />
                          <span className="text-sm text-muted-foreground">
                            ₹/month
                          </span>
                        </div>
                      )}
                      {!isEditingSalary && (
                        <div className="text-lg font-semibold">
                          {formatCurrency(salaryInfo.conveyance || 0)}{" "}
                          <span className="text-sm text-muted-foreground font-normal">
                            ₹/month
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Medical Allowance */}
                  {salaryInfo.medicalAllowance !== undefined && (
                    <div className="p-4 border rounded-lg space-y-3">
                      <Label className="text-base font-semibold block">
                        Medical Allowance
                      </Label>
                      {isEditingSalary && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={salaryInfo.medicalAllowance || ""}
                            onChange={(e) =>
                              setSalaryInfo({
                                ...salaryInfo,
                                medicalAllowance: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-32"
                            placeholder="Amount"
                          />
                          <span className="text-sm text-muted-foreground">
                            ₹/month
                          </span>
                        </div>
                      )}
                      {!isEditingSalary && (
                        <div className="text-lg font-semibold">
                          {formatCurrency(salaryInfo.medicalAllowance || 0)}{" "}
                          <span className="text-sm text-muted-foreground font-normal">
                            ₹/month
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Special Allowance */}
                  {salaryInfo.specialAllowance !== undefined && (
                    <div className="p-4 border rounded-lg space-y-3">
                      <Label className="text-base font-semibold block">
                        Special Allowance
                      </Label>
                      {isEditingSalary && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={salaryInfo.specialAllowance || ""}
                            onChange={(e) =>
                              setSalaryInfo({
                                ...salaryInfo,
                                specialAllowance: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-32"
                            placeholder="Amount"
                          />
                          <span className="text-sm text-muted-foreground">
                            ₹/month
                          </span>
                        </div>
                      )}
                      {!isEditingSalary && (
                        <div className="text-lg font-semibold">
                          {formatCurrency(salaryInfo.specialAllowance || 0)}{" "}
                          <span className="text-sm text-muted-foreground font-normal">
                            ₹/month
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Gross Salary */}
                  <div className="col-span-full p-4 border-2 border-primary rounded-lg bg-primary/5 space-y-3">
                    <Label className="text-base font-semibold block">
                      Gross Salary
                    </Label>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(
                        (salaryInfo.basicSalary || 0) +
                        (salaryInfo.hra || 0) +
                        (salaryInfo.conveyance || 0) +
                        (salaryInfo.medicalAllowance || 0) +
                        (salaryInfo.specialAllowance || 0)
                      )}
                    </p>
                  </div>
                  </div>
                </div>

                {/* Provident Fund Contribution */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Provident Fund (PF) Contribution
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* PF Employee */}
                  <div className="p-4 border rounded-lg space-y-3">
                    <Label className="text-base font-semibold block">
                      Employee
                    </Label>
                    {isEditingSalary && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={salaryInfo.pf || ""}
                          onChange={(e) =>
                            setSalaryInfo({
                              ...salaryInfo,
                              pf: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-32"
                          placeholder="Amount"
                        />
                        <span className="text-sm text-muted-foreground">
                          ₹/month
                        </span>
                      </div>
                    )}
                    {!isEditingSalary && (
                      <div className="text-lg font-semibold">
                        {formatCurrency(salaryInfo.pf || 0)}{" "}
                        <span className="text-sm text-muted-foreground font-normal">
                          ₹/month
                        </span>
                      </div>
                    )}
                  </div>
                  </div>
                </div>

                {/* Tax Deductions */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Tax Deductions</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ESI */}
                  {salaryInfo.esi !== undefined && (
                    <div className="p-4 border rounded-lg space-y-3">
                      <Label className="text-base font-semibold block">
                        ESI
                      </Label>
                      {isEditingSalary && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={salaryInfo.esi || ""}
                            onChange={(e) =>
                              setSalaryInfo({
                                ...salaryInfo,
                                esi: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-32"
                            placeholder="Amount"
                          />
                          <span className="text-sm text-muted-foreground">
                            ₹/month
                          </span>
                        </div>
                      )}
                      {!isEditingSalary && (
                        <div className="text-lg font-semibold">
                          {formatCurrency(salaryInfo.esi || 0)}{" "}
                          <span className="text-sm text-muted-foreground font-normal">
                            ₹/month
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Professional Tax */}
                  <div className="p-4 border rounded-lg space-y-3">
                    <Label className="text-base font-semibold block">
                      Professional Tax
                    </Label>
                    {isEditingSalary && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={salaryInfo.professionalTax || ""}
                          onChange={(e) =>
                            setSalaryInfo({
                              ...salaryInfo,
                              professionalTax: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-32"
                          placeholder="Amount"
                        />
                        <span className="text-sm text-muted-foreground">
                          ₹/month
                        </span>
                      </div>
                    )}
                    {!isEditingSalary && (
                      <div className="text-lg font-semibold">
                        {formatCurrency(salaryInfo.professionalTax || 0)}{" "}
                        <span className="text-sm text-muted-foreground font-normal">
                          ₹/month
                        </span>
                      </div>
                    )}
                  </div>
                  </div>
                </div>

                {/* Net Salary */}
                <div className="space-y-2 p-4 border-2 border-primary rounded-lg bg-primary/5">
                  <Label className="text-base font-semibold">
                    Net Salary
                  </Label>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(
                      ((salaryInfo.basicSalary || 0) +
                      (salaryInfo.hra || 0) +
                      (salaryInfo.conveyance || 0) +
                      (salaryInfo.medicalAllowance || 0) +
                      (salaryInfo.specialAllowance || 0)) -
                      ((salaryInfo.pf || 0) +
                      (salaryInfo.esi || 0) +
                      (salaryInfo.professionalTax || 0))
                    )}
                  </p>
                </div>

                {isEditingSalary && (
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditingSalary(false)
                        setIsDialogOpen(false)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveSalary}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}

