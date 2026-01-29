import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Plus, Search, MoreHorizontal, Upload, Users, Eye, Pencil, UserPlus, Archive, ArchiveRestore } from "lucide-react";
import { useUsers, type UserWithRole } from "@/hooks/use-users";
import {
  AddUserDialog,
  UserProfileDialog,
  EditUserDialog,
  ChangeGroupDialog,
  ArchiveUserDialog,
} from "@/components/users";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const roleLabels: Record<AppRole, string> = {
  admin_network: "Адмін мережі",
  admin_campus: "Адмін закладу",
  teacher: "Викладач",
  student: "Студент",
  parent_viewer: "Батьки",
};

interface UserActionsProps {
  user: UserWithRole;
  onViewProfile: (user: UserWithRole) => void;
  onEdit: (user: UserWithRole) => void;
  onChangeGroup: (user: UserWithRole) => void;
  onArchive: (user: UserWithRole) => void;
}

function UserActions({ user, onViewProfile, onEdit, onChangeGroup, onArchive }: UserActionsProps) {
  const isArchived = user.status === "archived";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onViewProfile(user)}>
          <Eye className="h-4 w-4 mr-2" />
          Переглянути профіль
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(user)}>
          <Pencil className="h-4 w-4 mr-2" />
          Редагувати
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChangeGroup(user)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Змінити групу
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => onArchive(user)}
          className={isArchived ? "" : "text-destructive"}
        >
          {isArchived ? (
            <>
              <ArchiveRestore className="h-4 w-4 mr-2" />
              Активувати
            </>
          ) : (
            <>
              <Archive className="h-4 w-4 mr-2" />
              Архівувати
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function UsersPage() {
  const { users, campuses, loading, refetch } = useUsers();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showAddUser, setShowAddUser] = useState(false);

  // Dialog states
  const [profileDialog, setProfileDialog] = useState<{ open: boolean; user: UserWithRole | null }>({
    open: false,
    user: null,
  });
  const [editDialog, setEditDialog] = useState<{ open: boolean; user: UserWithRole | null }>({
    open: false,
    user: null,
  });
  const [groupDialog, setGroupDialog] = useState<{ open: boolean; user: UserWithRole | null }>({
    open: false,
    user: null,
  });
  const [archiveDialog, setArchiveDialog] = useState<{ open: boolean; user: UserWithRole | null }>({
    open: false,
    user: null,
  });

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (user.email?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (user.phone?.includes(search) ?? false);

    const matchesRole = roleFilter === "all" || user.roles.includes(roleFilter as AppRole);
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
      setSelectedRows(new Set(filteredUsers.map((u) => u.id)));
    }
  };

  const teachers = filteredUsers.filter((u) => u.roles.includes("teacher"));
  const students = filteredUsers.filter((u) => u.roles.includes("student"));

  const getColumns = (): Column<UserWithRole>[] => [
    {
      key: "name",
      header: "Користувач",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {row.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">{row.full_name}</p>
            <p className="text-sm text-muted-foreground">{row.email || row.phone || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Роль",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles.length > 0 ? (
            row.roles.map((role) => (
              <Badge key={role} variant="outline">
                {roleLabels[role]}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      key: "groups",
      header: "Групи",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.groups.slice(0, 2).map((group) => (
            <Badge key={group.id} variant="secondary" className="text-xs">
              {group.name}
            </Badge>
          ))}
          {row.groups.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{row.groups.length - 2}
            </Badge>
          )}
          {row.groups.length === 0 && <span className="text-muted-foreground">—</span>}
        </div>
      ),
    },
    {
      key: "phone",
      header: "Телефон",
      cell: (row) => <span className="text-muted-foreground">{row.phone || "—"}</span>,
    },
    {
      key: "status",
      header: "Статус",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <UserActions
          user={row}
          onViewProfile={(u) => setProfileDialog({ open: true, user: u })}
          onEdit={(u) => setEditDialog({ open: true, user: u })}
          onChangeGroup={(u) => setGroupDialog({ open: true, user: u })}
          onArchive={(u) => setArchiveDialog({ open: true, user: u })}
        />
      ),
      className: "w-12",
    },
  ];

  const columns = getColumns();

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Користувачі" description="Керування користувачами системи">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
        </PageHeader>
        <div className="space-y-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1 max-w-sm" />
            <Skeleton className="h-10 w-[150px]" />
            <Skeleton className="h-10 w-[150px]" />
          </div>
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Користувачі" description="Керування користувачами системи">
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Імпорт CSV
        </Button>
        <Button onClick={() => setShowAddUser(true)}>
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
          <span className="text-sm font-medium">Вибрано: {selectedRows.size}</span>
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
              getRowId={(row) => row.id}
            />
          ) : (
            <EmptyState
              icon={Users}
              title="Користувачів не знайдено"
              description="Додайте першого користувача або змініть фільтри"
              action={{
                label: "Додати користувача",
                onClick: () => setShowAddUser(true),
              }}
            />
          )}
        </TabsContent>
        <TabsContent value="teachers" className="mt-6">
          {teachers.length > 0 ? (
            <DataTable
              columns={columns}
              data={teachers}
              selectable
              selectedRows={selectedRows}
              onSelectRow={handleSelectRow}
              onSelectAll={handleSelectAll}
              getRowId={(row) => row.id}
            />
          ) : (
            <EmptyState
              icon={Users}
              title="Викладачів не знайдено"
              description="Додайте викладача до системи"
              action={{
                label: "Додати викладача",
                onClick: () => setShowAddUser(true),
              }}
            />
          )}
        </TabsContent>
        <TabsContent value="students" className="mt-6">
          {students.length > 0 ? (
            <DataTable
              columns={columns}
              data={students}
              selectable
              selectedRows={selectedRows}
              onSelectRow={handleSelectRow}
              onSelectAll={handleSelectAll}
              getRowId={(row) => row.id}
            />
          ) : (
            <EmptyState
              icon={Users}
              title="Студентів не знайдено"
              description="Додайте студента до системи"
              action={{
                label: "Додати студента",
                onClick: () => setShowAddUser(true),
              }}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddUserDialog
        open={showAddUser}
        onOpenChange={setShowAddUser}
        campuses={campuses}
        onSuccess={refetch}
      />

      <UserProfileDialog
        open={profileDialog.open}
        onOpenChange={(open) => setProfileDialog({ ...profileDialog, open })}
        user={profileDialog.user}
      />

      <EditUserDialog
        open={editDialog.open}
        onOpenChange={(open) => setEditDialog({ ...editDialog, open })}
        user={editDialog.user}
        onSuccess={refetch}
      />

      <ChangeGroupDialog
        open={groupDialog.open}
        onOpenChange={(open) => setGroupDialog({ ...groupDialog, open })}
        user={groupDialog.user}
        onSuccess={refetch}
      />

      <ArchiveUserDialog
        open={archiveDialog.open}
        onOpenChange={(open) => setArchiveDialog({ ...archiveDialog, open })}
        user={archiveDialog.user}
        onSuccess={refetch}
      />
    </div>
  );
}
