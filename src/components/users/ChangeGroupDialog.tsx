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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { UserWithRole } from "@/hooks/use-users";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Group {
  id: string;
  name: string;
  campus_name: string;
}

interface ChangeGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRole | null;
  onSuccess: () => void;
}

export function ChangeGroupDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: ChangeGroupDialogProps) {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && user) {
      fetchGroups();
      setSelectedGroups(new Set(user.groups.map((g) => g.id)));
    }
  }, [open, user]);

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from("groups")
      .select("id, name, campus_id, campuses:campus_id(name)")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching groups:", error);
      return;
    }

    const groupsWithCampus = (data || []).map((g) => ({
      id: g.id,
      name: g.name,
      campus_name: (g.campuses as unknown as { name: string })?.name || "",
    }));

    setGroups(groupsWithCampus);
  };

  const toggleGroup = (groupId: string) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
    } else {
      newSelected.add(groupId);
    }
    setSelectedGroups(newSelected);
  };

  const handleSubmit = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const currentGroupIds = new Set(user.groups.map((g) => g.id));
      const toAdd = [...selectedGroups].filter((id) => !currentGroupIds.has(id));
      const toRemove = [...currentGroupIds].filter((id) => !selectedGroups.has(id));

      // Determine user role for group membership
      const userRole: AppRole = user.roles.includes("teacher")
        ? "teacher"
        : user.roles.includes("student")
        ? "student"
        : "student";

      // Add new memberships
      if (toAdd.length > 0) {
        const { error: addError } = await supabase
          .from("group_memberships")
          .insert(
            toAdd.map((groupId) => ({
              user_id: user.user_id,
              group_id: groupId,
              role: userRole,
            }))
          );

        if (addError) throw addError;
      }

      // Remove old memberships (set left_at)
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from("group_memberships")
          .update({ left_at: new Date().toISOString() })
          .eq("user_id", user.user_id)
          .in("group_id", toRemove)
          .is("left_at", null);

        if (removeError) throw removeError;
      }

      toast.success("Групи оновлено");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error updating groups:", error);
      toast.error("Помилка оновлення груп");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Змінити групи</DialogTitle>
          <DialogDescription>
            {user.full_name}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Label className="mb-3 block">Оберіть групи</Label>
          <ScrollArea className="h-[300px] border rounded-md p-3">
            <div className="space-y-3">
              {groups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Немає активних груп
                </p>
              ) : (
                groups.map((group) => (
                  <label
                    key={group.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedGroups.has(group.id)}
                      onCheckedChange={() => toggleGroup(group.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{group.name}</p>
                      {group.campus_name && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {group.campus_name}
                        </Badge>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Зберегти
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
