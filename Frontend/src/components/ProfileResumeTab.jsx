import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Upload, X } from "lucide-react";
import apiClient from "../lib/api";
import { toast } from "sonner";
import { useAuthStore } from "../store/auth";

export default function ProfileResumeTab() {
  const { user, updateUser } = useAuthStore();

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

  return (
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
  );
}

