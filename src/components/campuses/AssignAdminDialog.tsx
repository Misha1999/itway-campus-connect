import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AssignAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campusId: string;
  campusName: string;
  onSuccess: () => void;
}

interface UserOption {
  user_id: string;
  full_name: string;
}

export function AssignAdminDialog({
  open,
  onOpenChange,
  campusId,
  campusName,
  onSuccess,
}: AssignAdminDialogProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  useEffect(() => {
    if (open) {
      fetchAvailableUsers();
    }
  }, [open, campusId]);

  const fetchAvailableUsers = async () => {
    // Get all profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .eq("status", "active")
      .order("full_name");

    if (!profiles) return;

    // Get users already admin of this campus
    const { data: existingAdmins } = await supabase
      .from("campus_memberships")
      .select("user_id")
      .eq("campus_id", campusId)
      .eq("role", "admin_campus");

    const existingAdminIds = new Set((existingAdmins || []).map((a) => a.user_id));

    // Filter out existing admins
    const availableUsers = profiles.filter(
      (p) => !existingAdminIds.has(p.user_id)
    );

    setUsers(availableUsers);
  };

  const handleSubmit = async () => {
    if (!selectedUserId) return;

    setLoading(true);

    try {
      // Add campus membership
      const { error: membershipError } = await supabase
        .from("campus_memberships")
        .insert({
          user_id: selectedUserId,
          campus_id: campusId,
          role: "admin_campus",
        });

      if (membershipError) throw membershipError;

      // Check if user already has admin_campus role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", selectedUserId)
        .eq("role", "admin_campus")
        .maybeSingle();

      // Add role if not exists
      if (!existingRole) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: selectedUserId,
            role: "admin_campus",
          });

        if (roleError) throw roleError;
      }

      toast.success("Адміністратора призначено");
      setSelectedUserId("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error assigning admin:", error);
      toast.error("Помилка призначення адміністратора");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Призначити адміністратора</DialogTitle>
          <DialogDescription>
            Заклад: {campusName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Користувач</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть користувача" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedUserId}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Призначити
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
