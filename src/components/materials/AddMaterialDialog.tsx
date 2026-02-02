import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Badge } from "@/components/ui/badge";
import { Loader2, X } from "lucide-react";
import { useMaterials, type MaterialContentType, type MaterialStatus } from "@/hooks/use-materials";

const typeLabels: Record<MaterialContentType, string> = {
  file: "Файл",
  video: "Відео",
  link: "Посилання",
  text: "Текст",
  homework: "Домашня робота",
  test: "Тест",
};

interface Campus {
  id: string;
  name: string;
  city: string;
}

interface AddMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campuses: Campus[];
}

export function AddMaterialDialog({
  open,
  onOpenChange,
  campuses,
}: AddMaterialDialogProps) {
  const { createMaterial } = useMaterials();
  
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [campusId, setCampusId] = useState("");
  const [contentType, setContentType] = useState<MaterialContentType>("file");
  const [status, setStatus] = useState<MaterialStatus>("draft");
  const [contentText, setContentText] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setCampusId(campuses[0]?.id || "");
      setContentType("file");
      setStatus("draft");
      setContentText("");
      setExternalUrl("");
      setTagInput("");
      setTags([]);
    }
  }, [open, campuses]);

  const isValid = title.trim() && campusId;

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async () => {
    if (!isValid) return;

    setLoading(true);
    try {
      await createMaterial({
        campus_id: campusId,
        title: title.trim(),
        description: description.trim() || null,
        content_type: contentType,
        content_text: contentType === 'text' ? contentText : null,
        external_url: ['video', 'link'].includes(contentType) ? externalUrl : null,
        tags,
        status,
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Новий матеріал</DialogTitle>
          <DialogDescription>Створіть навчальний матеріал для бібліотеки</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Campus */}
          <div className="space-y-2">
            <Label>Заклад *</Label>
            <Select value={campusId} onValueChange={setCampusId}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть заклад" />
              </SelectTrigger>
              <SelectContent>
                {campuses.map((campus) => (
                  <SelectItem key={campus.id} value={campus.id}>
                    {campus.name} ({campus.city})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Назва *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введіть назву матеріалу"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Опис</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Короткий опис матеріалу"
              rows={3}
            />
          </div>

          {/* Content Type */}
          <div className="space-y-2">
            <Label>Тип контенту</Label>
            <Select value={contentType} onValueChange={(v) => setContentType(v as MaterialContentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content based on type */}
          {contentType === 'text' && (
            <div className="space-y-2">
              <Label htmlFor="contentText">Текст матеріалу</Label>
              <Textarea
                id="contentText"
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                placeholder="Введіть текст матеріалу"
                rows={5}
              />
            </div>
          )}

          {['video', 'link'].includes(contentType) && (
            <div className="space-y-2">
              <Label htmlFor="externalUrl">URL {contentType === 'video' ? 'відео' : 'посилання'}</Label>
              <Input
                id="externalUrl"
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          )}

          {contentType === 'file' && (
            <div className="space-y-2">
              <Label>Файл</Label>
              <p className="text-sm text-muted-foreground">
                Завантаження файлів буде доступно після створення матеріалу
              </p>
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            <Label>Теги</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Введіть тег"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Додати
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Статус</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as MaterialStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Чернетка</SelectItem>
                <SelectItem value="published">Опублікувати</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !isValid}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Створити
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
