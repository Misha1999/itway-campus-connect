import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Coins, Plus, TrendingUp, Gift, Trophy, Search, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface Student {
  id: string;
  name: string;
  group: string;
  balance: number;
  thisMonth: number;
}

interface Transaction {
  id: string;
  student: string;
  amount: number;
  reason: string;
  createdBy: string;
  createdAt: string;
}

// Demo data
const demoStudents: Student[] = [
  { id: "1", name: "Олександр Коваль", group: "PY-2024-A", balance: 450, thisMonth: 120 },
  { id: "2", name: "Марія Шевченко", group: "PY-2024-A", balance: 380, thisMonth: 85 },
  { id: "3", name: "Іван Бондаренко", group: "WD-2024-B", balance: 520, thisMonth: 150 },
  { id: "4", name: "Анна Петренко", group: "WD-2024-B", balance: 290, thisMonth: 60 },
  { id: "5", name: "Дмитро Сидоренко", group: "RB-2024-C", balance: 410, thisMonth: 95 },
  { id: "6", name: "Софія Мельник", group: "RB-2024-C", balance: 350, thisMonth: 70 },
];

const demoTransactions: Transaction[] = [
  { id: "1", student: "Олександр Коваль", amount: 50, reason: "Відмінне виконання ДЗ", createdBy: "Марія Петренко", createdAt: "25.01.2025 14:30" },
  { id: "2", student: "Іван Бондаренко", amount: 100, reason: "Перемога у проєкті", createdBy: "Іван Сидоренко", createdAt: "24.01.2025 16:45" },
  { id: "3", student: "Марія Шевченко", amount: 30, reason: "Активність на уроці", createdBy: "Марія Петренко", createdAt: "24.01.2025 11:20" },
  { id: "4", student: "Дмитро Сидоренко", amount: -20, reason: "Штраф за запізнення", createdBy: "Олена Коваль", createdAt: "23.01.2025 15:00" },
  { id: "5", student: "Софія Мельник", amount: 40, reason: "Допомога одногрупнику", createdBy: "Олена Коваль", createdAt: "22.01.2025 12:30" },
];

function AwardCoinsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Нарахувати монети
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Нарахувати монети</DialogTitle>
          <DialogDescription>
            Виберіть студента та вкажіть кількість монет і причину
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Студент</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Виберіть студента" />
              </SelectTrigger>
              <SelectContent>
                {demoStudents.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name} ({student.group})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Кількість монет</Label>
            <Input type="number" placeholder="50" />
          </div>
          <div className="space-y-2">
            <Label>Причина</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Виберіть причину" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hw">Відмінне ДЗ</SelectItem>
                <SelectItem value="activity">Активність на уроці</SelectItem>
                <SelectItem value="project">Успішний проєкт</SelectItem>
                <SelectItem value="help">Допомога іншим</SelectItem>
                <SelectItem value="attendance">100% відвідуваність</SelectItem>
                <SelectItem value="other">Інше</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Коментар (опціонально)</Label>
            <Textarea placeholder="Додатковий коментар..." />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline">Скасувати</Button>
            <Button>Нарахувати</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CoinsPage() {
  const [search, setSearch] = useState("");

  const filteredStudents = demoStudents.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.group.toLowerCase().includes(search.toLowerCase())
  );

  // Sort by balance descending
  const sortedStudents = [...filteredStudents].sort((a, b) => b.balance - a.balance);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Монети" 
        description="Гейміфікація та система винагород"
      >
        <AwardCoinsDialog />
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-warning" />
              <span className="text-2xl font-semibold text-foreground">2,400</span>
            </div>
            <p className="text-sm text-muted-foreground">Видано цього місяця</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              <span className="text-2xl font-semibold text-foreground">+18%</span>
            </div>
            <p className="text-sm text-muted-foreground">Порівняно з минулим</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              <span className="text-2xl font-semibold text-foreground">156</span>
            </div>
            <p className="text-sm text-muted-foreground">Транзакцій</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-warning" />
              <span className="text-2xl font-semibold text-foreground">12</span>
            </div>
            <p className="text-sm text-muted-foreground">Бейджів видано</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Leaderboard */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">Рейтинг студентів</CardTitle>
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Пошук..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedStudents.map((student, index) => (
              <div key={student.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <span className="w-6 text-center font-semibold text-muted-foreground">
                  {index + 1}
                </span>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {student.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{student.name}</p>
                  <p className="text-sm text-muted-foreground">{student.group}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 font-semibold text-foreground">
                    <Coins className="h-4 w-4 text-warning" />
                    {student.balance}
                  </div>
                  <p className="text-xs text-success">+{student.thisMonth} цього місяця</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent transactions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium">Останні транзакції</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {demoTransactions.map((tx) => (
              <div key={tx.id} className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
                <div className={`p-2 rounded-lg ${tx.amount > 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                  {tx.amount > 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-success" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{tx.student}</p>
                  <p className="text-sm text-muted-foreground">{tx.reason}</p>
                  <p className="text-xs text-muted-foreground mt-1">{tx.createdBy} • {tx.createdAt}</p>
                </div>
                <div className={`font-semibold ${tx.amount > 0 ? 'text-success' : 'text-destructive'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
