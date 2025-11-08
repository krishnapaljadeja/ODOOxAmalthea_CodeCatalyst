import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import DataTable from '../components/DataTable'
import { LogIn, LogOut, Calendar, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import apiClient from '../lib/api'
import { formatDate, formatTime } from '../lib/format'
import { toast } from 'sonner'
import { useAuthStore } from '../store/auth'
import dayjs from 'dayjs'

/**
 * Attendance page component
 * Role-based views:
 * - Admin/HR/Payroll Officer: See all employees' attendance for selected day
 * - Employee: See own attendance for selected month with summary metrics
 */
export default function Attendance() {
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [todayAttendance, setTodayAttendance] = useState(null)
  const { user } = useAuthStore()

  // Admin view state
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [searchTerm, setSearchTerm] = useState('')

  // Employee view state
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [monthSummary, setMonthSummary] = useState(null)

  const isAdmin = ['admin', 'hr', 'manager'].includes(user?.role)

  useEffect(() => {
    if (isAdmin) {
      fetchAttendanceForDate(selectedDate)
    } else {
      fetchTodayAttendance()
      fetchAttendanceForMonth(selectedMonth)
      fetchMonthSummary(selectedMonth)
    }
  }, [isAdmin, selectedDate, selectedMonth])

  const fetchAttendanceForDate = async (date) => {
    try {
      const dateStr = dayjs(date).format('YYYY-MM-DD')
      const response = await apiClient.get(`/attendance?date=${dateStr}`)
      setAttendance(response.data)
    } catch (error) {
      console.error('Failed to fetch attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendanceForMonth = async (month) => {
    try {
      const startDate = dayjs(month).startOf('month').format('YYYY-MM-DD')
      const endDate = dayjs(month).endOf('month').format('YYYY-MM-DD')
      const response = await apiClient.get(
        `/attendance?startDate=${startDate}&endDate=${endDate}`
      )
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

  const fetchMonthSummary = async (month) => {
    try {
      const monthStr = dayjs(month).format('YYYY-MM')
      const response = await apiClient.get(`/attendance/summary?month=${monthStr}`)
      setMonthSummary(response.data)
    } catch (error) {
      console.error('Failed to fetch month summary:', error)
    }
  }

  const handleCheckIn = async () => {
    try {
      await apiClient.post('/attendance/check-in')
      toast.success('Checked in successfully')
      fetchTodayAttendance()
      fetchAttendanceForMonth(selectedMonth)
      fetchMonthSummary(selectedMonth)
    } catch (error) {
      console.error('Failed to check in:', error)
    }
  }

  const handleCheckOut = async () => {
    try {
      await apiClient.post('/attendance/check-out')
      toast.success('Checked out successfully')
      fetchTodayAttendance()
      fetchAttendanceForMonth(selectedMonth)
      fetchMonthSummary(selectedMonth)
    } catch (error) {
      console.error('Failed to check out:', error)
    }
  }

  const handleDateChange = (direction) => {
    const newDate = dayjs(selectedDate)
      .add(direction === 'next' ? 1 : -1, 'day')
      .toDate()
    setSelectedDate(newDate)
  }

  const handleMonthChange = (direction) => {
    const newMonth = dayjs(selectedMonth)
      .add(direction === 'next' ? 1 : -1, 'month')
      .toDate()
    setSelectedMonth(newMonth)
  }

  // Admin view columns
  const adminColumns = [
    {
      header: 'Emp',
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
      header: 'Work Hours',
      accessor: 'hoursWorked',
      cell: (row) => {
        if (!row.hoursWorked) return '-'
        const hours = Math.floor(row.hoursWorked)
        const minutes = Math.floor((row.hoursWorked - hours) * 60)
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      },
    },
    {
      header: 'Extra hours',
      accessor: 'extraHours',
      cell: (row) => {
        if (!row.extraHours) return '-'
        const hours = Math.floor(row.extraHours)
        const minutes = Math.floor((row.extraHours - hours) * 60)
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      },
    },
  ]

  // Employee view columns
  const employeeColumns = [
    {
      header: 'Date',
      accessor: 'date',
      cell: (row) => formatDate(row.date, 'DD/MM/YYYY'),
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
      header: 'Work Hours',
      accessor: 'hoursWorked',
      cell: (row) => {
        if (!row.hoursWorked) return '-'
        const hours = Math.floor(row.hoursWorked)
        const minutes = Math.floor((row.hoursWorked - hours) * 60)
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      },
    },
    {
      header: 'Extra hours',
      accessor: 'extraHours',
      cell: (row) => {
        if (!row.extraHours) return '-'
        const hours = Math.floor(row.extraHours)
        const minutes = Math.floor((row.extraHours - hours) * 60)
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      },
    },
  ]

  // Filter attendance based on search
  const filteredAttendance = isAdmin
    ? attendance.filter((record) =>
        searchTerm
          ? record.employeeName
              .toLowerCase()
              .includes(searchTerm.toLowerCase())
          : true
      )
    : attendance

  return (
    <div className="space-y-6">
      {/* NOTE Box */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm">
            <p className="font-semibold">NOTE</p>
            <p>
              If the employee's working source is based on the assigned
              attendance.
            </p>
            <p>
              On the Attendance page, users should see a day-wise attendance of
              themselves by default for ongoing month, displaying details based
              on their working time, including breaks.
            </p>
            <p>
              For Admins/Time off officers: They can see attendance of all the
              employees present on the current day.
            </p>
            <p>
              Attendance data serves as the basis for payslip generation.
            </p>
            <p>
              The system should use the generated attendance records to determine
              the total number of payable days for each employee.
            </p>
            <p>
              Any unpaid leave or missing attendance days should automatically
              reduce the number of payable days during payslip computation.
            </p>
          </div>
        </CardContent>
      </Card>

      {isAdmin ? (
        /* Admin/HR/Payroll Officer View */
        <Card>
          <CardHeader>
            <CardTitle>Attendances List view For Admin/HR Officer/Payroll Officer</CardTitle>
            <CardDescription>
              View attendance of all employees for selected day
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Date Navigation */}
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Searchbar"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDateChange('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Input
                  type="date"
                  value={dayjs(selectedDate).format('YYYY-MM-DD')}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="w-40"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDateChange('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline">Day</Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {dayjs(selectedDate).format('DD, MMMM YYYY')}
            </p>

            {/* Attendance Table */}
            <DataTable
              data={filteredAttendance}
              columns={adminColumns}
              searchable={false}
              paginated={false}
            />
          </CardContent>
        </Card>
      ) : (
        /* Employee View */
        <>
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

          {/* Monthly Attendance View */}
          <Card>
            <CardHeader>
              <CardTitle>For Employees</CardTitle>
              <CardDescription>
                View your attendance for the selected month
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Month Navigation */}
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleMonthChange('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Input
                  type="month"
                  value={dayjs(selectedMonth).format('YYYY-MM')}
                  onChange={(e) => setSelectedMonth(new Date(e.target.value))}
                  className="w-40"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleMonthChange('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Summary Metrics */}
              {monthSummary && (
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">
                        Count of days present
                      </p>
                      <p className="text-2xl font-bold">
                        {monthSummary.daysPresent || 0}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">
                        Leaves count
                      </p>
                      <p className="text-2xl font-bold">
                        {monthSummary.leavesCount || 0}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">
                        Total working days
                      </p>
                      <p className="text-2xl font-bold">
                        {monthSummary.totalWorkingDays || 0}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                {dayjs(selectedMonth).format('DD, MMMM YYYY')}
              </p>

              {/* Attendance Table */}
              <DataTable
                data={filteredAttendance}
                columns={employeeColumns}
                searchable={false}
                paginated={false}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
