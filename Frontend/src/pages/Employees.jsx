import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import DataTable from "../components/DataTable";
import { Plus, Eye, Edit, Upload, Download } from "lucide-react";
import apiClient from "../lib/api";
import { formatDate, formatPhone } from "../lib/format";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

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
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

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
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await apiClient.get("/employees");
      setEmployees(response.data);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
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
      fetchEmployees();
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

  const handleViewEmployee = (employee) => {
    setSelectedEmployee(employee);
    setIsViewOpen(true);
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

  const columns = [
    {
      header: "Employee ID",
      accessor: "employeeId",
    },
    {
      header: "Name",
      accessor: (row) => `${row.firstName} ${row.lastName}`,
    },
    {
      header: "Email",
      accessor: "email",
    },
    {
      header: "Department",
      accessor: "department",
    },
    {
      header: "Position",
      accessor: "position",
    },
    {
      header: "Status",
      accessor: "status",
      cell: (row) => (
        <span
          className={`rounded-full px-2 py-1 text-xs ${
            row.status === "active"
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewEmployee(row)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage your employees</p>
        </div>
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
            onClick={() => document.getElementById("employee-import")?.click()}
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
                    Select the role for this employee. They will receive login credentials via email.
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

        <Card>
          <CardHeader>
            <CardTitle>Employee List</CardTitle>
            <CardDescription>
              View and manage all employees in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={employees}
              columns={columns}
              searchable
              searchPlaceholder="Search employees..."
              paginated
              pageSize={10}
            />
          </CardContent>
        </Card>

        {/* View Employee Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Employee Details</DialogTitle>
              <DialogDescription>
                View employee information and details
              </DialogDescription>
            </DialogHeader>
            {selectedEmployee && (
              <div className="space-y-4">
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
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
