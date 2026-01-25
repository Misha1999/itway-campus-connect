import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Plus, Search, MoreHorizontal, Upload, Users } from "lucide-react";

interface Group {
  id: string;
  name: string;
  course: string;
  campus: string;
  teacher: string;
  studentCount: number;
  format: "online" | "offline" | "hybrid";
  status: "active" | "archived";
  schedule: string;
}

// Demo data
const demoGroups: Group[] = [
  { id: "1", name: "PY-2024-A", course: "Python Advanced", campus: "ITway Долина", teacher: "Марія Петренко", studentCount: 12, format: "offline", status: "active", schedule: "Сб 14:00" },
  { id: "2", name: "WD-2024-B", course: "Web Design Basics", campus: "ITway Долина", teacher: "Іван Сидоренко", studentCount: 10, format: "online", status: "active", schedule: "Нд 11:00" },
  { id: "3", name: "RB-2024-C", course: "Roblox Studio", campus: "ITway Долина", teacher: "Олена Коваль", studentCount: 8, format: "offline", status: "active", schedule: "Сб 16:00" },
  { id: "4", name: "3D-2024-A", course: "3D Modeling", campus: "ITway Долина", teacher: "Андрій Бондар", studentCount: 6, format: "hybrid", status: "active", schedule: "Пт 15:00" },
  { id: "5", name: "PY-2023-B", course: "Python Basics", campus: "ITway Долина", teacher: "Марія Петренко", studentCount: 15, format: "offline", status: "archived", schedule: "Сб 10:00" },
];

const columns: Column<Group>[] = [
  {
    key: "name",
    header: "Група",
    cell: (row) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
            {row.name.slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground">{row.name}</p>
          <p className="text-sm text-muted-foreground">{row.course}</p>
        </div>
      </div>
    ),
  },
  {
    key: "teacher",
    header: "Викладач",
    cell: (row) => <span className="text-foreground">{row.teacher}</span>,
  },
  {
    key: "students",
    header: "Студенти",
    cell: (row) => (
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span>{row.studentCount}</span>
      </div>
    ),
  },
  {
    key: "schedule",
    header: "Розклад",
    cell: (row) => <span className="text-muted-foreground">{row.schedule}</span>,
  },
  {
    key: "format",
    header: "Формат",
    cell: (row) => <StatusBadge status={row.format} />,
  },
  {
    key: "status",
    header: "Статус",
    cell: (row) => <StatusBadge status={row.status} />,
  },
  {
    key: "actions",
    header: "",
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>Переглянути</DropdownMenuItem>
          <DropdownMenuItem>Редагувати</DropdownMenuItem>
          <DropdownMenuItem>Журнал групи</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive">Архівувати</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    className: "w-12",
  },
];

export default function GroupsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const filteredGroups = demoGroups.filter((group) => {
    const matchesSearch = group.name.toLowerCase().includes(search.toLowerCase()) ||
      group.course.toLowerCase().includes(search.toLowerCase()) ||
      group.teacher.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || group.status === statusFilter;
    const matchesFormat = formatFilter === "all" || group.format === formatFilter;
    return matchesSearch && matchesStatus && matchesFormat;
  });

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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Нова група
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Пошук груп..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
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
            onClick: () => {},
          }}
        />
      )}
    </div>
  );
}
