import { useState } from "react";
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
import { Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { UserWithRole } from "@/hooks/use-users";

interface EditCredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRole | null;
  onSuccess: () => void;
}

export function EditCredentialsDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: EditCredentialsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    if (!email && !password) {
      toast.error("Введіть email або пароль для зміни");
      return;
    }

    setLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error("Сесія не знайдена");
        setLoading(false);
        return;
      }

      const response = await supabase.functions.invoke("update-user", {
        body: {
          user_id: user.user_id,
          email: email || undefined,
          password: password || undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success("Облікові дані оновлено");
      setEmail("");
      setPassword("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error updating credentials:", error);
      toast.error(error instanceof Error ? error.message : "Помилка оновлення");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Змінити облікові дані</DialogTitle>
          <DialogDescription>
            {user.full_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="currentEmail">Поточний email</Label>
            <Input
              id="currentEmail"
              value={user.email || user.generated_login || "—"}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newEmail">Новий email (залиште порожнім, якщо не змінюється)</Label>
            <Input
              id="newEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="new.email@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">Новий пароль (залиште порожнім, якщо не змінюється)</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button onClick={handleSubmit} disabled={loading || (!email && !password)}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Зберегти
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
