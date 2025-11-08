import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import DataTable from '../components/DataTable'
import { LogIn, LogOut, Calendar } from 'lucide-react'
import apiClient from '../lib/api'
import { formatDate, formatTime } from '../lib/format'
import { toast } from 'sonner'
import { useAuthStore } from '../store/auth'

/**
 * Attendance page component
 */
export default function Attendance() {
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [todayAttendance, setTodayAttendance] = useState(null)
  const { user } = useAuthStore()

  useEffect(() => {
    fetchAttendance()
    fetchTodayAttendance()
  }, [])

  const fetchAttendance = async () => {
    try {
      const response = await apiClient.get('/attendance')
      setAttendance(response.data)
    } catch (error) {
      console.error('Failed to fetch attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTodayAttendance = async () => {
    try {
      const response = await apiClient.get('/attendance/today')
      setTodayAttendance(response.data)
    } catch (error) {
      console.error('Failed to fetch today attendance:', error)
    }
  }

  const handleCheckIn = async () => {
    try {
      await apiClient.post('/attendance/check-in')
      toast.success('Checked in successfully')
      fetchTodayAttendance()
      fetchAttendance()
    } catch (error) {
      console.error('Failed to check in:', error)
    }
  }

  const handleCheckOut = async () => {
    try {
      await apiClient.post('/attendance/check-out')
      toast.success('Checked out successfully')
      fetchTodayAttendance()
      fetchAttendance()
    } catch (error) {
      console.error('Failed to check out:', error)
    }
  }

  const columns = [
    {
      header: 'Date',
      accessor: 'date',
      cell: (row) => formatDate(row.date),
    },
    {
      header: 'Employee',
      accessor: 'employeeName',
    },
    {
      header: 'Check In',
      accessor: 'checkIn',
      cell: (row) => (row.checkIn ? formatTime(row.checkIn) : '-'),
    },
    {
      header: 'Check Out',
      accessor: 'checkOut',
      cell: (row) => (row.checkOut ? formatTime(row.checkOut) : '-'),
    },
    {
      header: 'Hours Worked',
      accessor: 'hoursWorked',
      cell: (row) => (row.hoursWorked ? `${row.hoursWorked}h` : '-'),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => (
        <span
          className={`rounded-full px-2 py-1 text-xs ${
            row.status === 'present'
              ? 'bg-green-100 text-green-800'
              : row.status === 'late'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {row.status}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Attendance</h1>
        <p className="text-muted-foreground">Track employee attendance</p>
      </div>

      {/* Today's Attendance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Today's Attendance
          </CardTitle>
          <CardDescription>
            Mark your attendance for today
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todayAttendance ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Check In</p>
                  <p className="text-lg font-semibold">
                    {todayAttendance.checkIn
                      ? formatTime(todayAttendance.checkIn)
                      : 'Not checked in'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check Out</p>
                  <p className="text-lg font-semibold">
                    {todayAttendance.checkOut
                      ? formatTime(todayAttendance.checkOut)
                      : 'Not checked out'}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                {!todayAttendance.checkIn && (
                  <Button onClick={handleCheckIn}>
                    <LogIn className="mr-2 h-4 w-4" />
                    Mark In
                  </Button>
                )}
                {todayAttendance.checkIn && !todayAttendance.checkOut && (
                  <Button onClick={handleCheckOut} variant="destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Mark Out
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <Button onClick={handleCheckIn}>
              <LogIn className="mr-2 h-4 w-4" />
              Mark In
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Attendance History */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
          <CardDescription>
            View attendance records for all employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={attendance}
            columns={columns}
            searchable
            searchPlaceholder="Search attendance..."
            paginated
            pageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  )
}

