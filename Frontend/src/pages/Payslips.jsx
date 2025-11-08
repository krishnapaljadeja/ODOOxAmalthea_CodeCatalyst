import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog'
import DataTable from '../components/DataTable'
import { Eye, Download } from 'lucide-react'
import apiClient from '../lib/api'
import { formatDate, formatCurrency } from '../lib/format'
import PayslipViewer from '../components/PayslipViewer'
import { toast } from 'sonner'

export default function Payslips() {
  const navigate = useNavigate()
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPayslip, setSelectedPayslip] = useState(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)

  useEffect(() => {
    fetchPayslips()
  }, [])

  const fetchPayslips = async () => {
    try {
      const response = await apiClient.get('/payslips')
      setPayslips(response.data)
    } catch (error) {
      console.error('Failed to fetch payslips:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleView = (payslipId) => {
    // Navigate to detailed payslip view
    navigate(`/payslips/${payslipId}`)
  }

  const handleDownload = async (payslipId) => {
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

  const columns = [
    {
      header: 'Employee',
      accessor: 'employeeName',
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
      header: 'Gross Pay',
      accessor: 'grossPay',
      cell: (row) => formatCurrency(row.grossPay),
    },
    {
      header: 'Deductions',
      accessor: 'totalDeductions',
      cell: (row) => formatCurrency(row.totalDeductions),
    },
    {
      header: 'Net Pay',
      accessor: 'netPay',
      cell: (row) => (
        <span className="font-semibold">{formatCurrency(row.netPay)}</span>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleView(row.id)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDownload(row.id)}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payslips</h1>
        <p className="text-muted-foreground">View and download your payslips</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Payslips</CardTitle>
          <CardDescription>
            View and download your payslip history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={payslips}
            columns={columns}
            searchable
            searchPlaceholder="Search payslips..."
            paginated
            pageSize={10}
          />
        </CardContent>
      </Card>

      {/* Payslip Viewer Dialog */}
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payslip</DialogTitle>
            <DialogDescription>
              View and download your payslip
            </DialogDescription>
          </DialogHeader>
          {selectedPayslip && (
            <PayslipViewer
              payslip={selectedPayslip}
              onDownload={() => handleDownload(selectedPayslip.id)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

