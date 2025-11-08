import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Save } from 'lucide-react'
import apiClient from '../lib/api'
import { toast } from 'sonner'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuthStore } from '../store/auth'

/**
 * User Settings page component
 * Accessible only to Admin
 * Allows assigning user access rights based on modules and roles
 */
export default function UserSettings() {
  const { user } = useAuthStore()
  const [users, setUsers] = useState([])
  const [modules, setModules] = useState([
    'Employees',
    'Attendance',
    'Time Off',
    'Payroll',
    'Reports',
    'Settings',
  ])
  const [userRoles, setUserRoles] = useState({}) // { userId: { module: role } }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
    fetchUserRoles()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/users')
      setUsers(response.data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserRoles = async () => {
    try {
      const response = await apiClient.get('/user-settings/roles')
      setUserRoles(response.data)
    } catch (error) {
      console.error('Failed to fetch user roles:', error)
    }
  }

  const handleRoleChange = (userId, module, role) => {
    setUserRoles((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [module]: role,
      },
    }))
  }

  const handleSave = async () => {
    try {
      await apiClient.put('/user-settings/roles', userRoles)
      toast.success('User access rights updated successfully')
    } catch (error) {
      console.error('Failed to save user roles:', error)
      toast.error('Failed to save user access rights')
    }
  }

  const getRoleForUserModule = (userId, module) => {
    return userRoles[userId]?.[module] || ''
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">User Setting</h1>
          <p className="text-muted-foreground">
            In the Admin Settings, the administrator can assign user access
            rights based on each user's role.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Access rights can be configured on a module basis, allowing specific
            permissions for each module.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Access Rights</CardTitle>
            <CardDescription>
              Select user access rights as per their role and responsibilities.
              These access rights define what users are allowed to access and
              what they are restricted from accessing.
            </CardDescription>
            <CardDescription className="mt-2">
              Example roles: Employee / Admin / HR Officer / Payroll Officer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-48">Module</TableHead>
                      {users.map((user) => (
                        <TableHead key={user.id} className="min-w-[200px]">
                          <div className="space-y-1">
                            <p className="font-semibold">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {user.email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Login ID: {user.email}
                            </p>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modules.map((module) => (
                      <TableRow key={module}>
                        <TableCell className="font-medium">{module}</TableCell>
                        {users.map((user) => (
                          <TableCell key={user.id}>
                            <Select
                              value={getRoleForUserModule(user.id, module)}
                              onValueChange={(value) =>
                                handleRoleChange(user.id, module, value)
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="employee">Employee</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="hr">HR Officer</SelectItem>
                                <SelectItem value="payroll">
                                  Payroll Officer
                                </SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="none">No Access</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}

