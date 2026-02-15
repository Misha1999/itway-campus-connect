import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Calendar, Clock, Timer } from "lucide-react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";

// Timeline range
const TL_START = 8 * 60;  // 08:00 in minutes
const TL_END = 21 * 60;   // 21:00 in minutes
const TL_RANGE = TL_END - TL_START; // 780 minutes

// Zoom levels: minutes per snap
const ZOOM_LEVELS = [30, 15, 10, 5] as const;
type ZoomLevel = typeof ZOOM_LEVELS[number];

// Focus range (±minutes around cursor for local zoom)
const FOCUS_RANGE = 60;

// Auto-zoom delays
const AUTO_ZOOM_DELAY_1 = 500;  // ms → 10min
const AUTO_ZOOM_DELAY_2 = 1000; // ms → 5min

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
  const [hoverStartTime, setHoverStartTime] = useState<number | null>(null);
  const [lastMoveSpeed, setLastMoveSpeed] = useState(0);
  const lastMoveRef = useRef<{ y: number; time: number } | null>(null);
  const autoZoomTimer1 = useRef<ReturnType<typeof setTimeout>>();
  const autoZoomTimer2 = useRef<ReturnType<typeof setTimeout>>();

  const activeZoom = wheelZoomLevel ?? autoZoomLevel;

  // Effective snap: fast mouse → coarse snap, slow → fine
  const effectiveSnap = useMemo(() => {
    if (lastMoveSpeed > 400) return 30; // fast → always 30min
    if (lastMoveSpeed > 200) return Math.max(activeZoom, 15) as ZoomLevel;
    return activeZoom;
  }, [activeZoom, lastMoveSpeed]);

  // Update container height on mount/resize
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [visible]);

  // Reset state when not visible
  useEffect(() => {
    if (!visible) {
      setCursorY(null);
      setCursorMinutes(null);
      setAutoZoomLevel(30);
      setWheelZoomLevel(null);
      setHoverStartTime(null);
      setLastMoveSpeed(0);
      lastMoveRef.current = null;
      clearTimeout(autoZoomTimer1.current);
      clearTimeout(autoZoomTimer2.current);
    }
  }, [visible]);

  // Time-to-Y mapping with local zoom
  const timeToY = useCallback((minutes: number): number => {
    if (containerHeight === 0) return 0;
    if (!cursorMinutes || activeZoom === 30) {
      // Linear mapping
      return ((minutes - TL_START) / TL_RANGE) * containerHeight;
    }

    // Local zoom: stretch ±FOCUS_RANGE around cursor
    const focusStart = Math.max(TL_START, cursorMinutes - FOCUS_RANGE);
    const focusEnd = Math.min(TL_END, cursorMinutes + FOCUS_RANGE);
    const focusLen = focusEnd - focusStart;
    const nonFocusLen = TL_RANGE - focusLen;

    // Zoom factor for focus area (higher = more stretched)
    const zoomFactor = 30 / activeZoom; // e.g., 30/5 = 6x
    const focusWeight = focusLen * zoomFactor;
    const totalWeight = nonFocusLen + focusWeight;
    const pxPerWeight = containerHeight / totalWeight;

    if (minutes <= focusStart) {
      // Before focus zone
      return (minutes - TL_START) * pxPerWeight;
    } else if (minutes >= focusEnd) {
      // After focus zone
      const beforeFocusPx = (focusStart - TL_START) * pxPerWeight;
      const focusPx = focusLen * zoomFactor * pxPerWeight;
      const afterFocusMin = minutes - focusEnd;
      return beforeFocusPx + focusPx + afterFocusMin * pxPerWeight;
    } else {
      // Inside focus zone
      const beforeFocusPx = (focusStart - TL_START) * pxPerWeight;
      const inFocusMin = minutes - focusStart;
      return beforeFocusPx + inFocusMin * zoomFactor * pxPerWeight;
    }
  }, [containerHeight, cursorMinutes, activeZoom]);

  // Y-to-time mapping (inverse)
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
      const inFocusPx = y - beforeFocusPx;
      return focusStart + inFocusPx / (zoomFactor * pxPerWeight);
    } else {
      const afterPx = y - beforeFocusPx - focusPx;
      return focusEnd + afterPx / pxPerWeight;
    }
  }, [containerHeight, cursorMinutes, activeZoom]);

  // Handle mouse/drag move
  const handleMove = useCallback((clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const y = Math.max(0, Math.min(containerHeight, clientY - rect.top));
    setCursorY(y);

    // Track speed
    const now = Date.now();
    if (lastMoveRef.current) {
      const dy = Math.abs(y - lastMoveRef.current.y);
      const dt = Math.max(1, now - lastMoveRef.current.time);
      setLastMoveSpeed(dy / dt * 1000); // px/s
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

  // Auto-zoom timers
  const startAutoZoom = useCallback(() => {
    setAutoZoomLevel(30);
    setHoverStartTime(Date.now());
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
    setHoverStartTime(null);
  }, []);

  // Wheel zoom
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

  // Generate time markers
  const markers = useMemo(() => {
    const result: { minutes: number; label: string; type: "hour" | "half" | "quarter" | "ten" | "five" }[] = [];
    // Always show hour marks
    for (let m = TL_START; m <= TL_END; m += 60) {
      result.push({ minutes: m, label: minutesToTimeStr(m), type: "hour" });
    }
    // Show finer marks based on zoom
    if (activeZoom <= 15) {
      for (let m = TL_START + 30; m < TL_END; m += 60) {
        result.push({ minutes: m, label: minutesToTimeStr(m), type: "half" });
      }
    }
    if (activeZoom <= 10) {
      for (let m = TL_START; m < TL_END; m += 10) {
        if (m % 30 !== 0) {
          result.push({ minutes: m, label: "", type: "ten" });
        }
      }
    }
    if (activeZoom <= 5) {
      for (let m = TL_START; m < TL_END; m += 5) {
        if (m % 10 !== 0) {
          result.push({ minutes: m, label: "", type: "five" });
        }
      }
    }
    return result;
  }, [activeZoom]);

  // Determine which markers are in focus zone
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
        "absolute inset-x-0 z-30 bg-background/98 border rounded-lg shadow-xl overflow-hidden",
        "animate-scale-in transition-all duration-150",
        className
      )}
      style={{ top: 60, bottom: 8 }}
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
      {/* Time markers */}
      {markers.map((marker) => {
        const y = timeToY(marker.minutes);
        const inFocus = isInFocus(marker.minutes);
        // Only show fine markers in focus zone
        if ((marker.type === "ten" || marker.type === "five") && !inFocus) return null;

        return (
          <div
            key={`${marker.type}-${marker.minutes}`}
            className="absolute left-0 right-0 pointer-events-none transition-all duration-150"
            style={{ top: y }}
          >
            <div className={cn(
              "border-t transition-all duration-150",
              marker.type === "hour" && "border-border/80",
              marker.type === "half" && "border-border/50",
              marker.type === "ten" && "border-border/30 border-dashed",
              marker.type === "five" && "border-border/20 border-dotted",
            )} />
            {(marker.type === "hour" || (marker.type === "half" && activeZoom <= 15)) && (
              <span className={cn(
                "absolute left-1 text-muted-foreground font-mono transition-all duration-150",
                marker.type === "hour" ? "text-[11px] font-medium -top-3" : "text-[9px] -top-2.5 opacity-70",
              )}>
                {marker.label || minutesToTimeStr(marker.minutes)}
              </span>
            )}
          </div>
        );
      })}

      {/* Event drop preview (highlight area) */}
      {snappedStart !== null && snappedEnd !== null && (
        <div
          className="absolute left-6 right-1 rounded-md transition-all duration-100 pointer-events-none"
          style={{
            top: timeToY(snappedStart),
            height: Math.max(8, timeToY(snappedEnd) - timeToY(snappedStart)),
          }}
        >
          <div className="w-full h-full rounded-md bg-primary/20 border-2 border-primary/40 border-dashed" />
        </div>
      )}

      {/* Floating Preview Bubble */}
      {snappedStart !== null && snappedEnd !== null && cursorY !== null && (
        <div
          className="absolute z-50 pointer-events-none transition-all duration-75"
          style={{
            top: Math.max(4, Math.min(containerHeight - 64, cursorY - 32)),
            right: 4,
          }}
        >
          <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 shadow-lg text-xs space-y-0.5 min-w-[120px]">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 opacity-70" />
              <span className="font-medium">{format(date, "EEE, d MMM", { locale: uk })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 opacity-70" />
              <span className="font-semibold">
                {minutesToTimeStr(snappedStart)} – {minutesToTimeStr(snappedEnd)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Timer className="h-3 w-3 opacity-70" />
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
        <div className="absolute top-1 right-1 z-40 pointer-events-none">
          <div className="bg-muted/90 text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-mono">
            {activeZoom}хв
          </div>
        </div>
      )}
    </div>
  );
}
