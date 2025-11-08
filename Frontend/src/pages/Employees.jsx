import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Plus, Upload, Download, Search, Plane, Save } from "lucide-react";
import apiClient from "../lib/api";
import { formatDate, formatPhone, formatCurrency } from "../lib/format";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuthStore } from "../store/auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const employeeSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  department: z.string().min(1, "Department is required"),
  position: z.string().min(1, "Position is required"),
  salary: z.number().min(0, "Salary must be positive"),
  hireDate: z.string().min(1, "Hire date is required"),
  role: z.enum(["admin", "hr", "manager", "employee"]).optional(),
  // Company name is automatically inherited from the logged-in admin/hr
});

/**
 * Employees page component
 */
export default function Employees() {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [todayLeaves, setTodayLeaves] = useState([]);
  const [employeeSalaryInfo, setEmployeeSalaryInfo] = useState(null);
  const [employeeViewTab, setEmployeeViewTab] = useState("details");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      role: "employee",
    },
  });

  const selectedRole = watch("role");

  useEffect(() => {
    fetchEmployees();
    fetchTodayData();
  }, []);

  const fetchTodayData = async () => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      // Fetch today's attendance
      const attendanceResponse = await apiClient.get(
        `/attendance?date=${todayStr}`
      );
      const attendanceData =
        attendanceResponse.data?.data || attendanceResponse.data || [];
      setTodayAttendance(Array.isArray(attendanceData) ? attendanceData : []);

      // Fetch today's leaves (approved leaves that include today)
      const leavesResponse = await apiClient.get("/leaves");
      const leavesData = leavesResponse.data?.data || leavesResponse.data || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayLeavesList = Array.isArray(leavesData)
        ? leavesData.filter((leave) => {
            // Leave dates are in YYYY-MM-DD format (strings)
            const startDate = new Date(leave.startDate + "T00:00:00.000Z");
            const endDate = new Date(leave.endDate + "T23:59:59.999Z");
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);
            return (
              leave.status === "approved" &&
              today >= startDate &&
              today <= endDate
            );
          })
        : [];
      setTodayLeaves(todayLeavesList);
    } catch (error) {
      console.error("Failed to fetch today's data:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await apiClient.get("/employees");
      const employeesData = response.data?.data || response.data || [];
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      // Clean up the data before sending
      const payload = {
        ...data,
        // Convert empty string to undefined for optional fields
        phone: data.phone && data.phone.trim() !== "" ? data.phone : undefined,
        // Ensure salary is a valid number
        salary:
          typeof data.salary === "number" && !isNaN(data.salary)
            ? data.salary
            : parseFloat(data.salary) || 0,
      };

      await apiClient.post("/employees", payload);
      toast.success("Employee created successfully");
      setIsCreateOpen(false);
      reset();
      await fetchEmployees();
      fetchTodayData();
    } catch (error) {
      console.error("Failed to create employee:", error);
      console.error("Error response:", error.response?.data);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.message ||
        error.response?.data?.error ||
        "Failed to create employee. Please check all fields.";
      toast.error(errorMessage);
    }
  };

  const handleViewEmployee = async (employee) => {
    setSelectedEmployee(employee);
    setIsViewOpen(true);
    // Fetch salary info if admin/payroll
    if (['admin', 'hr'].includes(user?.role) && employee.id) {
      try {
        const response = await apiClient.get(`/employees/${employee.id}/salary`);
        setEmployeeSalaryInfo(response.data?.data || response.data);
      } catch (error) {
        console.error('Failed to fetch salary info:', error);
        // Use mock data for now
        setEmployeeSalaryInfo({
          basicSalary: employee.salary * 0.5 || 25000,
          hra: employee.salary * 0.25 || 12500,
          conveyance: employee.salary * 0.1 || 5000,
          medicalAllowance: employee.salary * 0.1 || 5000,
          specialAllowance: employee.salary * 0.05 || 2500,
          grossSalary: employee.salary || 50000,
          pf: (employee.salary * 0.5 || 25000) * 0.12 || 3000,
          esi: 0,
          professionalTax: 200,
          netSalary: (employee.salary || 50000) - 3200,
        });
      }
    }
  };

  const handleImport = async (file) => {
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiClient.post("/employees/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      // Backend returns { status: 'success', data: { count, ... } } or direct data
      const count = response.data?.count || response.data?.data?.count || 0;
      toast.success(`Successfully imported ${count} employees`);
      fetchEmployees();
    } catch (error) {
      console.error("Failed to import employees:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to import employees. Please check the file format.";
      toast.error(errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await apiClient.get("/employees/export", {
        responseType: "blob",
      });
      // Handle both blob and text responses
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `employees-${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Employees exported successfully");
    } catch (error) {
      console.error("Failed to export employees:", error);
      toast.error("Failed to export employees");
    }
  };

  const handleDownloadSample = () => {
    const sampleData = `First Name,Last Name,Email,Phone,Department,Position,Salary,Hire Date
John,Smith,john.smith@example.com,+1234567890,Engineering,Software Engineer,75000,2025-01-15
Sarah,Johnson,sarah.johnson@example.com,+1234567891,Marketing,Marketing Manager,85000,2025-01-20
Michael,Williams,michael.williams@example.com,+1234567892,Sales,Sales Representative,60000,2025-02-01`;
    const blob = new Blob([sampleData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "employee-import-sample.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    toast.success("Sample template downloaded");
  };

  // Get employee status (present, on leave, or absent)
  const getEmployeeStatus = (employee) => {
    // Check if employee is on leave today
    // Leave.employeeId is the Employee's database ID
    const onLeave = todayLeaves.some(
      (leave) =>
        leave.employeeId === employee.id ||
        (leave.employee && leave.employee.id === employee.id) ||
        (employee.userId && leave.userId === employee.userId)
    );
    if (onLeave) return "on-leave";

    // Check if employee is present today
    // Attendance.employeeId is the Employee's database ID
    const attendance = todayAttendance.find(
      (att) =>
        att.employeeId === employee.id ||
        (att.employee && att.employee.id === employee.id) ||
        (att.employee && att.employee.employeeId === employee.employeeId)
    );

    if (attendance && attendance.checkIn && !attendance.checkOut) {
      return "present"; // Checked in but not checked out
    }
    if (attendance && attendance.checkIn && attendance.checkOut) {
      return "checked-out"; // Checked in and checked out
    }
    if (
      attendance &&
      (attendance.status === "present" || attendance.status === "late")
    ) {
      return "present";
    }

    // Otherwise, absent
    return "absent";
  };

  // Filter employees based on search term
  const filteredEmployees = employees.filter((employee) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      `${employee.firstName} ${employee.lastName}`
        .toLowerCase()
        .includes(searchLower) ||
      employee.email?.toLowerCase().includes(searchLower) ||
      employee.employeeId?.toLowerCase().includes(searchLower) ||
      employee.department?.toLowerCase().includes(searchLower) ||
      employee.position?.toLowerCase().includes(searchLower)
    );
  });

  // Render status indicator
  const renderStatusIndicator = (status) => {
    switch (status) {
      case "present":
        return (
          <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
        );
      case "on-leave":
        return (
          <div className="absolute top-2 right-2">
            <Plane className="w-4 h-4 text-blue-500" />
          </div>
        );
      case "absent":
        return (
          <div className="absolute top-2 right-2 w-3 h-3 bg-yellow-500 rounded-full border-2 border-white shadow-sm"></div>
        );
      case "checked-out":
        return (
          <div className="absolute top-2 right-2 w-3 h-3 bg-gray-400 rounded-full border-2 border-white shadow-sm"></div>
        );
      default:
        return (
          <div className="absolute top-2 right-2 w-3 h-3 bg-yellow-500 rounded-full border-2 border-white shadow-sm"></div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage your employees</p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={isImporting}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                document.getElementById("employee-import")?.click()
              }
              disabled={isImporting}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isImporting ? "Importing..." : "Import"}
            </Button>
            <input
              id="employee-import"
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
              }}
            />
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Employee</DialogTitle>
                  <DialogDescription>
                    Fill in the details to create a new employee record.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        {...register("firstName")}
                        aria-invalid={errors.firstName ? "true" : "false"}
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
                        {...register("lastName")}
                        aria-invalid={errors.lastName ? "true" : "false"}
                      />
                      {errors.lastName && (
                        <p className="text-sm text-destructive">
                          {errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email")}
                      aria-invalid={errors.email ? "true" : "false"}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      {...register("phone")}
                      aria-invalid={errors.phone ? "true" : "false"}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        {...register("department")}
                        aria-invalid={errors.department ? "true" : "false"}
                      />
                      {errors.department && (
                        <p className="text-sm text-destructive">
                          {errors.department.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        {...register("position")}
                        aria-invalid={errors.position ? "true" : "false"}
                      />
                      {errors.position && (
                        <p className="text-sm text-destructive">
                          {errors.position.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="salary">Salary</Label>
                      <Input
                        id="salary"
                        type="number"
                        {...register("salary", { valueAsNumber: true })}
                        aria-invalid={errors.salary ? "true" : "false"}
                      />
                      {errors.salary && (
                        <p className="text-sm text-destructive">
                          {errors.salary.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hireDate">Hire Date</Label>
                      <Input
                        id="hireDate"
                        type="date"
                        {...register("hireDate")}
                        aria-invalid={errors.hireDate ? "true" : "false"}
                      />
                      {errors.hireDate && (
                        <p className="text-sm text-destructive">
                          {errors.hireDate.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={selectedRole || "employee"}
                      onValueChange={(value) => setValue("role", value)}
                    >
                      <SelectTrigger
                        id="role"
                        aria-invalid={errors.role ? "true" : "false"}
                      >
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.role && (
                      <p className="text-sm text-destructive">
                        {errors.role.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Select the role for this employee. They will receive login
                      credentials via email.
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
                    <Button type="submit">Create Employee</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={handleDownloadSample}
              className="hover:text-foreground underline"
            >
              Download Sample Template
            </button>
          </div>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Employee List</CardTitle>
            <CardDescription>
              View and manage all employees in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees by name, email, ID, department, or position..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Employee Cards Grid */}
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading employees...
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm
                  ? "No employees found matching your search."
                  : "No employees found."}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredEmployees.map((employee) => {
                  const status = getEmployeeStatus(employee);
                  const fullName = `${employee.firstName} ${employee.lastName}`;
                  const initials = `${employee.firstName?.[0] || ""}${
                    employee.lastName?.[0] || ""
                  }`.toUpperCase();

                  return (
                    <div
                      key={employee.id}
                      className="relative border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white"
                      onClick={() => handleViewEmployee(employee)}
                    >
                      {/* Status Indicator */}
                      {renderStatusIndicator(status)}

                      {/* Profile Picture */}
                      <div className="flex justify-center mb-3">
                        {employee.avatar || employee.user?.avatar ? (
                          <img
                            src={employee.avatar || employee.user?.avatar}
                            alt={fullName}
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-gray-200">
                            <span className="text-lg font-semibold text-primary">
                              {initials}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Employee Name */}
                      <h3 className="text-center font-semibold text-lg mb-1">
                        {fullName}
                      </h3>

                      {/* Employee Details */}
                      <div className="text-center text-sm text-muted-foreground space-y-1">
                        {employee.position && (
                          <p className="truncate">{employee.position}</p>
                        )}
                        {employee.department && (
                          <p className="truncate">{employee.department}</p>
                        )}
                        {employee.employeeId && (
                          <p className="text-xs mt-2">
                            ID: {employee.employeeId}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Employee Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Employee Details</DialogTitle>
              <DialogDescription>
                View and manage employee information
              </DialogDescription>
            </DialogHeader>
            {selectedEmployee && (
              <Tabs value={employeeViewTab} onValueChange={setEmployeeViewTab} className="space-y-4">
                <TabsList>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  {['admin', 'hr'].includes(user?.role) && (
                    <TabsTrigger value="salary">Salary Info</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Employee ID</Label>
                      <p className="text-sm font-medium">
                        {selectedEmployee.employeeId}
                      </p>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <p className="text-sm font-medium">
                        {selectedEmployee.status}
                      </p>
                    </div>
                    <div>
                      <Label>First Name</Label>
                      <p className="text-sm font-medium">
                        {selectedEmployee.firstName}
                      </p>
                    </div>
                    <div>
                      <Label>Last Name</Label>
                      <p className="text-sm font-medium">
                        {selectedEmployee.lastName}
                      </p>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <p className="text-sm font-medium">
                        {selectedEmployee.email}
                      </p>
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <p className="text-sm font-medium">
                        {formatPhone(selectedEmployee.phone)}
                      </p>
                    </div>
                    <div>
                      <Label>Department</Label>
                      <p className="text-sm font-medium">
                        {selectedEmployee.department}
                      </p>
                    </div>
                    <div>
                      <Label>Position</Label>
                      <p className="text-sm font-medium">
                        {selectedEmployee.position}
                      </p>
                    </div>
                    <div>
                      <Label>Hire Date</Label>
                      <p className="text-sm font-medium">
                        {formatDate(selectedEmployee.hireDate)}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {['admin', 'hr'].includes(user?.role) && (
                  <TabsContent value="salary" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Salary Information</CardTitle>
                        <CardDescription>
                          View and update employee salary details
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {employeeSalaryInfo ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Basic Salary</Label>
                                <Input
                                  type="number"
                                  value={employeeSalaryInfo.basicSalary || 0}
                                  onChange={(e) => setEmployeeSalaryInfo({
                                    ...employeeSalaryInfo,
                                    basicSalary: parseFloat(e.target.value) || 0
                                  })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>HRA</Label>
                                <Input
                                  type="number"
                                  value={employeeSalaryInfo.hra || 0}
                                  onChange={(e) => setEmployeeSalaryInfo({
                                    ...employeeSalaryInfo,
                                    hra: parseFloat(e.target.value) || 0
                                  })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Conveyance</Label>
                                <Input
                                  type="number"
                                  value={employeeSalaryInfo.conveyance || 0}
                                  onChange={(e) => setEmployeeSalaryInfo({
                                    ...employeeSalaryInfo,
                                    conveyance: parseFloat(e.target.value) || 0
                                  })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Medical Allowance</Label>
                                <Input
                                  type="number"
                                  value={employeeSalaryInfo.medicalAllowance || 0}
                                  onChange={(e) => setEmployeeSalaryInfo({
                                    ...employeeSalaryInfo,
                                    medicalAllowance: parseFloat(e.target.value) || 0
                                  })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Special Allowance</Label>
                                <Input
                                  type="number"
                                  value={employeeSalaryInfo.specialAllowance || 0}
                                  onChange={(e) => setEmployeeSalaryInfo({
                                    ...employeeSalaryInfo,
                                    specialAllowance: parseFloat(e.target.value) || 0
                                  })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Gross Salary</Label>
                                <p className="text-lg font-semibold text-primary">
                                  {formatCurrency(
                                    (employeeSalaryInfo.basicSalary || 0) +
                                    (employeeSalaryInfo.hra || 0) +
                                    (employeeSalaryInfo.conveyance || 0) +
                                    (employeeSalaryInfo.medicalAllowance || 0) +
                                    (employeeSalaryInfo.specialAllowance || 0)
                                  )}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <Label>PF</Label>
                                <Input
                                  type="number"
                                  value={employeeSalaryInfo.pf || 0}
                                  onChange={(e) => setEmployeeSalaryInfo({
                                    ...employeeSalaryInfo,
                                    pf: parseFloat(e.target.value) || 0
                                  })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>ESI</Label>
                                <Input
                                  type="number"
                                  value={employeeSalaryInfo.esi || 0}
                                  onChange={(e) => setEmployeeSalaryInfo({
                                    ...employeeSalaryInfo,
                                    esi: parseFloat(e.target.value) || 0
                                  })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Professional Tax</Label>
                                <Input
                                  type="number"
                                  value={employeeSalaryInfo.professionalTax || 0}
                                  onChange={(e) => setEmployeeSalaryInfo({
                                    ...employeeSalaryInfo,
                                    professionalTax: parseFloat(e.target.value) || 0
                                  })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Net Salary</Label>
                                <p className="text-2xl font-bold text-primary">
                                  {formatCurrency(
                                    ((employeeSalaryInfo.basicSalary || 0) +
                                    (employeeSalaryInfo.hra || 0) +
                                    (employeeSalaryInfo.conveyance || 0) +
                                    (employeeSalaryInfo.medicalAllowance || 0) +
                                    (employeeSalaryInfo.specialAllowance || 0)) -
                                    ((employeeSalaryInfo.pf || 0) +
                                    (employeeSalaryInfo.esi || 0) +
                                    (employeeSalaryInfo.professionalTax || 0))
                                  )}
                                </p>
                              </div>
                            </div>
                            <Button
                              onClick={async () => {
                                try {
                                  await apiClient.put(`/employees/${selectedEmployee.id}/salary`, employeeSalaryInfo);
                                  toast.success('Salary information updated successfully');
                                  fetchEmployees();
                                } catch (error) {
                                  console.error('Failed to update salary:', error);
                                  toast.error('Failed to update salary information');
                                }
                              }}
                            >
                              <Save className="mr-2 h-4 w-4" />
                              Save Salary Info
                            </Button>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">Loading salary information...</p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
