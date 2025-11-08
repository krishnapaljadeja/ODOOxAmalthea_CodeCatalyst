import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Mail, Lock, Send, Edit2, Eye, EyeOff, Search } from "lucide-react";
import apiClient from "../lib/api";
import { toast } from "sonner";
import { useAuthStore } from "../store/auth";
import ProtectedRoute from "../components/ProtectedRoute";

/**
 * Admin Settings page component
 * Allows admin to manage user credentials and send login information via email
 */
export default function AdminSettings() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(null);
  const [editingPassword, setEditingPassword] = useState(null);
  const [showPasswords, setShowPasswords] = useState({});
  const [passwords, setPasswords] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get("/admin/users");
      const usersData = response.data?.data || response.data || [];
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      // Fallback: try to get from employees endpoint
      try {
        const response = await apiClient.get("/employees");
        const employeesData = response.data?.data || response.data || [];
        const userMap = new Map();
        employeesData.forEach((emp) => {
          if (emp.user && !userMap.has(emp.user.id)) {
            userMap.set(emp.user.id, {
              id: emp.user.id,
              email: emp.user.email,
              employeeId: emp.user.employeeId || emp.employeeId,
              firstName: emp.user.firstName || emp.firstName,
              lastName: emp.user.lastName || emp.lastName,
              password: "••••••••", // Masked password
            });
          }
        });
        setUsers(Array.from(userMap.values()));
      } catch (err) {
        console.error("Failed to fetch users from employees:", err);
        setUsers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendCredentials = async (userId) => {
    setSendingEmail(userId);
    try {
      await apiClient.post(`/admin/users/${userId}/send-credentials`);
      toast.success("Login credentials sent successfully via email");
    } catch (error) {
      console.error("Failed to send credentials:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to send login credentials. Please try again.";
      toast.error(errorMessage);
    } finally {
      setSendingEmail(null);
    }
  };

  const handleEditPassword = (userId) => {
    setEditingPassword(userId);
    setPasswords((prev) => ({
      ...prev,
      [userId]: "",
    }));
  };

  const handleSavePassword = async (userId) => {
    const newPassword = passwords[userId];
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    try {
      await apiClient.put(`/admin/users/${userId}/password`, {
        password: newPassword,
      });
      toast.success("Password updated successfully");
      setEditingPassword(null);
      setPasswords((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    } catch (error) {
      console.error("Failed to update password:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to update password. Please try again.";
      toast.error(errorMessage);
    }
  };

  const handleCancelEdit = (userId) => {
    setEditingPassword(null);
    setPasswords((prev) => {
      const updated = { ...prev };
      delete updated[userId];
      return updated;
    });
    setShowPasswords((prev) => {
      const updated = { ...prev };
      delete updated[userId];
      return updated;
    });
  };

  const toggleShowPassword = (userId) => {
    setShowPasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // Filter users based on search term
  const filteredUsers = users.filter((userItem) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      userItem.email?.toLowerCase().includes(searchLower) ||
      userItem.employeeId?.toLowerCase().includes(searchLower) ||
      `${userItem.firstName || ""} ${userItem.lastName || ""}`
        .toLowerCase()
        .includes(searchLower) ||
      userItem.role?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading users...</p>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Settings</h1>
          <p className="text-muted-foreground">
            Manage user credentials and send login information
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Password Management</CardTitle>
            <CardDescription>
              Manage user passwords and send login credentials via email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> User should receive an email with their
                Login ID and password.
              </p>
            </div>

            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by email, login ID, name, or role..."
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
                    <TableHead className="w-20">Avatar</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Login ID</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        {users.length === 0
                          ? "No users found"
                          : "No users match your search"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((userItem) => (
                      <TableRow key={userItem.id}>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground text-xl font-bold overflow-hidden flex items-center justify-center">
                              {userItem.avatar ? (
                                <img
                                  src={userItem.avatar}
                                  alt={`${userItem.firstName} ${userItem.lastName}`}
                                  className="h-full w-full rounded-full object-cover"
                                />
                              ) : (
                                <span>
                                  {userItem.firstName?.[0] || ""}
                                  {userItem.lastName?.[0] || ""}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {userItem.email}
                        </TableCell>
                        <TableCell>
                          {userItem.employeeId || userItem.email}
                        </TableCell>
                        <TableCell>
                          {editingPassword === userItem.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type={
                                  showPasswords[userItem.id]
                                    ? "text"
                                    : "password"
                                }
                                value={passwords[userItem.id] || ""}
                                onChange={(e) =>
                                  setPasswords((prev) => ({
                                    ...prev,
                                    [userItem.id]: e.target.value,
                                  }))
                                }
                                placeholder="Enter new password"
                                className="w-48"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleShowPassword(userItem.id)}
                                title={
                                  showPasswords[userItem.id]
                                    ? "Hide password"
                                    : "Show password"
                                }
                              >
                                {showPasswords[userItem.id] ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSavePassword(userItem.id)}
                              >
                                Save
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelEdit(userItem.id)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-mono">••••••••</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditPassword(userItem.id)}
                                title="Edit Password"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendCredentials(userItem.id)}
                            disabled={
                              sendingEmail === userItem.id ||
                              editingPassword === userItem.id
                            }
                          >
                            {sendingEmail === userItem.id ? (
                              <>
                                <Mail className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="mr-2 h-4 w-4" />
                                Send Mail
                              </>
                            )}
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

        {/* <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Change password mechanism for administrators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Make sure the employee receives the password through email or another digital method.
              The password change mechanism should be different for administrators and regular users.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                // Navigate to change password page
                window.location.href = '/change-password'
              }}
            >
              <Lock className="mr-2 h-4 w-4" />
              Change Password
            </Button>
          </CardContent>
        </Card> */}
      </div>
    </ProtectedRoute>
  );
}
