import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddEnrollmentCohortDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campusId: string;
  onSuccess: () => void;
}

export function AddEnrollmentCohortDialog({
  open,
  onOpenChange,
  campusId,
  onSuccess,
}: AddEnrollmentCohortDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");

  const resetForm = () => {
    setName("");
    setStartDate("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setLoading(true);

    const { error } = await supabase.from("enrollment_cohorts").insert({
      name: name.trim(),
      start_date: startDate || null,
      campus_id: campusId,
    });

    if (error) {
      console.error("Error creating cohort:", error);
      toast.error("Помилка створення потоку");
    } else {
      toast.success(`Потік "${name}" створено`);
      resetForm();
      onOpenChange(false);
      onSuccess();
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Новий потік набору</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Назва *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Осінь 2024"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Дата старту</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Створити
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
