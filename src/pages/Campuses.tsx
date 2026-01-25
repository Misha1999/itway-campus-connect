import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Building2, Users, GraduationCap, MoreHorizontal, MapPin, Phone } from "lucide-react";

interface Campus {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  studentsCount: number;
  teachersCount: number;
  groupsCount: number;
  status: "active" | "archived";
}

// Demo data
const demoCampuses: Campus[] = [
  { 
    id: "1", 
    name: "ITway Долина", 
    city: "Долина", 
    address: "вул. Шевченка, 15",
    phone: "+380341234567",
    studentsCount: 156, 
    teachersCount: 8, 
    groupsCount: 24,
    status: "active"
  },
];

const columns: Column<Campus>[] = [
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
            {row.city}, {row.address}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "phone",
    header: "Контакти",
    cell: (row) => (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Phone className="h-4 w-4" />
        {row.phone}
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
          <DropdownMenuItem>Налаштування</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    className: "w-12",
  },
];

export default function CampusesPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Заклади" 
        description="Керування філіями мережі ITway"
      >
        <Button>
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
              <span className="text-2xl font-semibold text-foreground">1</span>
            </div>
            <p className="text-sm text-muted-foreground">Активних закладів</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold text-foreground">156</div>
            <p className="text-sm text-muted-foreground">Всього студентів</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold text-foreground">8</div>
            <p className="text-sm text-muted-foreground">Викладачів</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold text-foreground">24</div>
            <p className="text-sm text-muted-foreground">Активних груп</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <DataTable columns={columns} data={demoCampuses} />
    </div>
  );
}
