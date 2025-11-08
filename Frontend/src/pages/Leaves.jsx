import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
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
  type: z.string().min(1, 'Leave type is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().min(1, 'Reason is required'),
})

/**
 * Leaves page component
 */
export default function Leaves() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const { user } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm({
    resolver: zodResolver(leaveSchema),
  })

  const startDate = watch('startDate')
  const endDate = watch('endDate')

  useEffect(() => {
    fetchLeaves()
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
    } catch (error) {
      console.error('Failed to create leave:', error)
    }
  }

  const handleApprove = async (leaveId) => {
    try {
      await apiClient.put(`/leaves/${leaveId}/approve`)
      toast.success('Leave approved')
      fetchLeaves()
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

  const isApprover = ['admin', 'hr', 'manager'].includes(user?.role)

  const columns = [
    {
      header: 'Employee',
      accessor: 'employeeName',
    },
    {
      header: 'Type',
      accessor: 'type',
    },
    {
      header: 'Start Date',
      accessor: 'startDate',
      cell: (row) => formatDate(row.startDate),
    },
    {
      header: 'End Date',
      accessor: 'endDate',
      cell: (row) => formatDate(row.endDate),
    },
    {
      header: 'Days',
      accessor: 'days',
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
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReject(row.id)}
                  >
                    <X className="h-4 w-4 text-red-600" />
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
          <h1 className="text-3xl font-bold">Leaves</h1>
          <p className="text-muted-foreground">Manage leave requests</p>
        </div>
        {!isApprover && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Apply for Leave
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Apply for Leave</DialogTitle>
                <DialogDescription>
                  Submit a leave request for approval
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Leave Type</Label>
                  <Select
                    {...register('type')}
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
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
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

      <Card>
        <CardHeader>
          <CardTitle>{isApprover ? 'All Leave Requests' : 'My Leaves'}</CardTitle>
          <CardDescription>
            {isApprover
              ? 'Review and approve leave requests'
              : 'View your leave history'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={leaves}
            columns={columns}
            searchable
            searchPlaceholder="Search leaves..."
            paginated
            pageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  )
}

