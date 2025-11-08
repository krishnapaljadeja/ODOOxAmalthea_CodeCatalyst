import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Save, User, Clock, Calendar, DollarSign, Settings, Upload, Eye, Pencil } from 'lucide-react'
import apiClient from '../lib/api'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuthStore } from '../store/auth'
import DataTable from '../components/DataTable'
import { formatDate, formatTime, formatCurrency } from '../lib/format'
import PasswordModal from '../components/PasswordModal'

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
})

const emergencyContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  phone: z.string().min(1, 'Phone is required'),
})

/**
 * Profile page component with tabs
 * Tabs: Profile, Attendance, Leaves, Payroll (admin/payroll only), Settings
 */
export default function Profile() {
  const { user, updateUser } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [attendance, setAttendance] = useState([])
  const [leaves, setLeaves] = useState([])
  const [salaryInfo, setSalaryInfo] = useState(null)
  const [documents, setDocuments] = useState([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(profileSchema),
  })

  const {
    register: registerEmergency,
    handleSubmit: handleSubmitEmergency,
    formState: { errors: emergencyErrors },
    reset: resetEmergency,
  } = useForm({
    resolver: zodResolver(emergencyContactSchema),
  })

  const isAdminOrPayroll = ['admin', 'hr'].includes(user?.role)

  useEffect(() => {
    if (user) {
      fetchProfileData()
      if (activeTab === 'attendance') {
        fetchAttendance()
      } else if (activeTab === 'leaves') {
        fetchLeaves()
      } else if (activeTab === 'payroll' && isAdminOrPayroll) {
        fetchSalaryInfo()
      }
    }
  }, [user, activeTab])

  const fetchProfileData = async () => {
    try {
      const response = await apiClient.get('/profile')
      const profileData = response.data
      reset({
        firstName: profileData.firstName || user?.firstName || '',
        lastName: profileData.lastName || user?.lastName || '',
        email: profileData.email || user?.email || '',
        phone: profileData.phone || user?.phone || '',
        address: profileData.address || '',
        dateOfBirth: profileData.dateOfBirth || '',
        gender: profileData.gender || '',
      })
      if (profileData.emergencyContact) {
        resetEmergency(profileData.emergencyContact)
      }
      if (profileData.documents) {
        setDocuments(profileData.documents)
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      // Use user data from store
      reset({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phone: user?.phone || '',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendance = async () => {
    try {
      const response = await apiClient.get('/attendance')
      setAttendance(response.data)
    } catch (error) {
      console.error('Failed to fetch attendance:', error)
    }
  }

  const fetchLeaves = async () => {
    try {
      const response = await apiClient.get('/leaves')
      setLeaves(response.data)
    } catch (error) {
      console.error('Failed to fetch leaves:', error)
    }
  }

  const fetchSalaryInfo = async () => {
    try {
      const response = await apiClient.get('/profile/salary')
      setSalaryInfo(response.data)
    } catch (error) {
      console.error('Failed to fetch salary info:', error)
      // Use mock data
      setSalaryInfo({
        basicSalary: 125000,
        hra: 25000,
        conveyance: 10000,
        medicalAllowance: 10000,
        specialAllowance: 5000,
        grossSalary: 175000,
        pf: 3700,
        esi: 0,
        professionalTax: 200,
        netSalary: 171100,
      })
    }
  }

  const onSubmit = async (data) => {
    try {
      const response = await apiClient.put('/profile', data)
      updateUser(response.data)
      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Failed to update profile:', error)
    }
  }

  const onEmergencySubmit = async (data) => {
    try {
      await apiClient.put('/profile/emergency-contact', data)
      toast.success('Emergency contact updated successfully')
    } catch (error) {
      console.error('Failed to update emergency contact:', error)
    }
  }

  const handleDocumentUpload = async (file) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await apiClient.post('/profile/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      setDocuments([...documents, response.data])
      toast.success('Document uploaded successfully')
    } catch (error) {
      console.error('Failed to upload document:', error)
      toast.error('Failed to upload document')
    }
  }

  const attendanceColumns = [
    {
      header: 'Date',
      accessor: 'date',
      cell: (row) => formatDate(row.date),
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

  const leavesColumns = [
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
  ]

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">Manage your profile information</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leaves">Leaves</TabsTrigger>
          {isAdminOrPayroll && (
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
          )}
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your personal information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={`${user.firstName} ${user.lastName}`}
                        className="h-full w-full rounded-full"
                      />
                    ) : (
                      <span>
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    {user?.firstName} {user?.lastName}
                  </h2>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Employee ID</Label>
                    <Input
                      id="employeeId"
                      value={user?.employeeId || user?.id || ''}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      aria-invalid={errors.email ? 'true' : 'false'}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      {...register('firstName')}
                      aria-invalid={errors.firstName ? 'true' : 'false'}
                    />
                    {errors.firstName && (
                      <p className="text-sm text-destructive">
                        {errors.firstName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      {...register('lastName')}
                      aria-invalid={errors.lastName ? 'true' : 'false'}
                    />
                    {errors.lastName && (
                      <p className="text-sm text-destructive">
                        {errors.lastName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      {...register('phone')}
                      aria-invalid={errors.phone ? 'true' : 'false'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      {...register('dateOfBirth')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Input
                      id="gender"
                      {...register('gender')}
                      placeholder="Male/Female/Other"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={user?.department || ''}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="designation">Designation</Label>
                    <Input
                      id="designation"
                      value={user?.position || ''}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfJoining">Date of Joining</Label>
                    <Input
                      id="dateOfJoining"
                      value={user?.hireDate ? formatDate(user.hireDate) : ''}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    {...register('address')}
                    placeholder="Enter your address"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPasswordModalOpen(true)}
                  >
                    Change Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Documents Section */}
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Upload and manage your documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('document-upload')?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
                <input
                  id="document-upload"
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleDocumentUpload(file)
                  }}
                />
                <Button variant="outline">
                  <Eye className="mr-2 h-4 w-4" />
                  View Documents
                </Button>
              </div>
              {documents.length > 0 && (
                <div className="space-y-2">
                  {documents.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(doc.uploadedAt)}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emergency Contact Section */}
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
              <CardDescription>
                Update your emergency contact information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitEmergency(onEmergencySubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyName">Name</Label>
                    <Input
                      id="emergencyName"
                      {...registerEmergency('name')}
                      aria-invalid={emergencyErrors.name ? 'true' : 'false'}
                    />
                    {emergencyErrors.name && (
                      <p className="text-sm text-destructive">
                        {emergencyErrors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyRelationship">Relationship</Label>
                    <Input
                      id="emergencyRelationship"
                      {...registerEmergency('relationship')}
                      placeholder="e.g., Spouse, Parent"
                      aria-invalid={emergencyErrors.relationship ? 'true' : 'false'}
                    />
                    {emergencyErrors.relationship && (
                      <p className="text-sm text-destructive">
                        {emergencyErrors.relationship.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyPhone">Phone</Label>
                    <Input
                      id="emergencyPhone"
                      type="tel"
                      {...registerEmergency('phone')}
                      aria-invalid={emergencyErrors.phone ? 'true' : 'false'}
                    />
                    {emergencyErrors.phone && (
                      <p className="text-sm text-destructive">
                        {emergencyErrors.phone.message}
                      </p>
                    )}
                  </div>
                </div>
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" />
                  Save Emergency Contact
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Attendance History
              </CardTitle>
              <CardDescription>
                View your attendance records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={attendance}
                columns={attendanceColumns}
                searchable
                searchPlaceholder="Search attendance..."
                paginated
                pageSize={10}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Leave History
              </CardTitle>
              <CardDescription>
                View your leave requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={leaves}
                columns={leavesColumns}
                searchable
                searchPlaceholder="Search leaves..."
                paginated
                pageSize={10}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {isAdminOrPayroll && (
          <TabsContent value="payroll" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Salary Info
                </CardTitle>
                <CardDescription>
                  Salary info tab should only be visible to the admin/payroll officer.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {salaryInfo && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Basic Salary</Label>
                        <p className="text-lg font-semibold">
                          {formatCurrency(salaryInfo.basicSalary)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>HRA</Label>
                        <p className="text-lg font-semibold">
                          {formatCurrency(salaryInfo.hra)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Conveyance</Label>
                        <p className="text-lg font-semibold">
                          {formatCurrency(salaryInfo.conveyance)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Medical Allowance</Label>
                        <p className="text-lg font-semibold">
                          {formatCurrency(salaryInfo.medicalAllowance)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Special Allowance</Label>
                        <p className="text-lg font-semibold">
                          {formatCurrency(salaryInfo.specialAllowance)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Gross Salary</Label>
                        <p className="text-lg font-semibold text-primary">
                          {formatCurrency(salaryInfo.grossSalary)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>PF</Label>
                        <p className="text-lg font-semibold">
                          {formatCurrency(salaryInfo.pf)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>ESI</Label>
                        <p className="text-lg font-semibold">
                          {formatCurrency(salaryInfo.esi)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Professional Tax</Label>
                        <p className="text-lg font-semibold">
                          {formatCurrency(salaryInfo.professionalTax)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Net Salary</Label>
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(salaryInfo.netSalary)}
                        </p>
                      </div>
                    </div>
                    <Button>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Account Settings
              </CardTitle>
              <CardDescription>
                Manage your account settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  variant="outline"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="w-full"
                >
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Password Modal */}
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  )
}
