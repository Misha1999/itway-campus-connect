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
const ZOOM_LEVELS = [180, 60, 30, 10, 5] as const;
type ZoomLevel = typeof ZOOM_LEVELS[number];

// Focus range (±minutes around cursor for local zoom)
const FOCUS_RANGE = 60;

// Auto-zoom delays (cumulative from hover start)
const AUTO_ZOOM_DELAYS: { level: ZoomLevel; delay: number }[] = [
  { level: 180, delay: 0 },        // immediate: 3h grid
  { level: 60,  delay: 1500 },     // +1.5s: 1h
  { level: 30,  delay: 3000 },     // +1.5s: 30min
  { level: 10,  delay: 4500 },     // +1.5s: 10min
  { level: 5,   delay: 6000 },     // +1.5s: 5min
];

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
  const [autoZoomLevel, setAutoZoomLevel] = useState<ZoomLevel>(180);
  const [wheelZoomLevel, setWheelZoomLevel] = useState<ZoomLevel | null>(null);
  const [lastMoveSpeed, setLastMoveSpeed] = useState(0);
  const lastMoveRef = useRef<{ y: number; time: number } | null>(null);
  const autoZoomTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const activeZoom = wheelZoomLevel ?? autoZoomLevel;

  const effectiveSnap = useMemo(() => {
    if (lastMoveSpeed > 400) return Math.max(activeZoom, 60) as ZoomLevel;
    if (lastMoveSpeed > 200) return Math.max(activeZoom, 30) as ZoomLevel;
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
      setAutoZoomLevel(180);
      setWheelZoomLevel(null);
      setLastMoveSpeed(0);
      lastMoveRef.current = null;
      autoZoomTimers.current.forEach(clearTimeout);
      autoZoomTimers.current = [];
    }
  }, [visible]);

  const timeToY = useCallback((minutes: number): number => {
    if (containerHeight === 0) return 0;
    if (!cursorMinutes || activeZoom >= 60) {
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
    if (!cursorMinutes || activeZoom >= 60) {
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
    setAutoZoomLevel(180);
    autoZoomTimers.current.forEach(clearTimeout);
    autoZoomTimers.current = [];

    AUTO_ZOOM_DELAYS.forEach(({ level, delay }) => {
      if (delay === 0) return; // 180 is already set
      const timer = setTimeout(() => {
        setAutoZoomLevel(level);
      }, delay);
      autoZoomTimers.current.push(timer);
    });
  }, []);

  const resetAutoZoom = useCallback(() => {
    autoZoomTimers.current.forEach(clearTimeout);
    autoZoomTimers.current = [];
    setAutoZoomLevel(180);
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
    // Always show hour marks
    for (let m = TL_START; m <= TL_END; m += 60) {
      result.push({ minutes: m, label: minutesToTimeStr(m), type: "hour" });
    }
    // Show half-hour marks at zoom <= 30
    if (activeZoom <= 30) {
      for (let m = TL_START + 30; m < TL_END; m += 60) {
        result.push({ minutes: m, label: minutesToTimeStr(m), type: "half" });
      }
    }
    // Show 10-min marks at zoom <= 10
    if (activeZoom <= 10) {
      for (let m = TL_START; m < TL_END; m += 10) {
        if (m % 30 !== 0) result.push({ minutes: m, label: "", type: "ten" });
      }
    }
    // Show 5-min marks at zoom <= 5
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
          
          // Fine markers only in focus zone
          if ((marker.type === "ten" || marker.type === "five") && !inFocus) return null;
          
          // When zoomed in, hide distant coarse markers to free up space
          // Keep nearby hour/half marks for navigation context
          const distFromCursor = cursorMinutes ? Math.abs(marker.minutes - cursorMinutes) : 0;
          const NEARBY = FOCUS_RANGE + 60; // ±2h considered "nearby"
          
          if (cursorMinutes && activeZoom <= 30) {
            // At 30min zoom: hide hour marks that are far away
            if (marker.type === "hour" && distFromCursor > NEARBY) return null;
          }
          if (cursorMinutes && activeZoom <= 10) {
            // At 10min zoom: hide half marks that are far, keep only close hours
            if (marker.type === "half" && distFromCursor > FOCUS_RANGE) return null;
            if (marker.type === "hour" && distFromCursor > NEARBY + 60) return null;
          }
          
          // At coarsest zoom (180), dim non-3h hour marks
          const is3hMark = marker.type === "hour" && marker.minutes % 180 === 0;
          const dimmedAtCoarse = activeZoom >= 180 && marker.type === "hour" && !is3hMark;
          
          // Fade distant markers smoothly
          const fadeFar = cursorMinutes && activeZoom < 60 && distFromCursor > FOCUS_RANGE;
          const opacity = fadeFar ? Math.max(0.3, 1 - (distFromCursor - FOCUS_RANGE) / 180) : 1;

          return (
            <div
              key={`${marker.type}-${marker.minutes}`}
              className="absolute left-0 right-0 transition-all duration-200"
              style={{ top: y, opacity }}
            >
              <div className={cn(
                "border-t transition-all duration-200",
                marker.type === "hour" && !dimmedAtCoarse && "border-border",
                marker.type === "hour" && dimmedAtCoarse && "border-border/30 border-dashed",
                marker.type === "half" && "border-border/40",
                marker.type === "ten" && "border-border/25 border-dashed",
                marker.type === "five" && "border-border/15 border-dotted",
              )} />
              {marker.type === "hour" && (
                <span className={cn(
                  "absolute left-2 font-mono tracking-tight -top-3 transition-all duration-200",
                  is3hMark || activeZoom < 180
                    ? "text-xs font-semibold text-foreground/70"
                    : "text-[10px] font-normal text-muted-foreground/50"
                )}>
                  {marker.label}
                </span>
              )}
              {marker.type === "half" && activeZoom <= 30 && (
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
            {effectiveSnap !== 180 && (
              <div className="text-[10px] opacity-80 pt-0.5 border-t border-primary-foreground/20">
                Крок: {effectiveSnap >= 60 ? `${effectiveSnap / 60}год` : `${effectiveSnap}хв`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Zoom level indicator */}
      {activeZoom !== 180 && (
        <div className="absolute top-2 right-2 z-40 pointer-events-none">
          <div className="bg-primary/10 text-primary rounded-md px-2 py-1 text-[11px] font-semibold font-mono">
            {activeZoom >= 60 ? `${activeZoom / 60}год` : `${activeZoom}хв`}
          </div>
        </div>
      )}
    </div>
  );
}
