import { useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Image, Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MediaBlock } from "@/types/material-blocks";

interface MediaBlockEditorProps {
  block: MediaBlock;
  onChange: (data: MediaBlock['data']) => void;
}

export function MediaBlockEditor({ block, onChange }: MediaBlockEditorProps) {
  const { data } = block;
  const [inputMode, setInputMode] = useState<'url' | 'upload'>('url');
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Оберіть зображення");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Максимальний розмір 10MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const path = `images/${fileName}`;

    const { data: uploadData, error } = await supabase.storage
      .from("materials")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (error) {
      console.error("Upload error:", error);
      toast.error("Помилка завантаження");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("materials")
      .getPublicUrl(uploadData.path);

    onChange({ ...data, url: urlData.publicUrl });
    setUploading(false);
    toast.success("Зображення завантажено");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={inputMode === 'url' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setInputMode('url')}
        >
          URL
        </Button>
        <Button
          type="button"
          variant={inputMode === 'upload' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setInputMode('upload')}
        >
          <Upload className="h-4 w-4 mr-1" />
          Завантажити
        </Button>
      </div>

      {inputMode === 'url' ? (
        <div className="space-y-2">
          <Label htmlFor={`url-${block.id}`}>URL зображення</Label>
          <Input
            id={`url-${block.id}`}
            type="url"
            value={data.url}
            onChange={(e) => onChange({ ...data, url: e.target.value })}
            placeholder="https://..."
          />
        </div>
      ) : (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
          >
            {uploading ? (
              <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin mb-2" />
            ) : (
              <Image className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            )}
            <p className="text-sm text-muted-foreground">
              {uploading ? "Завантаження..." : "Натисніть для вибору зображення"}
            </p>
          </button>
        </div>
      )}

      {data.url && (
        <div className="relative rounded-lg overflow-hidden border bg-muted">
          <img
            src={data.url}
            alt={data.alt || 'Preview'}
            className="max-h-48 w-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6"
            onClick={() => onChange({ ...data, url: '' })}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={`caption-${block.id}`}>Підпис (необов'язково)</Label>
        <Input
          id={`caption-${block.id}`}
          value={data.caption || ''}
          onChange={(e) => onChange({ ...data, caption: e.target.value })}
          placeholder="Опис зображення"
        />
      </div>
    </div>
  );
}
