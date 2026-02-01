import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Bell, CheckCircle, Clock, FileText, Calendar, Coins, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { uk } from "date-fns/locale";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  link: string | null;
}

const typeIcons: Record<string, typeof FileText> = {
  assignment: FileText,
  schedule: Calendar,
  coins: Coins,
  system: Bell,
  grade: CheckCircle,
  info: Bell,
};

const typeColors: Record<string, string> = {
  assignment: "bg-primary/10 text-primary",
  schedule: "bg-warning/10 text-warning",
  coins: "bg-success/10 text-success",
  system: "bg-muted text-muted-foreground",
  grade: "bg-success/10 text-success",
  info: "bg-muted text-muted-foreground",
};

function NotificationItem({ 
  notification,
  onMarkRead,
}: { 
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const Icon = typeIcons[notification.type] || Bell;

  return (
    <div 
      className={cn(
        "flex items-start gap-4 p-4 rounded-lg transition-colors cursor-pointer",
        notification.is_read ? "bg-background" : "bg-accent/50"
      )}
      onClick={() => !notification.is_read && onMarkRead(notification.id)}
    >
      <div className={cn("p-2 rounded-lg", typeColors[notification.type] || typeColors.info)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "font-medium",
            notification.is_read ? "text-foreground" : "text-foreground"
          )}>
            {notification.title}
            {!notification.is_read && (
              <span className="ml-2 inline-block w-2 h-2 rounded-full bg-primary" />
            )}
          </p>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(notification.created_at), { 
              addSuffix: true,
              locale: uk 
            })}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching notifications:", error);
    } else {
      setNotifications(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    }
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setMarkingAll(true);
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      toast.error("Помилка оновлення сповіщень");
    } else {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success("Всі сповіщення позначено як прочитані");
    }
    setMarkingAll(false);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Сповіщення" description="Всі важливі події та повідомлення" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Сповіщення" 
        description="Всі важливі події та повідомлення"
      >
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead} disabled={markingAll}>
            {markingAll && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Позначити все як прочитане
          </Button>
        )}
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
          {notifications.length > 0 ? (
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {notifications.map((notification) => (
                  <NotificationItem 
                    key={notification.id} 
                    notification={notification}
                    onMarkRead={markAsRead}
                  />
                ))}
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={Bell}
              title="Сповіщень немає"
              description="Тут з'являтимуться ваші сповіщення"
            />
          )}
        </TabsContent>
        <TabsContent value="unread" className="mt-6">
          {notifications.filter(n => !n.is_read).length > 0 ? (
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {notifications.filter(n => !n.is_read).map((notification) => (
                  <NotificationItem 
                    key={notification.id} 
                    notification={notification}
                    onMarkRead={markAsRead}
                  />
                ))}
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={CheckCircle}
              title="Все прочитано"
              description="У вас немає непрочитаних сповіщень"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
