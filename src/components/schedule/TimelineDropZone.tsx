import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Calendar, Clock, Timer } from "lucide-react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";

// Timeline range
const TL_START = 8 * 60;  // 08:00
const TL_END = 20 * 60;   // 20:00
const TL_RANGE = TL_END - TL_START; // 720 minutes

// Zoom levels: minutes per snap
const ZOOM_LEVELS = [30, 15, 10, 5] as const;
type ZoomLevel = typeof ZOOM_LEVELS[number];

// Focus range (±minutes around cursor for local zoom)
const FOCUS_RANGE = 60;

// Auto-zoom delays
const AUTO_ZOOM_DELAY_1 = 400;
const AUTO_ZOOM_DELAY_2 = 800;

interface TimelineDropZoneProps {
  date: Date;
  eventDurationMinutes: number;
  dropTimeMinutes: number | null;
  onDropTimeChange: (minutes: number | null) => void;
  visible: boolean;
  className?: string;
}

function minutesToTimeStr(totalMin: number) {
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function snapToInterval(minutes: number, interval: ZoomLevel): number {
  return Math.round(minutes / interval) * interval;
}

export function TimelineDropZone({
  date,
  eventDurationMinutes,
  dropTimeMinutes,
  onDropTimeChange,
  visible,
  className,
}: TimelineDropZoneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [cursorY, setCursorY] = useState<number | null>(null);
  const [cursorMinutes, setCursorMinutes] = useState<number | null>(null);
  const [autoZoomLevel, setAutoZoomLevel] = useState<ZoomLevel>(30);
  const [wheelZoomLevel, setWheelZoomLevel] = useState<ZoomLevel | null>(null);
  const [lastMoveSpeed, setLastMoveSpeed] = useState(0);
  const lastMoveRef = useRef<{ y: number; time: number } | null>(null);
  const autoZoomTimer1 = useRef<ReturnType<typeof setTimeout>>();
  const autoZoomTimer2 = useRef<ReturnType<typeof setTimeout>>();

  const activeZoom = wheelZoomLevel ?? autoZoomLevel;

  const effectiveSnap = useMemo(() => {
    if (lastMoveSpeed > 400) return 30;
    if (lastMoveSpeed > 200) return Math.max(activeZoom, 15) as ZoomLevel;
    return activeZoom;
  }, [activeZoom, lastMoveSpeed]);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setCursorY(null);
      setCursorMinutes(null);
      setAutoZoomLevel(30);
      setWheelZoomLevel(null);
      setLastMoveSpeed(0);
      lastMoveRef.current = null;
      clearTimeout(autoZoomTimer1.current);
      clearTimeout(autoZoomTimer2.current);
    }
  }, [visible]);

  const timeToY = useCallback((minutes: number): number => {
    if (containerHeight === 0) return 0;
    if (!cursorMinutes || activeZoom === 30) {
      return ((minutes - TL_START) / TL_RANGE) * containerHeight;
    }
    const focusStart = Math.max(TL_START, cursorMinutes - FOCUS_RANGE);
    const focusEnd = Math.min(TL_END, cursorMinutes + FOCUS_RANGE);
    const focusLen = focusEnd - focusStart;
    const nonFocusLen = TL_RANGE - focusLen;
    const zoomFactor = 30 / activeZoom;
    const focusWeight = focusLen * zoomFactor;
    const totalWeight = nonFocusLen + focusWeight;
    const pxPerWeight = containerHeight / totalWeight;

    if (minutes <= focusStart) {
      return (minutes - TL_START) * pxPerWeight;
    } else if (minutes >= focusEnd) {
      const beforeFocusPx = (focusStart - TL_START) * pxPerWeight;
      const focusPx = focusLen * zoomFactor * pxPerWeight;
      return beforeFocusPx + focusPx + (minutes - focusEnd) * pxPerWeight;
    } else {
      const beforeFocusPx = (focusStart - TL_START) * pxPerWeight;
      return beforeFocusPx + (minutes - focusStart) * zoomFactor * pxPerWeight;
    }
  }, [containerHeight, cursorMinutes, activeZoom]);

  const yToTime = useCallback((y: number): number => {
    if (containerHeight === 0) return TL_START;
    if (!cursorMinutes || activeZoom === 30) {
      return TL_START + (y / containerHeight) * TL_RANGE;
    }
    const focusStart = Math.max(TL_START, cursorMinutes - FOCUS_RANGE);
    const focusEnd = Math.min(TL_END, cursorMinutes + FOCUS_RANGE);
    const focusLen = focusEnd - focusStart;
    const nonFocusLen = TL_RANGE - focusLen;
    const zoomFactor = 30 / activeZoom;
    const focusWeight = focusLen * zoomFactor;
    const totalWeight = nonFocusLen + focusWeight;
    const pxPerWeight = containerHeight / totalWeight;

    const beforeFocusPx = (focusStart - TL_START) * pxPerWeight;
    const focusPx = focusLen * zoomFactor * pxPerWeight;

    if (y <= beforeFocusPx) {
      return TL_START + y / pxPerWeight;
    } else if (y <= beforeFocusPx + focusPx) {
      return focusStart + (y - beforeFocusPx) / (zoomFactor * pxPerWeight);
    } else {
      return focusEnd + (y - beforeFocusPx - focusPx) / pxPerWeight;
    }
  }, [containerHeight, cursorMinutes, activeZoom]);

  const handleMove = useCallback((clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const y = Math.max(0, Math.min(containerHeight, clientY - rect.top));
    setCursorY(y);

    const now = Date.now();
    if (lastMoveRef.current) {
      const dy = Math.abs(y - lastMoveRef.current.y);
      const dt = Math.max(1, now - lastMoveRef.current.time);
      setLastMoveSpeed(dy / dt * 1000);
    }
    lastMoveRef.current = { y, time: now };

    const rawMinutes = yToTime(y);
    const snapped = snapToInterval(
      Math.max(TL_START, Math.min(TL_END - eventDurationMinutes, rawMinutes)),
      effectiveSnap
    );
    setCursorMinutes(rawMinutes);
    onDropTimeChange(snapped);
  }, [containerHeight, yToTime, effectiveSnap, eventDurationMinutes, onDropTimeChange]);

  const startAutoZoom = useCallback(() => {
    setAutoZoomLevel(30);
    clearTimeout(autoZoomTimer1.current);
    clearTimeout(autoZoomTimer2.current);

    autoZoomTimer1.current = setTimeout(() => {
      setAutoZoomLevel(10);
    }, AUTO_ZOOM_DELAY_1);

    autoZoomTimer2.current = setTimeout(() => {
      setAutoZoomLevel(5);
    }, AUTO_ZOOM_DELAY_1 + AUTO_ZOOM_DELAY_2);
  }, []);

  const resetAutoZoom = useCallback(() => {
    clearTimeout(autoZoomTimer1.current);
    clearTimeout(autoZoomTimer2.current);
    setAutoZoomLevel(30);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWheelZoomLevel(prev => {
      const current = prev ?? autoZoomLevel;
      const idx = ZOOM_LEVELS.indexOf(current as ZoomLevel);
      if (e.deltaY < 0 && idx < ZOOM_LEVELS.length - 1) {
        return ZOOM_LEVELS[idx + 1];
      } else if (e.deltaY > 0 && idx > 0) {
        return ZOOM_LEVELS[idx - 1];
      }
      return current as ZoomLevel;
    });
  }, [autoZoomLevel]);

  const markers = useMemo(() => {
    const result: { minutes: number; label: string; type: "hour" | "half" | "ten" | "five" }[] = [];
    for (let m = TL_START; m <= TL_END; m += 60) {
      result.push({ minutes: m, label: minutesToTimeStr(m), type: "hour" });
    }
    if (activeZoom <= 15) {
      for (let m = TL_START + 30; m < TL_END; m += 60) {
        result.push({ minutes: m, label: minutesToTimeStr(m), type: "half" });
      }
    }
    if (activeZoom <= 10) {
      for (let m = TL_START; m < TL_END; m += 10) {
        if (m % 30 !== 0) result.push({ minutes: m, label: "", type: "ten" });
      }
    }
    if (activeZoom <= 5) {
      for (let m = TL_START; m < TL_END; m += 5) {
        if (m % 10 !== 0) result.push({ minutes: m, label: "", type: "five" });
      }
    }
    return result;
  }, [activeZoom]);

  const isInFocus = useCallback((minutes: number) => {
    if (!cursorMinutes) return false;
    return Math.abs(minutes - cursorMinutes) <= FOCUS_RANGE;
  }, [cursorMinutes]);

  if (!visible) return null;

  const snappedStart = dropTimeMinutes;
  const snappedEnd = snappedStart !== null ? snappedStart + eventDurationMinutes : null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute z-40 bg-background/[0.97] border-2 border-primary/20 rounded-xl shadow-2xl overflow-hidden",
        "animate-scale-in transition-all duration-150 backdrop-blur-sm",
        className
      )}
      style={{
        top: 0,
        bottom: 0,
        left: -16,
        right: -16,
        minHeight: 400,
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleMove(e.clientY);
      }}
      onDragEnter={() => startAutoZoom()}
      onDragLeave={(e) => {
        const rel = e.relatedTarget as HTMLElement | null;
        if (!rel || !containerRef.current?.contains(rel)) {
          resetAutoZoom();
          onDropTimeChange(null);
        }
      }}
      onWheel={handleWheel}
    >
      {/* Left time labels column */}
      <div className="absolute inset-0 pointer-events-none">
        {markers.map((marker) => {
          const y = timeToY(marker.minutes);
          const inFocus = isInFocus(marker.minutes);
          if ((marker.type === "ten" || marker.type === "five") && !inFocus) return null;

          return (
            <div
              key={`${marker.type}-${marker.minutes}`}
              className="absolute left-0 right-0 transition-all duration-150"
              style={{ top: y }}
            >
              <div className={cn(
                "border-t transition-all duration-150",
                marker.type === "hour" && "border-border",
                marker.type === "half" && "border-border/50",
                marker.type === "ten" && "border-border/30 border-dashed",
                marker.type === "five" && "border-border/20 border-dotted",
              )} />
              {marker.type === "hour" && (
                <span className="absolute left-2 text-xs font-semibold text-foreground/70 -top-3 font-mono tracking-tight">
                  {marker.label}
                </span>
              )}
              {marker.type === "half" && activeZoom <= 15 && (
                <span className="absolute left-2 text-[11px] text-muted-foreground -top-2.5 font-mono">
                  {marker.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Event drop preview highlight */}
      {snappedStart !== null && snappedEnd !== null && (
        <div
          className="absolute left-8 right-2 rounded-lg transition-all duration-100 pointer-events-none"
          style={{
            top: timeToY(snappedStart),
            height: Math.max(12, timeToY(snappedEnd) - timeToY(snappedStart)),
          }}
        >
          <div className="w-full h-full rounded-lg bg-primary/15 border-2 border-primary/50 border-dashed flex items-center justify-center">
            <span className="text-xs font-semibold text-primary/70">
              {minutesToTimeStr(snappedStart)} – {minutesToTimeStr(snappedEnd)}
            </span>
          </div>
        </div>
      )}

      {/* Floating Preview Bubble */}
      {snappedStart !== null && snappedEnd !== null && cursorY !== null && (
        <div
          className="absolute z-50 pointer-events-none transition-all duration-75"
          style={{
            top: Math.max(4, Math.min(containerHeight - 80, cursorY - 40)),
            right: 8,
          }}
        >
          <div className="bg-primary text-primary-foreground rounded-xl px-3.5 py-2.5 shadow-xl text-xs space-y-1 min-w-[130px]">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 opacity-70" />
              <span className="font-medium">{format(date, "EEE, d MMM", { locale: uk })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 opacity-70" />
              <span className="font-bold text-sm">
                {minutesToTimeStr(snappedStart)} – {minutesToTimeStr(snappedEnd)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5 opacity-70" />
              <span>{eventDurationMinutes} хв</span>
            </div>
            {effectiveSnap !== 30 && (
              <div className="text-[10px] opacity-80 pt-0.5 border-t border-primary-foreground/20">
                Крок: {effectiveSnap} хв
                {activeZoom !== 30 && " · zoom"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Zoom level indicator */}
      {activeZoom !== 30 && (
        <div className="absolute top-2 right-2 z-40 pointer-events-none">
          <div className="bg-primary/10 text-primary rounded-md px-2 py-1 text-[11px] font-semibold font-mono">
            {activeZoom}хв
          </div>
        </div>
      )}
    </div>
  );
}
