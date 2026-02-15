import { useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2, File, Plus, X, FileText, Upload, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MaterialsBlock } from "@/types/material-blocks";

interface MaterialsBlockEditorProps {
  block: MaterialsBlock;
  onChange: (data: MaterialsBlock['data']) => void;
}

export function MaterialsBlockEditor({ block, onChange }: MaterialsBlockEditorProps) {
  const { data } = block;
  const [newItemType, setNewItemType] = useState<'link' | 'file'>('link');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemUrl, setNewItemUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addItem = () => {
    if (!newItemTitle.trim() || !newItemUrl.trim()) return;

    const newItem = {
      id: crypto.randomUUID(),
      type: newItemType,
      title: newItemTitle.trim(),
      url: newItemUrl.trim(),
    };

    onChange({ items: [...data.items, newItem] });
    setNewItemTitle('');
    setNewItemUrl('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Максимальний розмір 50MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const path = `files/${fileName}`;

    const { data: uploadData, error } = await supabase.storage
      .from("materials")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (error) {
      console.error("Upload error:", error);
      toast.error("Помилка завантаження файлу");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("materials")
      .getPublicUrl(uploadData.path);

    const newItem = {
      id: crypto.randomUUID(),
      type: 'file' as const,
      title: file.name,
      url: urlData.publicUrl,
    };

    onChange({ items: [...data.items, newItem] });
    setUploading(false);
    toast.success("Файл завантажено");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeItem = (id: string) => {
    onChange({ items: data.items.filter(item => item.id !== id) });
  };

  return (
    <div className="space-y-4">
      {/* Existing items */}
      {data.items.length > 0 && (
        <div className="space-y-2">
          <Label>Додані матеріали</Label>
          <div className="space-y-2">
            {data.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50"
              >
                {item.type === 'link' ? (
                  <Link2 className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.url}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {item.type === 'link' ? 'Посилання' : 'Файл'}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => removeItem(item.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add new item */}
      <div className="space-y-3 p-4 rounded-lg border border-dashed">
        <div className="flex gap-2">
          <Select value={newItemType} onValueChange={(v) => setNewItemType(v as 'link' | 'file')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="link">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Посилання
                </div>
              </SelectItem>
              <SelectItem value="file">
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4" />
                  Файл
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {newItemType === 'link' ? (
          <>
            <Input
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              placeholder="Назва"
            />
            <Input
              value={newItemUrl}
              onChange={(e) => setNewItemUrl(e.target.value)}
              placeholder="https://..."
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              disabled={!newItemTitle.trim() || !newItemUrl.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Додати посилання
            </Button>
          </>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-1" />
              )}
              {uploading ? "Завантаження..." : "Завантажити файл"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
