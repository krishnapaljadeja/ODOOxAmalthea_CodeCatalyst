import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Save, Search, Eye } from 'lucide-react'
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
      setIsDialogOpen(false)
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Salary Information - {selectedEmployee?.firstName} {selectedEmployee?.lastName}
              </DialogTitle>
              <DialogDescription>
                View and update employee salary details
              </DialogDescription>
            </DialogHeader>
            {salaryInfo && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Basic Salary</Label>
                    <Input
                      type="number"
                      value={salaryInfo.basicSalary || 0}
                      onChange={(e) =>
                        setSalaryInfo({
                          ...salaryInfo,
                          basicSalary: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>HRA</Label>
                    <Input
                      type="number"
                      value={salaryInfo.hra || 0}
                      onChange={(e) =>
                        setSalaryInfo({
                          ...salaryInfo,
                          hra: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conveyance</Label>
                    <Input
                      type="number"
                      value={salaryInfo.conveyance || 0}
                      onChange={(e) =>
                        setSalaryInfo({
                          ...salaryInfo,
                          conveyance: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Medical Allowance</Label>
                    <Input
                      type="number"
                      value={salaryInfo.medicalAllowance || 0}
                      onChange={(e) =>
                        setSalaryInfo({
                          ...salaryInfo,
                          medicalAllowance: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Special Allowance</Label>
                    <Input
                      type="number"
                      value={salaryInfo.specialAllowance || 0}
                      onChange={(e) =>
                        setSalaryInfo({
                          ...salaryInfo,
                          specialAllowance: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gross Salary</Label>
                    <p className="text-lg font-semibold text-primary">
                      {formatCurrency(
                        (salaryInfo.basicSalary || 0) +
                        (salaryInfo.hra || 0) +
                        (salaryInfo.conveyance || 0) +
                        (salaryInfo.medicalAllowance || 0) +
                        (salaryInfo.specialAllowance || 0)
                      )}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>PF</Label>
                    <Input
                      type="number"
                      value={salaryInfo.pf || 0}
                      onChange={(e) =>
                        setSalaryInfo({
                          ...salaryInfo,
                          pf: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ESI</Label>
                    <Input
                      type="number"
                      value={salaryInfo.esi || 0}
                      onChange={(e) =>
                        setSalaryInfo({
                          ...salaryInfo,
                          esi: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Professional Tax</Label>
                    <Input
                      type="number"
                      value={salaryInfo.professionalTax || 0}
                      onChange={(e) =>
                        setSalaryInfo({
                          ...salaryInfo,
                          professionalTax: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Net Salary</Label>
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
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveSalary}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}

