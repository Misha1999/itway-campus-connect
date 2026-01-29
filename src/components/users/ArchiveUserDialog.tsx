import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { UserWithRole } from "@/hooks/use-users";

interface ArchiveUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRole | null;
  onSuccess: () => void;
}

export function ArchiveUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: ArchiveUserDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleArchive = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const newStatus = user.status === "archived" ? "active" : "archived";

      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", user.id);

      if (error) throw error;

      toast.success(
        newStatus === "archived"
          ? `${user.full_name} архівовано`
          : `${user.full_name} активовано`
      );
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error("Помилка зміни статусу");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const isArchived = user.status === "archived";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isArchived ? "Активувати користувача?" : "Архівувати користувача?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isArchived
              ? `Користувач ${user.full_name} буде відновлено і він зможе входити в систему.`
              : `Користувач ${user.full_name} буде архівовано. Він не зможе входити в систему, але дані збережуться.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Скасувати</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleArchive}
            disabled={loading}
            className={isArchived ? "" : "bg-destructive hover:bg-destructive/90"}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isArchived ? "Активувати" : "Архівувати"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
