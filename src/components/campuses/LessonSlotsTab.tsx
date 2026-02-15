import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
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
  Plus,
  MoreHorizontal,
  Pencil,
  Archive,
  Trash2,
  Clock,
} from "lucide-react";
import {
  type LessonSlot,
  getDayName,
  formatTime,
  formatEndTime,
} from "@/hooks/use-lesson-slots";
import { LessonSlotDialog } from "./LessonSlotDialog";

interface StudyProgram {
  id: string;
  name: string;
  is_active: boolean;
}

interface LessonSlotsTabProps {
  slots: LessonSlot[];
  loading: boolean;
  programs: StudyProgram[];
  onSave: (data: any) => Promise<boolean>;
  onUpdate: (id: string, data: any) => Promise<boolean>;
  onToggleActive: (id: string, isActive: boolean) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export function LessonSlotsTab({
  slots,
  loading,
  programs,
  onSave,
  onUpdate,
  onToggleActive,
  onDelete,
}: LessonSlotsTabProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingSlot, setEditingSlot] = useState<LessonSlot | null>(null);

  const handleEdit = (slot: LessonSlot) => {
    setEditingSlot(slot);
    setShowDialog(true);
  };

  const handleNew = () => {
    setEditingSlot(null);
    setShowDialog(true);
  };

  const columns: Column<LessonSlot>[] = [
    {
      key: "day",
      header: "День",
      cell: (row) => (
        <span className="font-medium text-foreground">{getDayName(row.day_of_week)}</span>
      ),
    },
    {
      key: "time",
      header: "Час",
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-foreground">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          {formatTime(row.start_time)} – {formatEndTime(row.start_time, row.duration_minutes)}
          <span className="text-muted-foreground text-xs">({row.duration_minutes} хв)</span>
        </div>
      ),
    },
    {
      key: "name",
      header: "Назва",
      cell: (row) => (
        <span className="text-foreground">{row.name || "—"}</span>
      ),
    },
    {
      key: "type",
      header: "Тип",
      cell: (row) =>
        row.is_global ? (
          <Badge variant="secondary">Глобальний</Badge>
        ) : (
          <Badge variant="outline">{row.program_name || "Індивідуальний"}</Badge>
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
            <DropdownMenuItem onClick={() => handleEdit(row)}>
              <Pencil className="h-4 w-4 mr-2" />
              Редагувати
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleActive(row.id, !row.is_active)}>
              <Archive className="h-4 w-4 mr-2" />
              {row.is_active ? "Деактивувати" : "Активувати"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(row.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Видалити
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-12",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40 ml-auto" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          Новий слот
        </Button>
      </div>

      {slots.length > 0 ? (
        <DataTable columns={columns} data={slots} />
      ) : (
        <EmptyState
          icon={Clock}
          title="Слотів ще немає"
          description="Створіть часові слоти для уроків цього закладу"
          action={{
            label: "Створити слот",
            onClick: handleNew,
          }}
        />
      )}

      <LessonSlotDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        slot={editingSlot}
        programs={programs}
        onSave={onSave}
        onUpdate={onUpdate}
      />
    </div>
  );
}
