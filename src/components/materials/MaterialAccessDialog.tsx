import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Trash2, Building2, GraduationCap, Clock, Users } from "lucide-react";
import { useMaterials, type Material, type AccessType } from "@/hooks/use-materials";
import { useGroups } from "@/hooks/use-groups";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const accessTypeLabels: Record<AccessType, string> = {
  campus: "Заклад",
  study_program: "Програма навчання",
  enrollment_cohort: "Потік набору",
  group: "Група",
  user: "Користувач",
};

const accessTypeIcons: Record<AccessType, React.ElementType> = {
  campus: Building2,
  study_program: GraduationCap,
  enrollment_cohort: Clock,
  group: Users,
  user: Users,
};

interface MaterialAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: Material | null;
}

interface TargetOption {
  id: string;
  name: string;
}

export function MaterialAccessDialog({
  open,
  onOpenChange,
  material,
}: MaterialAccessDialogProps) {
  const { addAccessRule, removeAccessRule, fetchMaterials } = useMaterials();
  const { groups, campuses, studyPrograms, enrollmentCohorts } = useGroups();

  const [accessType, setAccessType] = useState<AccessType>("campus");
  const [targetId, setTargetId] = useState("");
  const [loading, setLoading] = useState(false);

  // Get available targets based on access type
  const getTargets = (): TargetOption[] => {
    switch (accessType) {
      case "campus":
        return campuses.map(c => ({ id: c.id, name: c.name }));
      case "study_program":
        return studyPrograms.map(p => ({ id: p.id, name: p.name }));
      case "enrollment_cohort":
        return enrollmentCohorts.map(c => ({ id: c.id, name: c.name }));
      case "group":
        return groups.map(g => ({ id: g.id, name: g.name }));
      default:
        return [];
    }
  };

  const targets = getTargets();

  useEffect(() => {
    setTargetId("");
  }, [accessType]);

  const handleAddRule = async () => {
    if (!material || !targetId) return;

    setLoading(true);
    try {
      await addAccessRule({
        material_id: material.id,
        access_type: accessType,
        target_id: targetId,
      });
      setTargetId("");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRule = async (ruleId: string) => {
    setLoading(true);
    try {
      await removeAccessRule(ruleId);
    } finally {
      setLoading(false);
    }
  };

  if (!material) return null;

  const existingRules = material.access_rules || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Керування доступом</DialogTitle>
          <DialogDescription>
            Налаштуйте хто має доступ до матеріалу "{material.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Existing access rules */}
          {existingRules.length > 0 && (
            <div className="space-y-3">
              <Label>Поточні правила доступу</Label>
              <div className="space-y-2">
                {existingRules.map((rule) => {
                  const Icon = accessTypeIcons[rule.access_type];
                  const targetName = targets.find(t => t.id === rule.target_id)?.name || rule.target_id;
                  
                  return (
                    <div 
                      key={rule.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-accent/50"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          <span className="text-muted-foreground">
                            {accessTypeLabels[rule.access_type]}:
                          </span>{" "}
                          <span className="font-medium">{targetName}</span>
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleRemoveRule(rule.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {existingRules.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              Правил доступу ще немає. Додайте правило нижче.
            </div>
          )}

          <Separator />

          {/* Add new rule */}
          <div className="space-y-4">
            <Label>Додати правило доступу</Label>

            <div className="space-y-2">
              <Label className="text-sm">Тип доступу</Label>
              <Select value={accessType} onValueChange={(v) => setAccessType(v as AccessType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="campus">Заклад (всі користувачі закладу)</SelectItem>
                  <SelectItem value="study_program">Програма навчання</SelectItem>
                  <SelectItem value="enrollment_cohort">Потік набору</SelectItem>
                  <SelectItem value="group">Група</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">
                {accessType === "campus" && "Оберіть заклад"}
                {accessType === "study_program" && "Оберіть програму"}
                {accessType === "enrollment_cohort" && "Оберіть потік"}
                {accessType === "group" && "Оберіть групу"}
              </Label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть..." />
                </SelectTrigger>
                <SelectContent>
                  {targets.map((target) => (
                    <SelectItem key={target.id} value={target.id}>
                      {target.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleAddRule} 
              disabled={loading || !targetId}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plus className="h-4 w-4 mr-2" />
              Додати правило
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
