import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings2 } from "lucide-react";

export interface TimeGridConfig {
  startHour: number;
  endHour: number;
  cellMinutes: 60; // always 1 hour per cell
  snapMinutes: number; // default snap (15)
  fineSnapMinutes: number; // fine snap after hold (5)
}

const STORAGE_KEY = "schedule-timegrid-config";

const DEFAULT_CONFIG: TimeGridConfig = {
  startHour: 9,
  endHour: 19,
  cellMinutes: 60,
  snapMinutes: 15,
  fineSnapMinutes: 5,
};

export function useTimeGridConfig() {
  const [config, setConfig] = useState<TimeGridConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    } catch {}
    return DEFAULT_CONFIG;
  });

  const updateConfig = (partial: Partial<TimeGridConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return { config, updateConfig };
}

interface TimeGridSettingsProps {
  config: TimeGridConfig;
  onUpdate: (partial: Partial<TimeGridConfig>) => void;
}

export function TimeGridSettings({ config, onUpdate }: TimeGridSettingsProps) {
  const [startH, setStartH] = useState(String(config.startHour));
  const [endH, setEndH] = useState(String(config.endHour));
  const [snap, setSnap] = useState(String(config.snapMinutes));
  const [fineSnap, setFineSnap] = useState(String(config.fineSnapMinutes));

  useEffect(() => {
    setStartH(String(config.startHour));
    setEndH(String(config.endHour));
    setSnap(String(config.snapMinutes));
    setFineSnap(String(config.fineSnapMinutes));
  }, [config]);

  const handleApply = () => {
    const s = Math.max(0, Math.min(23, parseInt(startH) || 9));
    const e = Math.max(s + 1, Math.min(24, parseInt(endH) || 19));
    const sn = Math.max(1, Math.min(60, parseInt(snap) || 15));
    const fn = Math.max(1, Math.min(sn, parseInt(fineSnap) || 5));
    onUpdate({ startHour: s, endHour: e, snapMinutes: sn, fineSnapMinutes: fn });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3" align="start">
        <p className="text-sm font-semibold">Налаштування сітки</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Початок</Label>
            <Input
              type="number"
              min={0}
              max={23}
              value={startH}
              onChange={(e) => setStartH(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Кінець</Label>
            <Input
              type="number"
              min={1}
              max={24}
              value={endH}
              onChange={(e) => setEndH(e.target.value)}
              className="h-8"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Крок (хв)</Label>
            <Input
              type="number"
              min={1}
              max={60}
              value={snap}
              onChange={(e) => setSnap(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Точний (хв)</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={fineSnap}
              onChange={(e) => setFineSnap(e.target.value)}
              className="h-8"
            />
          </div>
        </div>
        <Button size="sm" className="w-full" onClick={handleApply}>
          Застосувати
        </Button>
      </PopoverContent>
    </Popover>
  );
}
