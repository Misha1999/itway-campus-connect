import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Building2, Users, GraduationCap, MoreHorizontal, MapPin, Phone, UserCog, Eye } from "lucide-react";
import { useCampuses, CampusWithStats } from "@/hooks/use-campuses";
import { AddCampusDialog, AssignAdminDialog } from "@/components/campuses";

const columns: Column<CampusWithStats>[] = [
  {
    key: "name",
    header: "Заклад",
    cell: (row) => (
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground font-bold">
          IT
        </div>
        <div>
          <p className="font-medium text-foreground">{row.name}</p>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {row.city}{row.address ? `, ${row.address}` : ""}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "phone",
    header: "Контакти",
    cell: (row) => (
      <div className="space-y-1 text-sm text-muted-foreground">
        {row.phone && (
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {row.phone}
          </div>
        )}
        {row.email && <div>{row.email}</div>}
        {!row.phone && !row.email && <span>—</span>}
      </div>
    ),
  },
  {
    key: "students",
    header: "Студенти",
    cell: (row) => (
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span>{row.studentsCount}</span>
      </div>
    ),
  },
  {
    key: "teachers",
    header: "Викладачі",
    cell: (row) => <span>{row.teachersCount}</span>,
  },
  {
    key: "groups",
    header: "Групи",
    cell: (row) => (
      <div className="flex items-center gap-2">
        <GraduationCap className="h-4 w-4 text-muted-foreground" />
        <span>{row.groupsCount}</span>
      </div>
    ),
  },
  {
    key: "status",
    header: "Статус",
    cell: (row) => <StatusBadge status={row.is_active ? "active" : "archived"} />,
  },
];

export default function CampusesPage() {
  const navigate = useNavigate();
  const { campuses, loading, refetch, createCampus, toggleCampusStatus } = useCampuses();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [assignAdminDialog, setAssignAdminDialog] = useState<{
    open: boolean;
    campusId: string;
    campusName: string;
  }>({ open: false, campusId: "", campusName: "" });

  const activeCampuses = campuses.filter((c) => c.is_active);
  const totalStudents = campuses.reduce((sum, c) => sum + c.studentsCount, 0);
  const totalTeachers = campuses.reduce((sum, c) => sum + c.teachersCount, 0);
  const totalGroups = campuses.reduce((sum, c) => sum + c.groupsCount, 0);

  const columnsWithActions: Column<CampusWithStats>[] = [
    ...columns,
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
            <DropdownMenuItem onClick={() => navigate(`/campuses/${row.id}`)}>
              <Eye className="h-4 w-4 mr-2" />
              Переглянути
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                setAssignAdminDialog({
                  open: true,
                  campusId: row.id,
                  campusName: row.name,
                })
              }
            >
              <UserCog className="h-4 w-4 mr-2" />
              Призначити адміна
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => toggleCampusStatus(row.id, !row.is_active)}
            >
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
        <PageHeader title="Заклади" description="Керування філіями мережі ITway" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Заклади"
        description="Керування філіями мережі ITway"
      >
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Новий заклад
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="text-2xl font-semibold text-foreground">
                {activeCampuses.length}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Активних закладів</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold text-foreground">{totalStudents}</div>
            <p className="text-sm text-muted-foreground">Всього студентів</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold text-foreground">{totalTeachers}</div>
            <p className="text-sm text-muted-foreground">Викладачів</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold text-foreground">{totalGroups}</div>
            <p className="text-sm text-muted-foreground">Активних груп</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <DataTable columns={columnsWithActions} data={campuses} />

      <AddCampusDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={createCampus}
      />

      <AssignAdminDialog
        open={assignAdminDialog.open}
        onOpenChange={(open) =>
          setAssignAdminDialog((prev) => ({ ...prev, open }))
        }
        campusId={assignAdminDialog.campusId}
        campusName={assignAdminDialog.campusName}
        onSuccess={refetch}
      />
    </div>
  );
}
