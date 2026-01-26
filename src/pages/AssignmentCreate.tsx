import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { AssignmentForm } from "@/components/assignments";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Criterion } from "@/components/assignments/GradingCriteria";

interface Group {
  id: string;
  name: string;
  course?: string;
}

// Demo groups for now - will be replaced with real data
const demoGroups: Group[] = [
  { id: "1", name: "PY-2024-A", course: "Python Advanced" },
  { id: "2", name: "WD-2024-B", course: "Web Design" },
  { id: "3", name: "RB-2024-C", course: "Roblox Studio" },
  { id: "4", name: "3D-2024-A", course: "3D Modeling" },
];

export default function AssignmentCreatePage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>(demoGroups);

  useEffect(() => {
    // Fetch real groups when auth is implemented
    const fetchGroups = async () => {
      const { data, error } = await supabase
        .from("groups")
        .select(`
          id,
          name,
          courses:course_id (name)
        `)
        .eq("is_active", true);

      if (data && data.length > 0) {
        setGroups(
          data.map((g) => ({
            id: g.id,
            name: g.name,
            course: (g.courses as { name: string } | null)?.name,
          }))
        );
      }
    };

    fetchGroups();
  }, []);

  const handleSubmit = async (data: {
    title: string;
    description?: string;
    instructions?: string;
    groupId: string;
    lessonId?: string;
    workType: "homework" | "practice" | "project" | "test" | "activity";
    deadline: Date;
    deadlineTime: string;
    maxScore: number;
    allowResubmission: boolean;
    visibleFrom?: Date;
    status: "draft" | "published";
    fileUrls: string[];
    criteria: Criterion[];
  }) => {
    setIsLoading(true);

    try {
      // Combine date and time for deadline
      const [hours, minutes] = data.deadlineTime.split(":").map(Number);
      const deadline = new Date(data.deadline);
      deadline.setHours(hours, minutes, 0, 0);

      const { data: user } = await supabase.auth.getUser();

      // For demo, we'll show a success message
      // In production, this would create the assignment in the database
      if (!user.user) {
        // Demo mode - just show success
        toast.success(
          data.status === "published" 
            ? "Завдання опубліковано!" 
            : "Чернетку збережено"
        );
        navigate("/assignments");
        return;
      }

      const { error } = await supabase.from("assignments").insert({
        title: data.title,
        description: data.description || null,
        instructions: data.instructions || null,
        group_id: data.groupId,
        lesson_id: data.lessonId || null,
        work_type: data.workType,
        deadline: deadline.toISOString(),
        max_score: data.maxScore,
        allow_resubmission: data.allowResubmission,
        visible_from: data.visibleFrom?.toISOString() || null,
        status: data.status,
        file_urls: data.fileUrls,
        created_by: user.user.id,
      });

      if (error) throw error;

      toast.success(
        data.status === "published" 
          ? "Завдання опубліковано!" 
          : "Чернетку збережено"
      );
      navigate("/assignments");
    } catch (error) {
      console.error("Error creating assignment:", error);
      toast.error("Помилка при створенні завдання");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/assignments");
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <PageHeader
        title="Нове завдання"
        description="Створіть домашнє завдання для студентів"
      />

      <AssignmentForm
        groups={groups}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  );
}
