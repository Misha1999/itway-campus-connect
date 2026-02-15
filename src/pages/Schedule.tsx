import { useState, useEffect } from "react";
import { format } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchedule, type ScheduleEvent } from "@/hooks/use-schedule";
import {
  WeekView,
  DayView,
  MonthView,
  EventFormDialog,
  EventDetailDialog,
} from "@/components/schedule";
import { BulkActionsBar } from "@/components/schedule/BulkActionsBar";
import { TimeGridSettings, useTimeGridConfig } from "@/components/schedule/TimeGridSettings";

interface EnrollmentCohort {
  id: string;
  name: string;
  campus_id: string;
}

export default function SchedulePage() {
  const [view, setView] = useState("week");
  const [selectedCampusId, setSelectedCampusId] = useState("all");
  const [selectedCohortId, setSelectedCohortId] = useState("all");
  const [selectedGroupId, setSelectedGroupId] = useState("all");
  const [selectedTeacherId, setSelectedTeacherId] = useState("all");
  const [selectedClassroomId, setSelectedClassroomId] = useState("all");
  const [showEventForm, setShowEventForm] = useState(false);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [initialDate, setInitialDate] = useState<Date>(new Date());
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [cohorts, setCohorts] = useState<EnrollmentCohort[]>([]);

  const { config: timeGridConfig, updateConfig: updateTimeGridConfig } = useTimeGridConfig();

  const {
    events,
    groups,
    rooms,
    classrooms,
    teachers,
    campuses,
    loading,
    createEvent,
    createEventsBatch,
    updateEvent,
    deleteEvent,
    cancelEvent,
    restoreEvent,
    checkConflicts,
    bulkDelete,
    bulkCancel,
    bulkRestore,
    bulkUpdateTeacher,
    bulkUpdateClassroom,
    bulkUpdateEventType,
    bulkUpdateOnlineLink,
    bulkShiftDays,
    bulkShiftTime,
    bulkDuplicateShifted,
    bulkCopyToGroup,
  } = useSchedule(selectedGroupId === "all" ? undefined : selectedGroupId);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("enrollment_cohorts")
        .select("id, name, campus_id")
        .eq("is_active", true)
        .order("name");
      setCohorts((data as EnrollmentCohort[]) || []);
    })();
  }, []);

  const filteredCohorts = selectedCampusId === "all"
    ? cohorts
    : cohorts.filter((c) => c.campus_id === selectedCampusId);

  const filteredGroups = (() => {
    let result = groups;
    if (selectedCampusId !== "all") {
      result = result.filter((g) => g.campus_id === selectedCampusId);
    }
    return result;
  })();

  const filteredClassrooms = selectedCampusId === "all"
    ? classrooms
    : classrooms.filter((c) => c.campus_id === selectedCampusId);

  const filteredEvents = events.filter((e) => {
    if (selectedTeacherId !== "all" && e.teacher_id !== selectedTeacherId) return false;
    if (selectedClassroomId !== "all" && e.classroom_id !== selectedClassroomId) return false;
    if (selectedCampusId !== "all") {
      const group = groups.find((g) => g.id === e.group_id);
      if (group && group.campus_id !== selectedCampusId) return false;
    }
    return true;
  });

  const handleEventClick = (event: ScheduleEvent) => {
    setSelectedEvent(event);
    setShowEventDetail(true);
  };

  const handleAddEvent = (date: Date) => {
    setInitialDate(date);
    setSelectedEvent(null);
    setShowEventForm(true);
  };

  const handleEditEvent = () => {
    setShowEventDetail(false);
    setShowEventForm(true);
  };

  const handleNewEvent = () => {
    setInitialDate(new Date());
    setSelectedEvent(null);
    setShowEventForm(true);
  };

  const toggleEventSelection = (eventId: string) => {
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  const clearSelection = () => setSelectedEventIds(new Set());

  const selectAllVisible = () => {
    setSelectedEventIds(new Set(filteredEvents.map((e) => e.id)));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title={<span className="flex items-center gap-1">Розклад <TimeGridSettings config={timeGridConfig} onUpdate={updateTimeGridConfig} /></span>} description="Календар занять та подій">
        <Select value={selectedCampusId} onValueChange={(v) => { setSelectedCampusId(v); setSelectedCohortId("all"); setSelectedGroupId("all"); setSelectedClassroomId("all"); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Філія" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі філії</SelectItem>
            {campuses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedCohortId} onValueChange={(v) => { setSelectedCohortId(v); setSelectedGroupId("all"); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Потік" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі потоки</SelectItem>
            {filteredCohorts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Група" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі групи</SelectItem>
            {filteredGroups.map((group) => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Викладач" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі викладачі</SelectItem>
            {teachers.map((t) => <SelectItem key={t.id} value={t.user_id}>{t.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedClassroomId} onValueChange={setSelectedClassroomId}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Аудиторія" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі аудиторії</SelectItem>
            {filteredClassrooms.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}{c.is_universal ? " ∞" : ""}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleNewEvent}>
          <Plus className="h-4 w-4 mr-2" /> Нова подія
        </Button>
      </PageHeader>

      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="day">День</TabsTrigger>
          <TabsTrigger value="week">Тиждень</TabsTrigger>
          <TabsTrigger value="month">Місяць</TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-10 w-20" />
              </div>
              <Skeleton className="h-6 w-40" />
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <TabsContent value="day" className="mt-6">
              <DayView events={filteredEvents} onEventClick={handleEventClick} onAddEvent={handleAddEvent} />
            </TabsContent>
            <TabsContent value="week" className="mt-6">
              <WeekView
                timeGridConfig={timeGridConfig}
                events={filteredEvents}
                onEventClick={handleEventClick}
                onAddEvent={handleAddEvent}
                selectedEventIds={selectedEventIds}
                onToggleSelect={toggleEventSelection}
                onMoveEvent={async (eventId, newDate, newStartTime, newEndTime) => {
                  const event = events.find((e) => e.id === eventId);
                  if (!event) return;
                  const dateStr = format(newDate, "yyyy-MM-dd");
                  if (newStartTime && newEndTime) {
                    await updateEvent(eventId, {
                      start_time: new Date(`${dateStr}T${newStartTime}:00`).toISOString(),
                      end_time: new Date(`${dateStr}T${newEndTime}:00`).toISOString(),
                    });
                  } else {
                    const oldStart = new Date(event.start_time);
                    const oldEnd = new Date(event.end_time);
                    const diffMs = oldEnd.getTime() - oldStart.getTime();
                    const newStart = new Date(newDate);
                    newStart.setHours(oldStart.getHours(), oldStart.getMinutes());
                    const newEnd = new Date(newStart.getTime() + diffMs);
                    await updateEvent(eventId, {
                      start_time: newStart.toISOString(),
                      end_time: newEnd.toISOString(),
                    });
                  }
                }}
              />
            </TabsContent>
            <TabsContent value="month" className="mt-6">
              <MonthView events={filteredEvents} onEventClick={handleEventClick} onAddEvent={handleAddEvent} />
            </TabsContent>
          </>
        )}
      </Tabs>

      <EventFormDialog
        open={showEventForm}
        onOpenChange={setShowEventForm}
        event={selectedEvent}
        groups={filteredGroups.length > 0 ? filteredGroups : groups}
        classrooms={filteredClassrooms.length > 0 ? filteredClassrooms : classrooms}
        teachers={teachers}
        campuses={campuses}
        onSave={createEvent}
        onSaveBatch={createEventsBatch}
        onUpdate={updateEvent}
        onCheckConflicts={checkConflicts}
        initialDate={initialDate}
      />

      <EventDetailDialog
        open={showEventDetail}
        onOpenChange={setShowEventDetail}
        event={selectedEvent}
        onEdit={handleEditEvent}
        onDelete={deleteEvent}
        onCancel={cancelEvent}
        onRestore={restoreEvent}
      />

      <BulkActionsBar
        selectedIds={selectedEventIds}
        events={filteredEvents}
        groups={groups}
        classrooms={classrooms}
        teachers={teachers}
        onClear={clearSelection}
        onSelectAll={selectAllVisible}
        onBulkDelete={bulkDelete}
        onBulkCancel={bulkCancel}
        onBulkRestore={bulkRestore}
        onBulkUpdateTeacher={bulkUpdateTeacher}
        onBulkUpdateClassroom={bulkUpdateClassroom}
        onBulkUpdateEventType={bulkUpdateEventType}
        onBulkUpdateOnlineLink={bulkUpdateOnlineLink}
        onBulkShiftDays={bulkShiftDays}
        onBulkShiftTime={bulkShiftTime}
        onBulkDuplicate={bulkDuplicateShifted}
        onBulkCopyToGroup={bulkCopyToGroup}
      />
    </div>
  );
}
