import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { CampusMultiSelect } from "@/components/shared/CampusMultiSelect";
import { useCampuses } from "@/hooks/use-campuses";

interface AddCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    description?: string;
    level?: string;
    campus_ids?: string[];
    cover_image_url?: string | null;
  }) => Promise<void>;
}

const LEVELS = [
  { value: 'beginner', label: 'Початковий' },
  { value: 'intermediate', label: 'Середній' },
  { value: 'advanced', label: 'Просунутий' },
];

export function AddCourseDialog({ open, onOpenChange, onSubmit }: AddCourseDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<string>("");
  const [campusIds, setCampusIds] = useState<string[]>([]);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { campuses } = useCampuses();

  const handleSubmit = async () => {
    if (!name.trim()) return;
    
    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        level: level || undefined,
        campus_ids: campusIds,
        cover_image_url: coverImageUrl,
      });
      setName("");
      setDescription("");
      setLevel("");
      setCampusIds([]);
      setCoverImageUrl(null);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Новий курс</DialogTitle>
          <DialogDescription>
            Створіть курс з темами та уроками
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Обкладинка курсу</Label>
            <ImageUploader
              bucket="course-assets"
              folder="covers"
              value={coverImageUrl}
              onChange={setCoverImageUrl}
              aspectRatio="16/9"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Назва курсу *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Наприклад: Основи програмування (Python)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Опис</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Короткий опис курсу"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Рівень</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть рівень" />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <CampusMultiSelect
            campuses={campuses}
            selected={campusIds}
            onChange={setCampusIds}
            label="Доступний для філій"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Створити
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
