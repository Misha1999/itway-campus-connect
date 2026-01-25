import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, MoreHorizontal, Upload, Users, Mail, Phone } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  campus: string;
  groups: string[];
  status: "active" | "archived" | "pending";
  createdAt: string;
}

// Demo data
const demoUsers: User[] = [
  { id: "1", name: "Марія Петренко", email: "maria@itway.edu.ua", phone: "+380501234567", role: "teacher", campus: "ITway Долина", groups: ["PY-2024-A", "PY-2024-B"], status: "active", createdAt: "01.09.2024" },
  { id: "2", name: "Іван Сидоренко", email: "ivan@itway.edu.ua", phone: "+380502345678", role: "teacher", campus: "ITway Долина", groups: ["WD-2024-B"], status: "active", createdAt: "15.09.2024" },
  { id: "3", name: "Олена Коваль", email: "olena@itway.edu.ua", phone: "+380503456789", role: "teacher", campus: "ITway Долина", groups: ["RB-2024-C"], status: "active", createdAt: "01.10.2024" },
  { id: "4", name: "Олександр Коваль", email: "oleksandr@gmail.com", phone: "+380661234567", role: "student", campus: "ITway Долина", groups: ["PY-2024-A"], status: "active", createdAt: "05.09.2024" },
  { id: "5", name: "Марія Шевченко", email: "maria.shev@gmail.com", phone: "+380662345678", role: "student", campus: "ITway Долина", groups: ["PY-2024-A"], status: "active", createdAt: "05.09.2024" },
  { id: "6", name: "Іван Бондаренко", email: "ivan.bond@gmail.com", phone: "+380663456789", role: "student", campus: "ITway Долина", groups: ["WD-2024-B"], status: "active", createdAt: "10.09.2024" },
  { id: "7", name: "Анна Петренко", email: "anna.p@gmail.com", phone: "+380664567890", role: "student", campus: "ITway Долина", groups: ["WD-2024-B"], status: "pending", createdAt: "20.01.2025" },
  { id: "8", name: "Дмитро Сидоренко", email: "dmytro@gmail.com", phone: "+380665678901", role: "student", campus: "ITway Долина", groups: ["RB-2024-C"], status: "active", createdAt: "12.09.2024" },
];

const roleLabels: Record<string, string> = {
  admin_network: "Адмін мережі",
  admin_campus: "Адмін закладу",
  teacher: "Викладач",
  student: "Студент",
  parent_viewer: "Батьки",
};

const columns: Column<User>[] = [
  {
    key: "name",
    header: "Користувач",
    cell: (row) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {row.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground">{row.name}</p>
          <p className="text-sm text-muted-foreground">{row.email}</p>
        </div>
      </div>
    ),
  },
  {
    key: "role",
    header: "Роль",
    cell: (row) => (
      <Badge variant="outline">{roleLabels[row.role]}</Badge>
    ),
  },
  {
    key: "groups",
    header: "Групи",
    cell: (row) => (
      <div className="flex flex-wrap gap-1">
        {row.groups.slice(0, 2).map((group) => (
          <Badge key={group} variant="secondary" className="text-xs">
            {group}
          </Badge>
        ))}
        {row.groups.length > 2 && (
          <Badge variant="secondary" className="text-xs">
            +{row.groups.length - 2}
          </Badge>
        )}
      </div>
    ),
  },
  {
    key: "phone",
    header: "Телефон",
    cell: (row) => <span className="text-muted-foreground">{row.phone}</span>,
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
          <DropdownMenuItem>Переглянути профіль</DropdownMenuItem>
          <DropdownMenuItem>Редагувати</DropdownMenuItem>
          <DropdownMenuItem>Змінити групу</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive">Архівувати</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    className: "w-12",
  },
];

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const filteredUsers = demoUsers.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
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
    if (selectedRows.size === filteredUsers.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const teachers = filteredUsers.filter(u => u.role === "teacher");
  const students = filteredUsers.filter(u => u.role === "student");

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Користувачі" 
        description="Керування користувачами системи"
      >
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Імпорт CSV
        </Button>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Додати користувача
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Пошук користувачів..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Роль" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі ролі</SelectItem>
            <SelectItem value="teacher">Викладачі</SelectItem>
            <SelectItem value="student">Студенти</SelectItem>
            <SelectItem value="admin_campus">Адміни</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі статуси</SelectItem>
            <SelectItem value="active">Активні</SelectItem>
            <SelectItem value="pending">Очікують</SelectItem>
            <SelectItem value="archived">Архів</SelectItem>
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
            Додати в групу
          </Button>
          <Button variant="outline" size="sm">
            Змінити статус
          </Button>
          <Button variant="outline" size="sm" className="text-destructive">
            Архівувати
          </Button>
        </div>
      )}

      {/* Table */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Всі ({filteredUsers.length})</TabsTrigger>
          <TabsTrigger value="teachers">Викладачі ({teachers.length})</TabsTrigger>
          <TabsTrigger value="students">Студенти ({students.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-6">
          {filteredUsers.length > 0 ? (
            <DataTable
              columns={columns}
              data={filteredUsers}
              selectable
              selectedRows={selectedRows}
              onSelectRow={handleSelectRow}
              onSelectAll={handleSelectAll}
            />
          ) : (
            <EmptyState
              icon={Users}
              title="Користувачів не знайдено"
              description="Додайте першого користувача або змініть фільтри"
              action={{
                label: "Додати користувача",
                onClick: () => {},
              }}
            />
          )}
        </TabsContent>
        <TabsContent value="teachers" className="mt-6">
          <DataTable
            columns={columns}
            data={teachers}
            selectable
            selectedRows={selectedRows}
            onSelectRow={handleSelectRow}
            onSelectAll={handleSelectAll}
          />
        </TabsContent>
        <TabsContent value="students" className="mt-6">
          <DataTable
            columns={columns}
            data={students}
            selectable
            selectedRows={selectedRows}
            onSelectRow={handleSelectRow}
            onSelectAll={handleSelectAll}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
