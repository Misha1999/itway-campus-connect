import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface Criterion {
  id: string;
  name: string;
  description?: string;
  maxScore: number;
}

interface GradingCriteriaProps {
  criteria: Criterion[];
  onChange: (criteria: Criterion[]) => void;
  maxTotal?: number;
}

export function GradingCriteria({ 
  criteria, 
  onChange,
  maxTotal = 100,
}: GradingCriteriaProps) {
  const totalScore = criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
  const isOverMax = totalScore > maxTotal;

  const addCriterion = () => {
    onChange([
      ...criteria,
      { id: crypto.randomUUID(), name: "", maxScore: 0 },
    ]);
  };

  const removeCriterion = (id: string) => {
    if (criteria.length <= 1) return;
    onChange(criteria.filter((c) => c.id !== id));
  };

  const updateCriterion = (id: string, updates: Partial<Criterion>) => {
    onChange(
      criteria.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      )
    );
  };

  const distributeEqually = () => {
    const scorePerCriterion = Math.floor(maxTotal / criteria.length);
    const remainder = maxTotal % criteria.length;
    
    onChange(
      criteria.map((c, index) => ({
        ...c,
        maxScore: scorePerCriterion + (index < remainder ? 1 : 0),
      }))
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Додайте критерії, за якими оцінюватимете роботу студентів
        </p>
        {criteria.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={distributeEqually}
          >
            Розділити порівну
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {criteria.map((criterion, index) => (
          <div
            key={criterion.id}
            className="flex items-start gap-3 p-3 rounded-lg border bg-card"
          >
            <div className="pt-2 text-muted-foreground cursor-move">
              <GripVertical className="h-4 w-4" />
            </div>
            
            <div className="flex-1 grid gap-3 sm:grid-cols-[1fr_120px]">
              <div className="space-y-1">
                <Input
                  placeholder={`Критерій ${index + 1}`}
                  value={criterion.name}
                  onChange={(e) =>
                    updateCriterion(criterion.id, { name: e.target.value })
                  }
                />
                <Input
                  placeholder="Опис критерію (опціонально)"
                  value={criterion.description || ""}
                  onChange={(e) =>
                    updateCriterion(criterion.id, { description: e.target.value })
                  }
                  className="text-sm"
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Бали</Label>
                <Input
                  type="number"
                  min={0}
                  max={maxTotal}
                  value={criterion.maxScore || ""}
                  onChange={(e) =>
                    updateCriterion(criterion.id, {
                      maxScore: parseInt(e.target.value) || 0,
                    })
                  }
                  className="text-center"
                />
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => removeCriterion(criterion.id)}
              disabled={criteria.length <= 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCriterion}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Додати критерій
        </Button>

        <div className={cn(
          "text-sm font-medium",
          isOverMax ? "text-destructive" : "text-muted-foreground"
        )}>
          Всього: {totalScore} / {maxTotal} балів
          {isOverMax && (
            <span className="block text-xs">
              Сума перевищує максимум!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
