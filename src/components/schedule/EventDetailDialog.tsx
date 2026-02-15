import { useState } from "react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock,
  MapPin,
  Video,
  User,
  Users,
  Edit,
  Trash2,
  XCircle,
  RotateCcw,
  ExternalLink,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { toast } from "sonner";
import type { ScheduleEvent } from "@/hooks/use-schedule";
import type { Database } from "@/integrations/supabase/types";

type EventType = Database["public"]["Enums"]["event_type"];

const eventTypeLabels: Record<EventType, string> = {
  lesson: "Урок",
  practice: "Практика",
  test: "Контрольна",
  project: "Проєкт",
  other: "Інше",
};

const eventTypeColors: Record<EventType, string> = {
  lesson: "bg-primary",
  practice: "bg-warning",
  test: "bg-destructive",
  project: "bg-chart-4",
  other: "bg-muted",
};

interface EventDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: ScheduleEvent | null;
  onEdit: () => void;
  onDelete: (id: string) => Promise<boolean>;
  onCancel: (id: string, reason: string) => Promise<boolean>;
  onRestore: (id: string) => Promise<boolean>;
}

export function EventDetailDialog({
  open,
  onOpenChange,
  event,
  onEdit,
  onDelete,
  onCancel,
  onRestore,
}: EventDetailDialogProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showApprovalRequest, setShowApprovalRequest] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [approvalReason, setApprovalReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { isAdmin, isCampusAdmin, userId } = useUserRole();

  if (!event) return null;

  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);
  const isOnline = !event.room_id && !event.classroom_id;
  const isPastEvent = endDate < new Date();
  const needsApproval = isPastEvent && isCampusAdmin && !isAdmin;

  const handleDeleteClick = () => {
    if (needsApproval) {
      setShowApprovalRequest(true);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const handleRequestApproval = async () => {
    if (!approvalReason.trim() || !userId) return;
    setLoading(true);
    const { error } = await supabase
      .from("schedule_deletion_requests")
      .insert({
        requested_by: userId,
        reason: approvalReason,
        event_ids: [event.id],
        event_snapshot: [{
          id: event.id,
          title: event.title,
          start_time: event.start_time,
          end_time: event.end_time,
          group_name: event.group_name,
          teacher_name: event.teacher_name,
        }],
      });
    setLoading(false);
    if (error) {
      toast.error("Помилка створення запиту");
      return;
    }
    toast.success("Запит на видалення відправлено адміністратору мережі");
    setShowApprovalRequest(false);
    setApprovalReason("");
    onOpenChange(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    const success = await onDelete(event.id);
    setLoading(false);
    if (success) {
      setShowDeleteConfirm(false);
      onOpenChange(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    setLoading(true);
    const success = await onCancel(event.id, cancelReason);
    setLoading(false);
    if (success) {
      setShowCancelConfirm(false);
      setCancelReason("");
      onOpenChange(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    const success = await onRestore(event.id);
    setLoading(false);
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className={`w-1 h-12 rounded-full ${eventTypeColors[event.event_type]}`} />
              <div className="flex-1">
                <DialogTitle className="text-xl">{event.title}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={event.is_cancelled ? "destructive" : "outline"}>
                    {event.is_cancelled ? "Скасовано" : eventTypeLabels[event.event_type]}
                  </Badge>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Cancelled reason */}
            {event.is_cancelled && event.cancelled_reason && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive font-medium">Причина скасування:</p>
                <p className="text-sm text-muted-foreground">{event.cancelled_reason}</p>
              </div>
            )}

            {/* Date & Time */}
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {format(startDate, "EEEE, d MMMM yyyy", { locale: uk })}
                </p>
                <p className="text-muted-foreground">
                  {format(startDate, "HH:mm")} - {format(endDate, "HH:mm")}
                </p>
              </div>
            </div>

            <Separator />

            {/* Group */}
            <div className="flex items-center gap-3 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Група</p>
                <p className="font-medium">{event.group_name || "—"}</p>
              </div>
            </div>

            {/* Teacher */}
            {event.teacher_name && (
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Викладач</p>
                  <p className="font-medium">{event.teacher_name}</p>
                </div>
              </div>
            )}

            {/* Location */}
            <div className="flex items-center gap-3 text-sm">
              {isOnline ? (
                <Video className="h-4 w-4 text-muted-foreground" />
              ) : (
                <MapPin className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <p className="text-muted-foreground">
                  {isOnline ? "Формат" : "Аудиторія"}
                </p>
                <p className="font-medium">
                  {isOnline ? "Онлайн" : (event.classroom_name || event.room_name || "—")}
                </p>
              </div>
            </div>

            {/* Online Link */}
            {event.online_link && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={event.online_link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Приєднатися до зустрічі
                  </a>
                </Button>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Опис</p>
                  <p className="text-sm">{event.description}</p>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-2 flex-1">
              {event.is_cancelled ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRestore}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  )}
                  Відновити
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCancelConfirm(true)}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Скасувати
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteClick}
                title={needsApproval ? "Потребує схвалення" : undefined}
              >
                {needsApproval ? <ShieldAlert className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
            <Button size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Редагувати
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити подію?</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете видалити "{event.title}"? Цю дію неможливо скасувати.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Видалити"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Скасувати подію?</AlertDialogTitle>
            <AlertDialogDescription>
              Вкажіть причину скасування події "{event.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="cancelReason">Причина скасування</Label>
            <Input
              id="cancelReason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Наприклад: Хвороба викладача"
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelReason("")}>
              Назад
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={!cancelReason.trim() || loading}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Скасувати подію"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approval Request for past event deletion */}
      <AlertDialog open={showApprovalRequest} onOpenChange={setShowApprovalRequest}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-warning" />
              Запит на видалення
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ця подія вже відбулась. Для видалення потрібне схвалення адміністратора мережі.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-3">
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium">{event.title}</p>
              <p className="text-muted-foreground">
                {format(startDate, "d MMMM yyyy, HH:mm", { locale: uk })}
              </p>
            </div>
            <div>
              <Label htmlFor="approvalReason">Причина видалення</Label>
              <Textarea
                id="approvalReason"
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                placeholder="Опишіть причину видалення минулої події..."
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setApprovalReason("")}>
              Скасувати
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRequestApproval}
              disabled={!approvalReason.trim() || loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Надіслати запит"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
