import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { useSchedule, type ScheduleEvent } from "@/hooks/use-schedule";
import {
  WeekView,
  DayView,
  EventFormDialog,
  EventDetailDialog,
} from "@/components/schedule";

export default function SchedulePage() {
  const [view, setView] = useState("week");
  const [selectedGroupId, setSelectedGroupId] = useState("all");
  const [showEventForm, setShowEventForm] = useState(false);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [initialDate, setInitialDate] = useState<Date>(new Date());

  const {
    events,
    groups,
    rooms,
    teachers,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    cancelEvent,
    restoreEvent,
  } = useSchedule(selectedGroupId === "all" ? undefined : selectedGroupId);

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

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Розклад" description="Календар занять та подій">
        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Група" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі групи</SelectItem>
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleNewEvent}>
          <Plus className="h-4 w-4 mr-2" />
          Нова подія
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
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <TabsContent value="day" className="mt-6">
              <DayView
                events={events}
                onEventClick={handleEventClick}
                onAddEvent={handleAddEvent}
              />
            </TabsContent>
            <TabsContent value="week" className="mt-6">
              <WeekView
                events={events}
                onEventClick={handleEventClick}
                onAddEvent={handleAddEvent}
              />
            </TabsContent>
            <TabsContent value="month" className="mt-6">
              <Card className="p-8 text-center text-muted-foreground">
                <p>Місячний вид у розробці</p>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Event Form Dialog */}
      <EventFormDialog
        open={showEventForm}
        onOpenChange={setShowEventForm}
        event={selectedEvent}
        groups={groups}
        rooms={rooms}
        teachers={teachers}
        onSave={createEvent}
        onUpdate={updateEvent}
        initialDate={initialDate}
      />

      {/* Event Detail Dialog */}
      <EventDetailDialog
        open={showEventDetail}
        onOpenChange={setShowEventDetail}
        event={selectedEvent}
        onEdit={handleEditEvent}
        onDelete={deleteEvent}
        onCancel={cancelEvent}
        onRestore={restoreEvent}
      />
    </div>
  );
}
