import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import DataTable from '../components/DataTable'
import { Plus, Check, X, Upload } from 'lucide-react'
import apiClient from '../lib/api'
import { formatDate } from '../lib/format'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuthStore } from '../store/auth'

const leaveSchema = z.object({
  type: z.string().min(1, 'Leave type is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().min(1, 'Reason is required'),
})

const allocationSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  timeOffType: z.string().min(1, 'Time off type is required'),
  validityPeriodStart: z.string().min(1, 'Start date is required'),
  validityPeriodEnd: z.string().min(1, 'End date is required'),
  allocation: z.number().min(0, 'Allocation must be positive'),
})

/**
 * Time Off page component (renamed from Leaves)
 * Role-based views:
 * - Admin/HR Officer: Can view all, approve/reject, and manage allocations
 * - Employee: Can view own records and apply for time off
 */
export default function Leaves() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isAllocationOpen, setIsAllocationOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('time-off') // 'time-off' or 'allocation'
  const [timeOffTypes, setTimeOffTypes] = useState([])
  const [timeOffBalances, setTimeOffBalances] = useState(null)
  const [employees, setEmployees] = useState([])
  const { user } = useAuthStore()

  const isApprover = ['admin', 'hr', 'manager'].includes(user?.role)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm({
    resolver: zodResolver(leaveSchema),
  })

  const {
    register: registerAllocation,
    handleSubmit: handleSubmitAllocation,
    formState: { errors: allocationErrors },
    reset: resetAllocation,
    watch: watchAllocation,
  } = useForm({
    resolver: zodResolver(allocationSchema),
  })

  const startDate = watch('startDate')
  const endDate = watch('endDate')

  useEffect(() => {
    fetchLeaves()
    fetchTimeOffTypes()
    fetchTimeOffBalances()
    if (isApprover) {
      fetchEmployees()
    }
  }, [])

  const fetchLeaves = async () => {
    try {
      const response = await apiClient.get('/leaves')
      setLeaves(response.data)
    } catch (error) {
      console.error('Failed to fetch leaves:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTimeOffTypes = async () => {
    try {
      const response = await apiClient.get('/time-off/types')
      setTimeOffTypes(response.data)
    } catch (error) {
      console.error('Failed to fetch time off types:', error)
    }
  }

  const fetchTimeOffBalances = async () => {
    try {
      const response = await apiClient.get('/time-off/balances')
      setTimeOffBalances(response.data)
    } catch (error) {
      console.error('Failed to fetch time off balances:', error)
    }
  }

  const fetchEmployees = async () => {
    try {
      const response = await apiClient.get('/employees')
      setEmployees(response.data)
    } catch (error) {
      console.error('Failed to fetch employees:', error)
    }
  }

  const onSubmit = async (data) => {
    try {
      // Calculate days
      const start = new Date(data.startDate)
      const end = new Date(data.endDate)
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1

      await apiClient.post('/leaves', {
        ...data,
        days,
      })
      toast.success('Leave request submitted successfully')
      setIsCreateOpen(false)
      reset()
      fetchLeaves()
      fetchTimeOffBalances()
    } catch (error) {
      console.error('Failed to create leave:', error)
    }
  }

  const onSubmitAllocation = async (data) => {
    try {
      await apiClient.post('/time-off/allocations', data)
      toast.success('Time off allocation created successfully')
      setIsAllocationOpen(false)
      resetAllocation()
      fetchTimeOffBalances()
    } catch (error) {
      console.error('Failed to create allocation:', error)
    }
  }

  const handleApprove = async (leaveId) => {
    try {
      await apiClient.put(`/leaves/${leaveId}/approve`)
      toast.success('Leave approved')
      fetchLeaves()
      fetchTimeOffBalances()
    } catch (error) {
      console.error('Failed to approve leave:', error)
    }
  }

  const handleReject = async (leaveId) => {
    try {
      await apiClient.put(`/leaves/${leaveId}/reject`)
      toast.success('Leave rejected')
      fetchLeaves()
    } catch (error) {
      console.error('Failed to reject leave:', error)
    }
  }

  const columns = [
    {
      header: 'Name',
      accessor: 'employeeName',
    },
    {
      header: 'Start Date',
      accessor: 'startDate',
      cell: (row) => formatDate(row.startDate, 'DD/MM/YYYY'),
    },
    {
      header: 'End Date',
      accessor: 'endDate',
      cell: (row) => formatDate(row.endDate, 'DD/MM/YYYY'),
    },
    {
      header: 'Time off Type',
      accessor: 'type',
      cell: (row) => {
        const typeLabels = {
          sick: 'Sick Leave',
          vacation: 'Paid Time Off',
          personal: 'Personal Leave',
          unpaid: 'Unpaid Leave',
        }
        return typeLabels[row.type] || row.type
      },
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => (
        <span
          className={`rounded-full px-2 py-1 text-xs ${
            row.status === 'approved'
              ? 'bg-green-100 text-green-800'
              : row.status === 'rejected'
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    ...(isApprover
      ? [
          {
            header: 'Actions',
            cell: (row) =>
              row.status === 'pending' ? (
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleApprove(row.id)}
                    className="text-green-600 hover:text-green-700"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReject(row.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : null,
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Time Off</h1>
          <p className="text-muted-foreground">Manage time off requests</p>
        </div>
        {isApprover && (
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'time-off' ? 'default' : 'outline'}
              onClick={() => setActiveTab('time-off')}
            >
              Time Off
            </Button>
            <Button
              variant={activeTab === 'allocation' ? 'default' : 'outline'}
              onClick={() => setActiveTab('allocation')}
            >
              Allocation
            </Button>
          </div>
        )}
      </div>

      {/* NOTE Box */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm">
            <p className="font-semibold">Note</p>
            <p>
              Employees can view only their own time off records, while Admins
              and HR Officers can view time off records & approve/reject them
              for all employees.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Time Off Balances Cards */}
      {timeOffBalances && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Paid time Off</p>
              <p className="text-2xl font-bold">
                {timeOffBalances.paidTimeOff || 0} Days Available
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Sick time off</p>
              <p className="text-2xl font-bold">
                {timeOffBalances.sickTimeOff || 0} Days Available
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'time-off' ? (
        /* Time Off Tab */
        <>
          <div className="flex items-center justify-between">
            <div></div>
            {!isApprover && (
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    NEW
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Time off type creation</DialogTitle>
                    <DialogDescription>
                      Submit a time off request for approval
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Time off Type</Label>
                      <Select
                        {...register('type')}
                        aria-invalid={errors.type ? 'true' : 'false'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select time off type" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOffTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.type && (
                        <p className="text-sm text-destructive">
                          {errors.type.message}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Validity Period Start</Label>
                        <Input
                          id="startDate"
                          type="date"
                          {...register('startDate')}
                          aria-invalid={errors.startDate ? 'true' : 'false'}
                        />
                        {errors.startDate && (
                          <p className="text-sm text-destructive">
                            {errors.startDate.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate">To</Label>
                        <Input
                          id="endDate"
                          type="date"
                          {...register('endDate')}
                          min={startDate}
                          aria-invalid={errors.endDate ? 'true' : 'false'}
                        />
                        {errors.endDate && (
                          <p className="text-sm text-destructive">
                            {errors.endDate.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reason">Reason</Label>
                      <Input
                        id="reason"
                        {...register('reason')}
                        aria-invalid={errors.reason ? 'true' : 'false'}
                      />
                      {errors.reason && (
                        <p className="text-sm text-destructive">
                          {errors.reason.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="attachment">Attachment</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="attachment"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="flex-1"
                        />
                        <Upload className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        (e.g. sick leave certificate)
                      </p>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Submit</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
            {isApprover && (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Searchbar"
                  className="w-64"
                />
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      NEW
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Time off type creation</DialogTitle>
                      <DialogDescription>
                        Create a new time off request
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="employeeId">Employee</Label>
                        <Select
                          {...register('employeeId')}
                          aria-invalid={errors.employeeId ? 'true' : 'false'}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.firstName} {employee.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="type">Time off Type</Label>
                        <Select
                          {...register('type')}
                          aria-invalid={errors.type ? 'true' : 'false'}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select time off type" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOffTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.type && (
                          <p className="text-sm text-destructive">
                            {errors.type.message}
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="startDate">Validity Period Start</Label>
                          <Input
                            id="startDate"
                            type="date"
                            {...register('startDate')}
                            aria-invalid={errors.startDate ? 'true' : 'false'}
                          />
                          {errors.startDate && (
                            <p className="text-sm text-destructive">
                              {errors.startDate.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="endDate">To</Label>
                          <Input
                            id="endDate"
                            type="date"
                            {...register('endDate')}
                            min={startDate}
                            aria-invalid={errors.endDate ? 'true' : 'false'}
                          />
                          {errors.endDate && (
                            <p className="text-sm text-destructive">
                              {errors.endDate.message}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reason">Reason</Label>
                        <Input
                          id="reason"
                          {...register('reason')}
                          aria-invalid={errors.reason ? 'true' : 'false'}
                        />
                        {errors.reason && (
                          <p className="text-sm text-destructive">
                            {errors.reason.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="attachment">Attachment</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="attachment"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="flex-1"
                          />
                          <Upload className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          (e.g. sick leave certificate)
                        </p>
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCreateOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">Submit</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {isApprover ? 'All Leave Requests' : 'My Time Off'}
              </CardTitle>
              <CardDescription>
                {isApprover
                  ? 'Review and approve leave requests'
                  : 'View your time off history'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={leaves}
                columns={columns}
                searchable={isApprover}
                searchPlaceholder="Search time off..."
                paginated
                pageSize={10}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        /* Allocation Tab (Admin/HR only) */
        <>
          <div className="flex items-center justify-between">
            <div></div>
            <Dialog open={isAllocationOpen} onOpenChange={setIsAllocationOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Time Off Allocation</DialogTitle>
                  <DialogDescription>
                    Allocate time off to employees
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={handleSubmitAllocation(onSubmitAllocation)}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Employee</Label>
                    <Select
                      {...registerAllocation('employeeId')}
                      aria-invalid={
                        allocationErrors.employeeId ? 'true' : 'false'
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.firstName} {employee.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {allocationErrors.employeeId && (
                      <p className="text-sm text-destructive">
                        {allocationErrors.employeeId.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeOffType">Time off Type</Label>
                    <Select
                      {...registerAllocation('timeOffType')}
                      aria-invalid={
                        allocationErrors.timeOffType ? 'true' : 'false'
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select time off type" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOffTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {allocationErrors.timeOffType && (
                      <p className="text-sm text-destructive">
                        {allocationErrors.timeOffType.message}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="validityPeriodStart">
                        Validity Period Start
                      </Label>
                      <Input
                        id="validityPeriodStart"
                        type="date"
                        {...registerAllocation('validityPeriodStart')}
                        aria-invalid={
                          allocationErrors.validityPeriodStart
                            ? 'true'
                            : 'false'
                        }
                      />
                      {allocationErrors.validityPeriodStart && (
                        <p className="text-sm text-destructive">
                          {allocationErrors.validityPeriodStart.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="validityPeriodEnd">To</Label>
                      <Input
                        id="validityPeriodEnd"
                        type="date"
                        {...registerAllocation('validityPeriodEnd')}
                        min={watchAllocation('validityPeriodStart')}
                        aria-invalid={
                          allocationErrors.validityPeriodEnd
                            ? 'true'
                            : 'false'
                        }
                      />
                      {allocationErrors.validityPeriodEnd && (
                        <p className="text-sm text-destructive">
                          {allocationErrors.validityPeriodEnd.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="allocation">Allocation (Days)</Label>
                    <Input
                      id="allocation"
                      type="number"
                      step="0.01"
                      {...registerAllocation('allocation', {
                        valueAsNumber: true,
                      })}
                      aria-invalid={
                        allocationErrors.allocation ? 'true' : 'false'
                      }
                    />
                    {allocationErrors.allocation && (
                      <p className="text-sm text-destructive">
                        {allocationErrors.allocation.message}
                      </p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAllocationOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Save</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Time Off Allocations</CardTitle>
              <CardDescription>
                Manage time off allocations for employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">TimeOff Types</h3>
                  <ul className="space-y-1 text-sm">
                    {timeOffTypes.map((type) => (
                      <li key={type.id}>- {type.name}</li>
                    ))}
                  </ul>
                </div>
                {/* Allocation list would go here */}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
