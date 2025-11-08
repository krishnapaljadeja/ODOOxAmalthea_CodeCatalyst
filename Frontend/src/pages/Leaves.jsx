import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import DataTable from '../components/DataTable'
import { Plus, Check, X } from 'lucide-react'
import apiClient from '../lib/api'
import { formatDate } from '../lib/format'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuthStore } from '../store/auth'

const leaveSchema = z.object({
  type: z.enum(['sick', 'vacation', 'personal', 'unpaid'], {
    required_error: 'Leave type is required',
  }),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().min(1, 'Reason is required'),
})

/**
 * Leaves page component
 * Role-based views:
 * - Admin/HR/Manager: Can view all, approve/reject leave requests
 * - Employee: Can view own records and create leave requests
 */
export default function Leaves() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [selectedLeaveId, setSelectedLeaveId] = useState(null)
  const { user } = useAuthStore()

  const isApprover = ['admin', 'hr', 'payroll'].includes(user?.role)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(leaveSchema),
  })

  const {
    register: registerReject,
    handleSubmit: handleSubmitReject,
    formState: { errors: rejectErrors },
    reset: resetReject,
  } = useForm({
    resolver: zodResolver(
      z.object({
        rejectionReason: z.string().optional(),
      })
    ),
  })

  const startDate = watch('startDate')
  const endDate = watch('endDate')

  useEffect(() => {
    fetchLeaves()
  }, [])

  const fetchLeaves = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/leaves')
      setLeaves(response.data || [])
    } catch (error) {
      console.error('Failed to fetch leaves:', error)
      toast.error('Failed to fetch leave requests')
    } finally {
      setLoading(false)
    }
  }

  const calculateDays = (start, end) => {
    if (!start || !end) return 0
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffTime = Math.abs(endDate - startDate)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  useEffect(() => {
    if (startDate && endDate) {
      const days = calculateDays(startDate, endDate)
      if (days > 0) {
        // Days will be calculated on the backend, but we can show it in the UI
      }
    }
  }, [startDate, endDate])

  const onSubmit = async (data) => {
    try {
      // Calculate days
      const days = calculateDays(data.startDate, data.endDate)
      
      if (days <= 0) {
        toast.error('End date must be after start date')
        return
      }

      await apiClient.post('/leaves', {
        ...data,
        days,
      })
      toast.success('Leave request submitted successfully')
      setIsCreateOpen(false)
      reset()
      fetchLeaves()
    } catch (error) {
      console.error('Failed to create leave:', error)
      const message = error.response?.data?.message || 'Failed to create leave request'
      toast.error(message)
    }
  }

  const handleApprove = async (leaveId) => {
    try {
      await apiClient.put(`/leaves/${leaveId}/approve`)
      toast.success('Leave approved successfully')
      fetchLeaves()
    } catch (error) {
      console.error('Failed to approve leave:', error)
      const message = error.response?.data?.message || 'Failed to approve leave'
      toast.error(message)
    }
  }

  const handleRejectClick = (leaveId) => {
    setSelectedLeaveId(leaveId)
    setIsRejectOpen(true)
  }

  const onSubmitReject = async (data) => {
    try {
      await apiClient.put(`/leaves/${selectedLeaveId}/reject`, {
        rejectionReason: data.rejectionReason || undefined,
      })
      toast.success('Leave rejected successfully')
      setIsRejectOpen(false)
      resetReject()
      setSelectedLeaveId(null)
      fetchLeaves()
    } catch (error) {
      console.error('Failed to reject leave:', error)
      const message = error.response?.data?.message || 'Failed to reject leave'
      toast.error(message)
    }
  }

  const leaveTypeLabels = {
    sick: 'Sick Leave',
    vacation: 'Vacation',
    personal: 'Personal Leave',
    unpaid: 'Unpaid Leave',
  }

  const columns = [
    {
      header: 'Employee',
      accessor: 'employeeName',
    },
    {
      header: 'Type',
      accessor: 'type',
      cell: (row) => leaveTypeLabels[row.type] || row.type,
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
      header: 'Days',
      accessor: 'days',
    },
    {
      header: 'Reason',
      accessor: 'reason',
      cell: (row) => (
        <div className="max-w-xs truncate" title={row.reason}>
          {row.reason}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => (
        <div className="flex flex-col gap-1">
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium w-fit ${
              row.status === 'approved'
                ? 'bg-green-100 text-green-800'
                : row.status === 'rejected'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
          </span>
          {row.status === 'rejected' && row.rejectionReason && (
            <span className="text-xs text-muted-foreground max-w-xs truncate" title={row.rejectionReason}>
              Reason: {row.rejectionReason}
            </span>
          )}
          {row.status === 'approved' && row.approvedAt && (
            <span className="text-xs text-muted-foreground">
              Approved: {formatDate(row.approvedAt, 'DD/MM/YYYY')}
            </span>
          )}
        </div>
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
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    title="Approve"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRejectClick(row.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Reject"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              ),
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Requests</h1>
          <p className="text-muted-foreground">
            {isApprover
              ? 'Manage and approve leave requests'
              : 'View and create leave requests'}
          </p>
        </div>
        {!isApprover && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Leave Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Leave Request</DialogTitle>
                <DialogDescription>
                  Submit a leave request for approval
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Leave Type</Label>
                  <Select
                    onValueChange={(value) => {
                      setValue('type', value, { shouldValidate: true })
                    }}
                    value={watch('type')}
                    aria-invalid={errors.type ? 'true' : 'false'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="vacation">Vacation</SelectItem>
                      <SelectItem value="personal">Personal Leave</SelectItem>
                      <SelectItem value="unpaid">Unpaid Leave</SelectItem>
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
                    <Label htmlFor="startDate">Start Date</Label>
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
                    <Label htmlFor="endDate">End Date</Label>
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
                {startDate && endDate && (
                  <div className="text-sm text-muted-foreground">
                    Total days: {calculateDays(startDate, endDate)}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    {...register('reason')}
                    placeholder="Enter reason for leave"
                    rows={3}
                    aria-invalid={errors.reason ? 'true' : 'false'}
                  />
                  {errors.reason && (
                    <p className="text-sm text-destructive">
                      {errors.reason.message}
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateOpen(false)
                      reset()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Submit Request</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* NOTE Box */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm">
            <p className="font-semibold">Note</p>
            <p>
              {isApprover
                ? 'You can view all leave requests and approve or reject pending requests. Employees can only view their own leave requests.'
                : 'You can view your leave requests and create new ones. Your requests will be reviewed by HR or Admin.'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {isApprover ? 'All Leave Requests' : 'My Leave Requests'}
          </CardTitle>
          <CardDescription>
            {isApprover
              ? 'Review and manage leave requests from all employees'
              : 'View your leave request history'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading leave requests...
            </div>
          ) : (
            <DataTable
              data={leaves}
              columns={columns}
              searchable={isApprover}
              searchPlaceholder="Search leave requests..."
              paginated
              pageSize={10}
            />
          )}
        </CardContent>
      </Card>

      {/* Reject Leave Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this leave request (optional)
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitReject(onSubmitReject)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Rejection Reason</Label>
              <Textarea
                id="rejectionReason"
                {...registerReject('rejectionReason')}
                placeholder="Enter rejection reason (optional)"
                rows={3}
                aria-invalid={rejectErrors.rejectionReason ? 'true' : 'false'}
              />
              {rejectErrors.rejectionReason && (
                <p className="text-sm text-destructive">
                  {rejectErrors.rejectionReason.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsRejectOpen(false)
                  resetReject()
                  setSelectedLeaveId(null)
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive">
                Reject Leave
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
