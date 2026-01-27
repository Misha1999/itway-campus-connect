import { useState, useCallback } from "react";
import { Upload, X, FileText, Image, Video, File, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UploadedFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

interface FileUploaderProps {
  bucket: string;
  folder?: string;
  onFilesChange: (urls: string[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  existingFiles?: string[];
}

const fileTypeIcons: Record<string, typeof FileText> = {
  image: Image,
  video: Video,
  document: FileText,
  default: File,
};

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return fileTypeIcons.image;
  if (mimeType.startsWith("video/")) return fileTypeIcons.video;
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("word")) {
    return fileTypeIcons.document;
  }
  return fileTypeIcons.default;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function FileUploader({
  bucket,
  folder = "",
  onFilesChange,
  maxFiles = 10,
  maxSizeMB = 50,
  accept,
  existingFiles = [],
}: FileUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const uploadFile = async (file: File): Promise<UploadedFile | null> => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(`Файл "${file.name}" перевищує ліміт ${maxSizeMB}MB`);
      return null;
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      toast.error(`Помилка завантаження "${file.name}"`);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      name: file.name,
      url: urlData.publicUrl,
      size: file.size,
      type: file.type,
    };
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const remainingSlots = maxFiles - files.length;
    if (remainingSlots <= 0) {
      toast.error(`Максимум ${maxFiles} файлів`);
      return;
    }

    const filesToUpload = Array.from(fileList).slice(0, remainingSlots);
    setUploading(true);
    setUploadProgress(0);

    const uploadedFiles: UploadedFile[] = [];
    
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const result = await uploadFile(file);
      if (result) {
        uploadedFiles.push(result);
      }
      setUploadProgress(((i + 1) / filesToUpload.length) * 100);
    }

    const newFiles = [...files, ...uploadedFiles];
    setFiles(newFiles);
    onFilesChange(newFiles.map(f => f.url));
    setUploading(false);
    setUploadProgress(0);

    if (uploadedFiles.length > 0) {
      toast.success(`Завантажено ${uploadedFiles.length} файл(ів)`);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [files.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  const removeFile = async (index: number) => {
    const fileToRemove = files[index];
    
    // Extract path from URL for deletion
    const urlParts = fileToRemove.url.split(`${bucket}/`);
    if (urlParts.length > 1) {
      const filePath = urlParts[1];
      await supabase.storage.from(bucket).remove([filePath]);
    }

    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesChange(newFiles.map(f => f.url));
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          dragActive 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/25 hover:border-primary/50",
          uploading && "pointer-events-none opacity-50"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept={accept}
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading || files.length >= maxFiles}
        />
        
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          ) : (
            <Upload className="h-10 w-10 text-muted-foreground" />
          )}
          
          <div className="text-sm">
            <span className="font-medium text-foreground">
              Перетягніть файли сюди
            </span>
            <span className="text-muted-foreground"> або клікніть для вибору</span>
          </div>
          
          <p className="text-xs text-muted-foreground">
            До {maxFiles} файлів, макс. {maxSizeMB}MB кожен
          </p>
        </div>

        {uploading && (
          <div className="mt-4">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Завантаження... {Math.round(uploadProgress)}%
            </p>
          </div>
        )}
      </div>

      {/* Uploaded files list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Завантажені файли ({files.length}/{maxFiles})
          </p>
          <div className="grid gap-2">
            {files.map((file, index) => {
              const Icon = getFileIcon(file.type);
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="p-2 rounded-md bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
