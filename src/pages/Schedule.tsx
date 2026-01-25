import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, Video } from "lucide-react";

interface ScheduleEvent {
  id: string;
  title: string;
  group: string;
  time: string;
  endTime: string;
  room: string;
  teacher: string;
  type: "lesson" | "practice" | "test" | "project";
  format: "online" | "offline";
  color: string;
}

// Demo data
const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
const currentDate = new Date();
const currentWeekStart = new Date(currentDate);
currentWeekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1);

const demoEvents: ScheduleEvent[] = [
  { id: "1", title: "Python Advanced", group: "PY-2024-A", time: "14:00", endTime: "15:30", room: "Ауд. 3", teacher: "Марія Петренко", type: "lesson", format: "offline", color: "bg-primary" },
  { id: "2", title: "Web Design Basics", group: "WD-2024-B", time: "11:00", endTime: "12:30", room: "Online", teacher: "Іван Сидоренко", type: "lesson", format: "online", color: "bg-success" },
  { id: "3", title: "Roblox Studio", group: "RB-2024-C", time: "16:00", endTime: "17:30", room: "Ауд. 1", teacher: "Олена Коваль", type: "practice", format: "offline", color: "bg-warning" },
  { id: "4", title: "3D Modeling", group: "3D-2024-A", time: "15:00", endTime: "16:30", room: "Ауд. 2", teacher: "Андрій Бондар", type: "lesson", format: "offline", color: "bg-chart-4" },
  { id: "5", title: "Python Basics", group: "PY-2024-B", time: "10:00", endTime: "11:30", room: "Ауд. 3", teacher: "Марія Петренко", type: "test", format: "offline", color: "bg-destructive" },
];

const eventsByDay: Record<number, ScheduleEvent[]> = {
  5: [demoEvents[0], demoEvents[3]], // Субота
  6: [demoEvents[1], demoEvents[2]], // Неділя
  4: [demoEvents[4]], // П'ятниця
};

const typeLabels: Record<string, string> = {
  lesson: "Урок",
  practice: "Практика",
  test: "Контрольна",
  project: "Проєкт",
};

function WeekView() {
  const [weekOffset, setWeekOffset] = useState(0);

  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i + weekOffset * 7);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();
  const today = new Date();

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={() => setWeekOffset(0)}>
            Сьогодні
          </Button>
        </div>
        <span className="text-lg font-medium">
          {weekDates[0].toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, index) => {
          const date = weekDates[index];
          const isToday = date.toDateString() === today.toDateString();
          const dayEvents = eventsByDay[date.getDay()] || [];

          return (
            <div key={day} className="min-h-[200px]">
              <div className={cn(
                "text-center p-2 rounded-lg mb-2",
                isToday ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                <p className="text-xs font-medium">{day}</p>
                <p className="text-lg font-semibold">{date.getDate()}</p>
              </div>
              <div className="space-y-2">
                {dayEvents.map((event) => (
                  <Card key={event.id} className={cn("border-l-4 cursor-pointer hover:shadow-sm transition-shadow", event.color.replace("bg-", "border-l-"))}>
                    <CardContent className="p-2">
                      <p className="font-medium text-sm truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.time}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {event.format === "online" ? (
                          <Video className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground">{event.room}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayView() {
  const todayEvents = demoEvents.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-lg font-medium">
          {currentDate.toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
        <Button variant="outline" size="icon">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {todayEvents.map((event) => (
          <Card key={event.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className={cn("w-1 h-full min-h-[60px] rounded-full", event.color)} />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">{event.title}</h3>
                      <p className="text-sm text-muted-foreground">{event.group}</p>
                    </div>
                    <Badge variant="outline">{typeLabels[event.type]}</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{event.time} - {event.endTime}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {event.format === "online" ? (
                        <Video className="h-4 w-4" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                      <span>{event.room}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Викладач: {event.teacher}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const [view, setView] = useState("week");

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Розклад" 
        description="Календар занять та подій"
      >
        <Select defaultValue="all">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Група" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі групи</SelectItem>
            <SelectItem value="py-2024-a">PY-2024-A</SelectItem>
            <SelectItem value="wd-2024-b">WD-2024-B</SelectItem>
            <SelectItem value="rb-2024-c">RB-2024-C</SelectItem>
          </SelectContent>
        </Select>
        <Button>
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
        <TabsContent value="day" className="mt-6">
          <DayView />
        </TabsContent>
        <TabsContent value="week" className="mt-6">
          <WeekView />
        </TabsContent>
        <TabsContent value="month" className="mt-6">
          <Card className="p-8 text-center text-muted-foreground">
            <p>Місячний вид у розробці</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
