import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ImageUploaderProps {
  bucket: string;
  folder?: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  className?: string;
  aspectRatio?: string;
  maxSizeMB?: number;
}

export function ImageUploader({
  bucket,
  folder = "",
  value,
  onChange,
  className,
  aspectRatio = "16/9",
  maxSizeMB = 5,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Максимальний розмір файлу ${maxSizeMB}MB`);
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Оберіть зображення");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const path = folder ? `${folder}/${fileName}` : fileName;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (error) {
      console.error("Upload error:", error);
      toast.error("Помилка завантаження");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    onChange(urlData.publicUrl);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = async () => {
    if (value) {
      const parts = value.split(`${bucket}/`);
      if (parts.length > 1) {
        await supabase.storage.from(bucket).remove([parts[1]]);
      }
    }
    onChange(null);
  };

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
        disabled={uploading}
      />

      {value ? (
        <div className="relative rounded-lg overflow-hidden border bg-muted" style={{ aspectRatio }}>
          <img src={value} alt="Cover" className="w-full h-full object-cover" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "w-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 p-6 transition-colors",
            "border-muted-foreground/25 hover:border-primary/50 text-muted-foreground",
            uploading && "opacity-50 pointer-events-none"
          )}
          style={{ aspectRatio }}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <>
              <ImageIcon className="h-8 w-8" />
              <span className="text-sm">Натисніть для завантаження</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
