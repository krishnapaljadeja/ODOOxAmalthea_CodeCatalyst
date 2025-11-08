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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Save,
  User,
  DollarSign,
  Settings,
  Upload,
  Eye,
  Pencil,
  X,
} from "lucide-react";
import apiClient from "../lib/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuthStore } from "../store/auth";
import { formatDate, formatCurrency } from "../lib/format";
import PasswordModal from "../components/PasswordModal";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  address: z.string().optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  nationality: z.string().optional().or(z.literal("")),
  personalEmail: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal(""))
    .or(z.undefined()),
  maritalStatus: z.string().optional().or(z.literal("")),
  accountNumber: z.string().optional().or(z.literal("")),
  bankName: z.string().optional().or(z.literal("")),
  ifscCode: z.string().optional().or(z.literal("")),
  panNo: z.string().optional().or(z.literal("")),
  uanNo: z.string().optional().or(z.literal("")),
});

const emergencyContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  relationship: z.string().min(1, "Relationship is required"),
  phone: z.string().min(1, "Phone is required"),
});

/**
 * Profile page component with tabs
 * Tabs: Resume, Private Info, Salary Info (admin/payroll only), Security
 */
export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("private-info");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [salaryInfo, setSalaryInfo] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [employeeData, setEmployeeData] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(profileSchema),
  });

  const {
    register: registerEmergency,
    handleSubmit: handleSubmitEmergency,
    formState: { errors: emergencyErrors },
    reset: resetEmergency,
  } = useForm({
    resolver: zodResolver(emergencyContactSchema),
  });

  const isAdminOrPayroll = ["admin", "hr"].includes(user?.role);

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  useEffect(() => {
    if (user && activeTab === "salary-info") {
      fetchSalaryInfo();
    }
  }, [user, activeTab, employeeData]);

  const fetchProfileData = async () => {
    try {
      const response = await apiClient.get("/profile");
      const profileData = response.data?.data || response.data;
      setEmployeeData(profileData.employee);
      reset({
        firstName: profileData.firstName || user?.firstName || "",
        lastName: profileData.lastName || user?.lastName || "",
        email: profileData.email || user?.email || "",
        phone: profileData.phone || user?.phone || "",
        address: profileData.employee?.address || "",
        dateOfBirth: profileData.employee?.dateOfBirth
          ? profileData.employee.dateOfBirth.split("T")[0]
          : "",
        gender: profileData.employee?.gender || "",
        nationality: profileData.employee?.nationality || "",
        personalEmail: profileData.employee?.personalEmail || "",
        maritalStatus: profileData.employee?.maritalStatus || "",
        accountNumber: profileData.employee?.accountNumber || "",
        bankName: profileData.employee?.bankName || "",
        ifscCode: profileData.employee?.ifscCode || "",
        panNo: profileData.employee?.panNo || "",
        uanNo: profileData.employee?.uanNo || "",
      });
      if (profileData.emergencyContact) {
        resetEmergency(profileData.emergencyContact);
      }
      if (profileData.documents) {
        setDocuments(profileData.documents);
      }
      // Update user in store with resume fields
      updateUser({
        about: profileData.about,
        whatILoveAboutMyJob: profileData.whatILoveAboutMyJob,
        interestsAndHobbies: profileData.interestsAndHobbies,
        skills: profileData.skills || [],
        certifications: profileData.certifications || [],
      });
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      // Use user data from store
      reset({
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        email: user?.email || "",
        phone: user?.phone || "",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = async (skill) => {
    try {
      const currentSkills = user?.skills || [];
      const updatedSkills = [...currentSkills, skill];
      const response = await apiClient.put("/profile", {
        skills: updatedSkills,
      });
      updateUser(response.data);
      toast.success("Skill added successfully");
    } catch (error) {
      console.error("Failed to add skill:", error);
      toast.error("Failed to add skill");
    }
  };

  const handleRemoveSkill = async (index) => {
    try {
      const currentSkills = user?.skills || [];
      const updatedSkills = currentSkills.filter((_, i) => i !== index);
      const response = await apiClient.put("/profile", {
        skills: updatedSkills,
      });
      updateUser(response.data);
      toast.success("Skill removed successfully");
    } catch (error) {
      console.error("Failed to remove skill:", error);
      toast.error("Failed to remove skill");
    }
  };

  const handleAddCertification = async (cert) => {
    try {
      const currentCerts = user?.certifications || [];
      const updatedCerts = [...currentCerts, cert];
      const response = await apiClient.put("/profile", {
        certifications: updatedCerts,
      });
      updateUser(response.data);
      toast.success("Certification added successfully");
    } catch (error) {
      console.error("Failed to add certification:", error);
      toast.error("Failed to add certification");
    }
  };

  const handleRemoveCertification = async (index) => {
    try {
      const currentCerts = user?.certifications || [];
      const updatedCerts = currentCerts.filter((_, i) => i !== index);
      const response = await apiClient.put("/profile", {
        certifications: updatedCerts,
      });
      updateUser(response.data);
      toast.success("Certification removed successfully");
    } catch (error) {
      console.error("Failed to remove certification:", error);
      toast.error("Failed to remove certification");
    }
  };

  const fetchSalaryInfo = async () => {
    try {
      const response = await apiClient.get("/profile/salary");
      const salaryData = response.data?.data || response.data;
      setSalaryInfo(salaryData);
    } catch (error) {
      console.error("Failed to fetch salary info:", error);
      // Use employee salary if available
      if (employeeData?.salary) {
        const basicSalary = employeeData.salary * 0.5;
        const hra = basicSalary * 0.5;
        const conveyance = employeeData.salary * 0.1;
        const medicalAllowance = employeeData.salary * 0.1;
        const specialAllowance = employeeData.salary * 0.05;
        const grossSalary = employeeData.salary;
        const pf = basicSalary * 0.12;
        const esi = 0;
        const professionalTax = 200;
        const netSalary = grossSalary - pf - esi - professionalTax;
        setSalaryInfo({
          basicSalary,
          hra,
          conveyance,
          medicalAllowance,
          specialAllowance,
          grossSalary,
          pf,
          esi,
          professionalTax,
          netSalary,
        });
      } else {
        // Use mock data as fallback
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
        });
      }
    }
  };

  const onSubmit = async (data) => {
    try {
      // Prepare employee data - convert empty strings to null
      const employeeData = {
        dateOfBirth:
          data.dateOfBirth && data.dateOfBirth.trim() ? data.dateOfBirth : null,
        address: data.address && data.address.trim() ? data.address : null,
        nationality:
          data.nationality && data.nationality.trim() ? data.nationality : null,
        personalEmail:
          data.personalEmail && data.personalEmail.trim()
            ? data.personalEmail
            : null,
        gender: data.gender && data.gender.trim() ? data.gender : null,
        maritalStatus:
          data.maritalStatus && data.maritalStatus.trim()
            ? data.maritalStatus
            : null,
        accountNumber:
          data.accountNumber && data.accountNumber.trim()
            ? data.accountNumber
            : null,
        bankName: data.bankName && data.bankName.trim() ? data.bankName : null,
        ifscCode: data.ifscCode && data.ifscCode.trim() ? data.ifscCode : null,
        panNo: data.panNo && data.panNo.trim() ? data.panNo : null,
        uanNo: data.uanNo && data.uanNo.trim() ? data.uanNo : null,
      };

      const response = await apiClient.put("/profile", {
        ...data,
        employeeData,
      });
      updateUser(response.data);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const onEmergencySubmit = async (data) => {
    try {
      await apiClient.put("/profile/emergency-contact", data);
      toast.success("Emergency contact updated successfully");
    } catch (error) {
      console.error("Failed to update emergency contact:", error);
    }
  };

  const handleDocumentUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiClient.post("/profile/documents", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setDocuments([...documents, response.data]);
      toast.success("Document uploaded successfully");
    } catch (error) {
      console.error("Failed to upload document:", error);
      toast.error("Failed to upload document");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">Manage your profile information</p>
      </div>

      {/* Basic Details Section - Above Tabs */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>My Name</Label>
                <Input
                  value={
                    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
                    "-"
                  }
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Login ID</Label>
                <Input
                  value={user?.employeeId || user?.email || "-"}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={user?.email || "-"}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Mobile</Label>
                <Input
                  value={user?.phone || "-"}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Company</Label>
                <Input
                  value={user?.company?.name || "-"}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input
                  value={user?.department || "-"}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Manager</Label>
                <Input
                  value={"-"} // TODO: Add manager field
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={employeeData?.address || "-"}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="resume">Resume</TabsTrigger>
          <TabsTrigger value="private-info">Private Info</TabsTrigger>
          <TabsTrigger value="salary-info">Salary Info</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="resume" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column - About Sections */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    className="w-full min-h-[120px] p-3 border rounded-md resize-none"
                    placeholder="Tell us about yourself..."
                    value={user?.about || ""}
                    onChange={async (e) => {
                      try {
                        const response = await apiClient.put("/profile", {
                          about: e.target.value,
                        });
                        updateUser(response.data);
                      } catch (error) {
                        console.error("Failed to update about:", error);
                      }
                    }}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>What I love about my job</CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    className="w-full min-h-[120px] p-3 border rounded-md resize-none"
                    placeholder="What do you love about your job?"
                    value={user?.whatILoveAboutMyJob || ""}
                    onChange={async (e) => {
                      try {
                        const response = await apiClient.put("/profile", {
                          whatILoveAboutMyJob: e.target.value,
                        });
                        updateUser(response.data);
                      } catch (error) {
                        console.error("Failed to update:", error);
                      }
                    }}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>My interests and hobbies</CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    className="w-full min-h-[120px] p-3 border rounded-md resize-none"
                    placeholder="Share your interests and hobbies..."
                    value={user?.interestsAndHobbies || ""}
                    onChange={async (e) => {
                      try {
                        const response = await apiClient.put("/profile", {
                          interestsAndHobbies: e.target.value,
                        });
                        updateUser(response.data);
                      } catch (error) {
                        console.error("Failed to update:", error);
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Skills and Certifications */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Skills</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const skill = prompt("Enter a skill:");
                      if (skill && skill.trim()) {
                        const currentSkills = user?.skills || [];
                        handleAddSkill(skill.trim());
                      }
                    }}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Add Skills
                  </Button>
                  <div className="space-y-2">
                    {(user?.skills || []).map((skill, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 border rounded-lg"
                      >
                        <span className="text-sm">{skill}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSkill(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Certification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const cert = prompt("Enter a certification:");
                      if (cert && cert.trim()) {
                        handleAddCertification(cert.trim());
                      }
                    }}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Add Certification
                  </Button>
                  <div className="space-y-2">
                    {(user?.certifications || []).map((cert, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 border rounded-lg"
                      >
                        <span className="text-sm">{cert}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCertification(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="private-info" className="space-y-4">
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
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold overflow-hidden">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={`${user.firstName} ${user.lastName}`}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <span>
                        {user?.firstName?.[0]}
                        {user?.lastName?.[0]}
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                    onClick={() =>
                      document.getElementById("avatar-upload")?.click()
                    }
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Validate file type
                        if (!file.type.startsWith("image/")) {
                          toast.error("Please select an image file");
                          return;
                        }
                        // Validate file size (max 2MB)
                        if (file.size > 2 * 1024 * 1024) {
                          toast.error("Image size should be less than 2MB");
                          return;
                        }
                        // Convert to base64
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          try {
                            const response = await apiClient.put("/profile", {
                              avatar: reader.result,
                            });
                            updateUser(response.data);
                            toast.success(
                              "Profile picture updated successfully"
                            );
                          } catch (error) {
                            console.error(
                              "Failed to update profile picture:",
                              error
                            );
                            toast.error("Failed to update profile picture");
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    {user?.firstName} {user?.lastName}
                  </h2>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  {user?.employeeId && (
                    <p className="text-xs text-muted-foreground">
                      ID: {user.employeeId}
                    </p>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Employee ID</Label>
                    <Input
                      id="employeeId"
                      value={user?.employeeId || user?.id || ""}
                      disabled
                      className="bg-muted"
                    />
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
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      {...register("phone")}
                      aria-invalid={errors.phone ? "true" : "false"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      {...register("dateOfBirth")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Input
                      id="gender"
                      {...register("gender")}
                      placeholder="Male/Female/Other"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nationality">Nationality</Label>
                    <Input
                      id="nationality"
                      {...register("nationality")}
                      placeholder="Enter your nationality"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="personalEmail">Personal Email</Label>
                    <Input
                      id="personalEmail"
                      type="email"
                      {...register("personalEmail")}
                      placeholder="Enter your personal email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maritalStatus">Marital Status</Label>
                    <Input
                      id="maritalStatus"
                      {...register("maritalStatus")}
                      placeholder="Single/Married/Divorced"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={user?.department || ""}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="designation">Designation</Label>
                    <Input
                      id="designation"
                      value={user?.position || ""}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfJoining">Date of Joining</Label>
                    <Input
                      id="dateOfJoining"
                      value={
                        employeeData?.hireDate
                          ? formatDate(employeeData.hireDate)
                          : ""
                      }
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Residing Address</Label>
                  <Input
                    id="address"
                    {...register("address")}
                    placeholder="Enter your residing address"
                  />
                </div>

                {/* Bank Details Section */}
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-lg font-semibold mb-4">Bank Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        {...register("accountNumber")}
                        placeholder="Enter account number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        {...register("bankName")}
                        placeholder="Enter bank name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ifscCode">IFSC Code</Label>
                      <Input
                        id="ifscCode"
                        {...register("ifscCode")}
                        placeholder="Enter IFSC code"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="panNo">PAN No</Label>
                      <Input
                        id="panNo"
                        {...register("panNo")}
                        placeholder="Enter PAN number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="uanNo">UAN NO</Label>
                      <Input
                        id="uanNo"
                        {...register("uanNo")}
                        placeholder="Enter UAN number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="empCode">Emp Code</Label>
                      <Input
                        id="empCode"
                        value={user?.employeeId || ""}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button type="submit">
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
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
                  onClick={() =>
                    document.getElementById("document-upload")?.click()
                  }
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
                <input
                  id="document-upload"
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDocumentUpload(file);
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
              <form
                onSubmit={handleSubmitEmergency(onEmergencySubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyName">Name</Label>
                    <Input
                      id="emergencyName"
                      {...registerEmergency("name")}
                      aria-invalid={emergencyErrors.name ? "true" : "false"}
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
                      {...registerEmergency("relationship")}
                      placeholder="e.g., Spouse, Parent"
                      aria-invalid={
                        emergencyErrors.relationship ? "true" : "false"
                      }
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
                      {...registerEmergency("phone")}
                      aria-invalid={emergencyErrors.phone ? "true" : "false"}
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

        <TabsContent value="salary-info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5" />
                Salary Info
              </CardTitle>
              <CardDescription>
                {isAdminOrPayroll
                  ? "View and manage salary information"
                  : "View your salary information (read-only)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {salaryInfo ? (
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
                  {isAdminOrPayroll && (
                    <Button>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No salary information available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your password and security settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Change Password</Label>
                  <p className="text-sm text-muted-foreground">
                    Update your password to keep your account secure
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setIsPasswordModalOpen(true)}
                  >
                    Change Password
                  </Button>
                </div>
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
  );
}
