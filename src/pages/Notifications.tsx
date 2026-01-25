import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle, Clock, FileText, Calendar, Coins, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "assignment" | "schedule" | "coins" | "system" | "grade";
  isRead: boolean;
  createdAt: string;
}

// Demo data
const demoNotifications: Notification[] = [
  { id: "1", title: "Нове домашнє завдання", message: "Викладач Марія Петренко додала нове ДЗ: 'Проєкт: Калькулятор'", type: "assignment", isRead: false, createdAt: "5 хв тому" },
  { id: "2", title: "Зміна в розкладі", message: "Заняття 'Python Advanced' перенесено на 15:00", type: "schedule", isRead: false, createdAt: "1 год тому" },
  { id: "3", title: "Нові монети!", message: "Ви отримали 50 монет за відмінне ДЗ", type: "coins", isRead: false, createdAt: "2 год тому" },
  { id: "4", title: "ДЗ оцінено", message: "Ваша робота 'HTML/CSS Портфоліо' отримала оцінку 11", type: "grade", isRead: true, createdAt: "Вчора" },
  { id: "5", title: "Нагадування", message: "До дедлайну ДЗ 'Гра в Roblox' залишилось 24 години", type: "assignment", isRead: true, createdAt: "Вчора" },
  { id: "6", title: "Система", message: "Ласкаво просимо до ITway LMS!", type: "system", isRead: true, createdAt: "3 дні тому" },
];

const typeIcons = {
  assignment: FileText,
  schedule: Calendar,
  coins: Coins,
  system: Bell,
  grade: CheckCircle,
};

const typeColors = {
  assignment: "bg-primary/10 text-primary",
  schedule: "bg-warning/10 text-warning",
  coins: "bg-success/10 text-success",
  system: "bg-muted text-muted-foreground",
  grade: "bg-success/10 text-success",
};

function NotificationItem({ notification }: { notification: Notification }) {
  const Icon = typeIcons[notification.type];

  return (
    <div className={cn(
      "flex items-start gap-4 p-4 rounded-lg transition-colors cursor-pointer",
      notification.isRead ? "bg-background" : "bg-accent/50"
    )}>
      <div className={cn("p-2 rounded-lg", typeColors[notification.type])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "font-medium",
            notification.isRead ? "text-foreground" : "text-foreground"
          )}>
            {notification.title}
            {!notification.isRead && (
              <span className="ml-2 inline-block w-2 h-2 rounded-full bg-primary" />
            )}
          </p>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {notification.createdAt}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const unreadCount = demoNotifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Сповіщення" 
        description="Всі важливі події та повідомлення"
      >
        <Button variant="outline">
          Позначити все як прочитане
        </Button>
      </PageHeader>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            Всі
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-primary text-primary-foreground">{unreadCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread">Непрочитані ({unreadCount})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-6">
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {demoNotifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="unread" className="mt-6">
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {demoNotifications.filter(n => !n.isRead).map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
