import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import DataTable from '../components/DataTable'
import { Plus, Eye, Play } from 'lucide-react'
import apiClient from '../lib/api'
import { formatDate, formatCurrency } from '../lib/format'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

const payrunSchema = z.object({
  name: z.string().min(1, 'Payrun name is required'),
  payPeriodStart: z.string().min(1, 'Start date is required'),
  payPeriodEnd: z.string().min(1, 'End date is required'),
  payDate: z.string().min(1, 'Pay date is required'),
})

/**
 * Payroll page component
 */
export default function Payroll() {
  const [payruns, setPayruns] = useState([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedPayrun, setSelectedPayrun] = useState(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(payrunSchema),
  })

  useEffect(() => {
    fetchPayruns()
  }, [])

  const fetchPayruns = async () => {
    try {
      const response = await apiClient.get('/payroll/payruns')
      setPayruns(response.data)
    } catch (error) {
      console.error('Failed to fetch payruns:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data) => {
    try {
      const response = await apiClient.post('/payroll/payruns', data)
      toast.success('Payrun created successfully')
      setIsCreateOpen(false)
      reset()
      fetchPayruns()
    } catch (error) {
      console.error('Failed to create payrun:', error)
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
    } catch (error) {
      console.error('Failed to process payrun:', error)
    }
  }

  const columns = [
    {
      header: 'Name',
      accessor: 'name',
    },
    {
      header: 'Pay Period',
      accessor: (row) =>
        `${formatDate(row.payPeriodStart)} - ${formatDate(row.payPeriodEnd)}`,
    },
    {
      header: 'Pay Date',
      accessor: 'payDate',
      cell: (row) => formatDate(row.payDate),
    },
    {
      header: 'Employees',
      accessor: 'totalEmployees',
    },
    {
      header: 'Total Amount',
      accessor: 'totalAmount',
      cell: (row) => formatCurrency(row.totalAmount),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => (
        <span
          className={`rounded-full px-2 py-1 text-xs ${
            row.status === 'completed'
              ? 'bg-green-100 text-green-800'
              : row.status === 'processing'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePreview(row.id)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {row.status === 'draft' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleProcess(row.id)}
            >
              <Play className="h-4 w-4" />
            </Button>
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
          <p className="text-muted-foreground">Manage payroll and payruns</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Payrun
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Payrun</DialogTitle>
              <DialogDescription>
                Create a new payrun for processing payroll
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Payrun Name</Label>
                <Input
                  id="name"
                  {...register('name')}
                  aria-invalid={errors.name ? 'true' : 'false'}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payPeriodStart">Pay Period Start</Label>
                  <Input
                    id="payPeriodStart"
                    type="date"
                    {...register('payPeriodStart')}
                    aria-invalid={errors.payPeriodStart ? 'true' : 'false'}
                  />
                  {errors.payPeriodStart && (
                    <p className="text-sm text-destructive">
                      {errors.payPeriodStart.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payPeriodEnd">Pay Period End</Label>
                  <Input
                    id="payPeriodEnd"
                    type="date"
                    {...register('payPeriodEnd')}
                    aria-invalid={errors.payPeriodEnd ? 'true' : 'false'}
                  />
                  {errors.payPeriodEnd && (
                    <p className="text-sm text-destructive">
                      {errors.payPeriodEnd.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payDate">Pay Date</Label>
                <Input
                  id="payDate"
                  type="date"
                  {...register('payDate')}
                  aria-invalid={errors.payDate ? 'true' : 'false'}
                />
                {errors.payDate && (
                  <p className="text-sm text-destructive">
                    {errors.payDate.message}
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
                <Button type="submit">Create Payrun</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payruns</CardTitle>
          <CardDescription>
            View and manage all payruns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={payruns}
            columns={columns}
            searchable
            searchPlaceholder="Search payruns..."
            paginated
            pageSize={10}
          />
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payrun Preview</DialogTitle>
            <DialogDescription>
              Preview payslips for this payrun
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
                  <p className="text-sm font-medium">{selectedPayrun.status}</p>
                </div>
                <div>
                  <Label>Total Employees</Label>
                  <p className="text-sm font-medium">
                    {selectedPayrun.totalEmployees}
                  </p>
                </div>
                <div>
                  <Label>Total Amount</Label>
                  <p className="text-sm font-medium">
                    {formatCurrency(selectedPayrun.totalAmount)}
                  </p>
                </div>
              </div>
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

