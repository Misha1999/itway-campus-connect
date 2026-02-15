import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import type { CampusWithStats } from "@/hooks/use-campuses";

interface CampusMultiSelectProps {
  campuses: CampusWithStats[];
  selected: string[];
  onChange: (ids: string[]) => void;
  label?: string;
}

export function CampusMultiSelect({
  campuses,
  selected,
  onChange,
  label = "Філії",
}: CampusMultiSelectProps) {
  const activeCampuses = campuses.filter((c) => c.is_active);

  const toggleCampus = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const selectAll = () => {
    onChange(activeCampuses.map((c) => c.id));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
            Обрати всі
          </Button>
          {selected.length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
              Очистити
            </Button>
          )}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((id) => {
            const campus = campuses.find((c) => c.id === id);
            return campus ? (
              <Badge key={id} variant="secondary" className="gap-1">
                {campus.name}
                <button type="button" onClick={() => toggleCampus(id)} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null;
          })}
        </div>
      )}

      <div className="max-h-48 overflow-y-auto space-y-2 rounded-lg border p-3">
        {activeCampuses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Немає активних філій</p>
        ) : (
          activeCampuses.map((campus) => (
            <label
              key={campus.id}
              className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-md p-1.5 -mx-1.5"
            >
              <Checkbox
                checked={selected.includes(campus.id)}
                onCheckedChange={() => toggleCampus(campus.id)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{campus.name}</p>
                <p className="text-xs text-muted-foreground">{campus.city}</p>
              </div>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
