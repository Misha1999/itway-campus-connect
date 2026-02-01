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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddStudyProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campusId: string;
  onSuccess: () => void;
}

export function AddStudyProgramDialog({
  open,
  onOpenChange,
  campusId,
  onSuccess,
}: AddStudyProgramDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const resetForm = () => {
    setName("");
    setDescription("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setLoading(true);

    const { error } = await supabase.from("study_programs").insert({
      name: name.trim(),
      description: description.trim() || null,
      campus_id: campusId,
    });

    if (error) {
      console.error("Error creating study program:", error);
      toast.error("Помилка створення програми");
    } else {
      toast.success(`Програму "${name}" створено`);
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
          <DialogTitle>Нова програма навчання</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Назва *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Python для початківців"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Опис</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Короткий опис програми навчання..."
              rows={3}
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
