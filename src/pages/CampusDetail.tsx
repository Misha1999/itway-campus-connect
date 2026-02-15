import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { useLessonSlots } from "@/hooks/use-lesson-slots";
import { LessonSlotsTab } from "@/components/campuses/LessonSlotsTab";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  GraduationCap,
  Users,
  Calendar,
  Building2,
  Pencil,
  Archive,
  Save,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { AddStudyProgramDialog } from "@/components/campuses/AddStudyProgramDialog";
import { AddEnrollmentCohortDialog } from "@/components/campuses/AddEnrollmentCohortDialog";

interface Campus {
  id: string;
  name: string;
  city: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  email_domain: string | null;
  is_active: boolean;
}

interface StudyProgram {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface EnrollmentCohort {
  id: string;
  name: string;
  start_date: string | null;
  is_active: boolean;
  created_at: string;
}

export default function CampusDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [campus, setCampus] = useState<Campus | null>(null);
  const [programs, setPrograms] = useState<StudyProgram[]>([]);
  const [cohorts, setCohorts] = useState<EnrollmentCohort[]>([]);

  const [editedCampus, setEditedCampus] = useState<Partial<Campus>>({});
  const [showAddProgram, setShowAddProgram] = useState(false);
  const [showAddCohort, setShowAddCohort] = useState(false);

  const {
    slots,
    loading: slotsLoading,
    createSlot,
    updateSlot,
    toggleSlotActive,
    deleteSlot,
  } = useLessonSlots(id || "");

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const [campusRes, programsRes, cohortsRes] = await Promise.all([
      supabase.from("campuses").select("*").eq("id", id).single(),
      supabase.from("study_programs").select("*").eq("campus_id", id).order("name"),
      supabase.from("enrollment_cohorts").select("*").eq("campus_id", id).order("start_date", { ascending: false }),
    ]);

    if (campusRes.error || !campusRes.data) {
      toast.error("Заклад не знайдено");
      navigate("/campuses");
      return;
    }

    setCampus(campusRes.data);
    setEditedCampus(campusRes.data);
    setPrograms(programsRes.data || []);
    setCohorts(cohortsRes.data || []);
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveCampus = async () => {
    if (!campus) return;
    setSaving(true);

    const { error } = await supabase
      .from("campuses")
      .update({
        name: editedCampus.name,
        city: editedCampus.city,
        address: editedCampus.address || null,
        phone: editedCampus.phone || null,
        email: editedCampus.email || null,
        email_domain: editedCampus.email_domain || null,
      })
      .eq("id", campus.id);

    if (error) {
      toast.error("Помилка збереження");
    } else {
      toast.success("Заклад оновлено");
      await fetchData();
    }
    setSaving(false);
  };

  const toggleProgramStatus = async (programId: string, isActive: boolean) => {
    const { error } = await supabase
      .from("study_programs")
      .update({ is_active: isActive })
      .eq("id", programId);

    if (error) {
      toast.error("Помилка оновлення");
    } else {
      toast.success(isActive ? "Програму активовано" : "Програму архівовано");
      await fetchData();
    }
  };

  const toggleCohortStatus = async (cohortId: string, isActive: boolean) => {
    const { error } = await supabase
      .from("enrollment_cohorts")
      .update({ is_active: isActive })
      .eq("id", cohortId);

    if (error) {
      toast.error("Помилка оновлення");
    } else {
      toast.success(isActive ? "Потік активовано" : "Потік архівовано");
      await fetchData();
    }
  };

  const programColumns: Column<StudyProgram>[] = [
    {
      key: "name",
      header: "Назва програми",
      cell: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.name}</p>
          {row.description && (
            <p className="text-sm text-muted-foreground truncate max-w-[300px]">
              {row.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Статус",
      cell: (row) => <StatusBadge status={row.is_active ? "active" : "archived"} />,
    },
    {
      key: "created_at",
      header: "Створено",
      cell: (row) => format(new Date(row.created_at), "d MMM yyyy", { locale: uk }),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Pencil className="h-4 w-4 mr-2" />
              Редагувати
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toggleProgramStatus(row.id, !row.is_active)}>
              <Archive className="h-4 w-4 mr-2" />
              {row.is_active ? "Архівувати" : "Активувати"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-12",
    },
  ];

  const cohortColumns: Column<EnrollmentCohort>[] = [
    {
      key: "name",
      header: "Назва потоку",
      cell: (row) => <span className="font-medium text-foreground">{row.name}</span>,
    },
    {
      key: "start_date",
      header: "Дата старту",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {row.start_date
            ? format(new Date(row.start_date), "d MMM yyyy", { locale: uk })
            : "—"}
        </div>
      ),
    },
    {
      key: "status",
      header: "Статус",
      cell: (row) => <StatusBadge status={row.is_active ? "active" : "archived"} />,
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Pencil className="h-4 w-4 mr-2" />
              Редагувати
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toggleCohortStatus(row.id, !row.is_active)}>
              <Archive className="h-4 w-4 mr-2" />
              {row.is_active ? "Архівувати" : "Активувати"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-12",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!campus) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/campuses")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={campus.name}
          description={`${campus.city}${campus.address ? `, ${campus.address}` : ""}`}
        />
      </div>

      <Tabs defaultValue="info" className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">
            <Building2 className="h-4 w-4 mr-2" />
            Інформація
          </TabsTrigger>
          <TabsTrigger value="programs">
            <GraduationCap className="h-4 w-4 mr-2" />
            Програми ({programs.length})
          </TabsTrigger>
          <TabsTrigger value="cohorts">
            <Users className="h-4 w-4 mr-2" />
            Потоки ({cohorts.length})
          </TabsTrigger>
          <TabsTrigger value="slots">
            <Clock className="h-4 w-4 mr-2" />
            Уроки (Слоти)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Налаштування закладу</CardTitle>
              <CardDescription>Редагуйте основну інформацію про заклад</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Назва *</Label>
                  <Input
                    id="name"
                    value={editedCampus.name || ""}
                    onChange={(e) => setEditedCampus({ ...editedCampus, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Місто *</Label>
                  <Input
                    id="city"
                    value={editedCampus.city || ""}
                    onChange={(e) => setEditedCampus({ ...editedCampus, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Адреса</Label>
                  <Input
                    id="address"
                    value={editedCampus.address || ""}
                    onChange={(e) => setEditedCampus({ ...editedCampus, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={editedCampus.phone || ""}
                    onChange={(e) => setEditedCampus({ ...editedCampus, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editedCampus.email || ""}
                    onChange={(e) => setEditedCampus({ ...editedCampus, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email_domain">Домен пошти користувачів</Label>
                  <Input
                    id="email_domain"
                    value={editedCampus.email_domain || ""}
                    onChange={(e) => setEditedCampus({ ...editedCampus, email_domain: e.target.value })}
                    placeholder="itway.dolyna.ua"
                  />
                  <p className="text-xs text-muted-foreground">
                    Логіни користувачів будуть створюватись у цьому домені
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveCampus} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Збереження..." : "Зберегти зміни"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="programs">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowAddProgram(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Нова програма
              </Button>
            </div>

            {programs.length > 0 ? (
              <DataTable columns={programColumns} data={programs} />
            ) : (
              <EmptyState
                icon={GraduationCap}
                title="Програм ще немає"
                description="Додайте першу програму навчання"
                action={{
                  label: "Додати програму",
                  onClick: () => setShowAddProgram(true),
                }}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="cohorts">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowAddCohort(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Новий потік
              </Button>
            </div>

            {cohorts.length > 0 ? (
              <DataTable columns={cohortColumns} data={cohorts} />
            ) : (
              <EmptyState
                icon={Users}
                title="Потоків ще немає"
                description="Додайте перший потік набору"
                action={{
                  label: "Додати потік",
                  onClick: () => setShowAddCohort(true),
                }}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="slots">
          <LessonSlotsTab
            slots={slots}
            loading={slotsLoading}
            programs={programs}
            onSave={createSlot}
            onUpdate={updateSlot}
            onToggleActive={toggleSlotActive}
            onDelete={deleteSlot}
          />
        </TabsContent>
      </Tabs>

      <AddStudyProgramDialog
        open={showAddProgram}
        onOpenChange={setShowAddProgram}
        campusId={campus.id}
        onSuccess={fetchData}
      />

      <AddEnrollmentCohortDialog
        open={showAddCohort}
        onOpenChange={setShowAddCohort}
        campusId={campus.id}
        onSuccess={fetchData}
      />
    </div>
  );
}
