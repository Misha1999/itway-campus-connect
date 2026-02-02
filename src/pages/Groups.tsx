import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, MoreHorizontal, Upload, Users, X, GraduationCap, Clock } from "lucide-react";
import { useGroups, type GroupData } from "@/hooks/use-groups";
import { AddGroupDialog, EditGroupDialog } from "@/components/groups";

export default function GroupsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize filters from URL
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [formatFilter, setFormatFilter] = useState(searchParams.get("format") || "all");
  const [programFilter, setProgramFilter] = useState(searchParams.get("program") || "all");
  const [cohortFilter, setCohortFilter] = useState(searchParams.get("cohort") || "all");
  
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupData | null>(null);

  const {
    groups,
    campuses,
    courses,
    studyPrograms,
    enrollmentCohorts,
    loading,
    createGroup,
    updateGroup,
    archiveGroup,
    restoreGroup,
  } = useGroups();

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (formatFilter !== "all") params.set("format", formatFilter);
    if (programFilter !== "all") params.set("program", programFilter);
    if (cohortFilter !== "all") params.set("cohort", cohortFilter);
    setSearchParams(params, { replace: true });
  }, [search, statusFilter, formatFilter, programFilter, cohortFilter, setSearchParams]);

  // Get unique programs and cohorts from groups for filters
  const uniquePrograms = useMemo(() => {
    const programIds = new Set(groups.map(g => g.study_program_id).filter(Boolean));
    return studyPrograms.filter(p => programIds.has(p.id));
  }, [groups, studyPrograms]);

  const uniqueCohorts = useMemo(() => {
    const cohortIds = new Set(groups.map(g => g.enrollment_cohort_id).filter(Boolean));
    return enrollmentCohorts.filter(c => cohortIds.has(c.id));
  }, [groups, enrollmentCohorts]);

  const filteredGroups = useMemo(() => {
    return groups.filter((group) => {
      const matchesSearch = group.name.toLowerCase().includes(search.toLowerCase()) ||
        (group.course_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (group.teacher_name || "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" ? group.is_active : !group.is_active);
      const matchesFormat = formatFilter === "all" || group.format === formatFilter;
      const matchesProgram = programFilter === "all" || group.study_program_id === programFilter;
      const matchesCohort = cohortFilter === "all" || group.enrollment_cohort_id === cohortFilter;
      return matchesSearch && matchesStatus && matchesFormat && matchesProgram && matchesCohort;
    });
  }, [groups, search, statusFilter, formatFilter, programFilter, cohortFilter]);

  const hasActiveFilters = statusFilter !== "all" || formatFilter !== "all" || 
    programFilter !== "all" || cohortFilter !== "all" || search;

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setFormatFilter("all");
    setProgramFilter("all");
    setCohortFilter("all");
  };

  const handleSelectRow = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === filteredGroups.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredGroups.map(g => g.id)));
    }
  };

  const handleRowClick = (group: GroupData) => {
    setEditingGroup(group);
  };

  const columns: Column<GroupData>[] = [
    {
      key: "name",
      header: "Група",
      cell: (row) => (
        <div 
          className="flex items-center gap-3 cursor-pointer hover:text-primary"
          onClick={() => handleRowClick(row)}
        >
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {row.name.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">{row.name}</p>
            <p className="text-sm text-muted-foreground">{row.course_name || "Без курсу"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "program",
      header: "Програма / Потік",
      cell: (row) => (
        <div className="space-y-1">
          {row.study_program_name && (
            <div className="flex items-center gap-1 text-sm">
              <GraduationCap className="h-3 w-3 text-muted-foreground" />
              <span className={row.study_program_name?.includes("(архів)") ? "text-destructive" : ""}>
                {row.study_program_name}
              </span>
            </div>
          )}
          {row.enrollment_cohort_name && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className={row.enrollment_cohort_name?.includes("(архів)") ? "text-destructive" : ""}>
                {row.enrollment_cohort_name}
              </span>
            </div>
          )}
          {!row.study_program_name && !row.enrollment_cohort_name && (
            <span className="text-muted-foreground text-sm">—</span>
          )}
        </div>
      ),
    },
    {
      key: "teacher",
      header: "Викладач",
      cell: (row) => <span className="text-foreground">{row.teacher_name || "—"}</span>,
    },
    {
      key: "students",
      header: "Студенти",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{row.student_count}{row.max_students ? `/${row.max_students}` : ""}</span>
        </div>
      ),
    },
    {
      key: "campus",
      header: "Кампус",
      cell: (row) => <span className="text-muted-foreground">{row.campus_name}</span>,
    },
    {
      key: "format",
      header: "Формат",
      cell: (row) => <StatusBadge status={row.format} />,
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
            <DropdownMenuItem onClick={() => setEditingGroup(row)}>
              Переглянути / Редагувати
            </DropdownMenuItem>
            <DropdownMenuItem>Журнал групи</DropdownMenuItem>
            <DropdownMenuSeparator />
            {row.is_active ? (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => archiveGroup(row.id)}
              >
                Архівувати
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => restoreGroup(row.id)}>
                Відновити
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-12",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Групи" description="Керування навчальними групами">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </PageHeader>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Групи" 
        description="Керування навчальними групами"
      >
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Імпорт
        </Button>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Нова група
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Пошук груп..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Програма" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всі програми</SelectItem>
              {uniquePrograms.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={cohortFilter} onValueChange={setCohortFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Потік" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всі потоки</SelectItem>
              {uniqueCohorts.map((cohort) => (
                <SelectItem key={cohort.id} value={cohort.id}>
                  {cohort.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всі статуси</SelectItem>
              <SelectItem value="active">Активні</SelectItem>
              <SelectItem value="archived">Архів</SelectItem>
            </SelectContent>
          </Select>

          <Select value={formatFilter} onValueChange={setFormatFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Формат" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всі формати</SelectItem>
              <SelectItem value="offline">Офлайн</SelectItem>
              <SelectItem value="online">Онлайн</SelectItem>
              <SelectItem value="hybrid">Гібрид</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="h-4 w-4 mr-1" />
              Скинути
            </Button>
          )}
        </div>

        {/* Active filters badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {search && (
              <Badge variant="secondary" className="gap-1">
                Пошук: {search}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSearch("")} />
              </Badge>
            )}
            {programFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Програма: {uniquePrograms.find(p => p.id === programFilter)?.name}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setProgramFilter("all")} />
              </Badge>
            )}
            {cohortFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Потік: {uniqueCohorts.find(c => c.id === cohortFilter)?.name}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setCohortFilter("all")} />
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Selected actions */}
      {selectedRows.size > 0 && (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-accent">
          <span className="text-sm font-medium">
            Вибрано: {selectedRows.size}
          </span>
          <Button variant="outline" size="sm">
            Змінити статус
          </Button>
          <Button variant="outline" size="sm">
            Змінити викладача
          </Button>
          <Button variant="outline" size="sm" className="text-destructive">
            Архівувати
          </Button>
        </div>
      )}

      {/* Table */}
      {filteredGroups.length > 0 ? (
        <DataTable
          columns={columns}
          data={filteredGroups}
          selectable
          selectedRows={selectedRows}
          onSelectRow={handleSelectRow}
          onSelectAll={handleSelectAll}
        />
      ) : (
        <EmptyState
          icon={Users}
          title="Груп не знайдено"
          description="Створіть першу групу або змініть фільтри пошуку"
          action={{
            label: "Створити групу",
            onClick: () => setShowAddDialog(true),
          }}
        />
      )}

      {/* Add Group Dialog */}
      <AddGroupDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        campuses={campuses}
        courses={courses}
        studyPrograms={studyPrograms}
        enrollmentCohorts={enrollmentCohorts}
        onSave={createGroup}
      />

      {/* Edit Group Dialog */}
      <EditGroupDialog
        open={!!editingGroup}
        onOpenChange={(open) => !open && setEditingGroup(null)}
        group={editingGroup}
        campuses={campuses}
        courses={courses}
        studyPrograms={studyPrograms}
        enrollmentCohorts={enrollmentCohorts}
        onSave={updateGroup}
      />
    </div>
  );
}
