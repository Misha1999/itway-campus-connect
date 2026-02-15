import { useState, useEffect } from "react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import {
  Trophy,
  Star,
  Coins,
  Award,
  Sparkles,
  Medal,
} from "lucide-react";

interface BadgeAward {
  id: string;
  badge_name: string;
  badge_description: string | null;
  badge_icon: string | null;
  points_value: number;
  reason: string | null;
  awarded_at: string;
}

// Student level thresholds
const levels = [
  { level: 1, name: "Новачок", minCoins: 0, icon: "🌱" },
  { level: 2, name: "Учень", minCoins: 100, icon: "📚" },
  { level: 3, name: "Практик", minCoins: 300, icon: "⚡" },
  { level: 4, name: "Знавець", minCoins: 600, icon: "🎯" },
  { level: 5, name: "Майстер", minCoins: 1000, icon: "🏆" },
  { level: 6, name: "Експерт", minCoins: 1500, icon: "💎" },
  { level: 7, name: "Легенда", minCoins: 2500, icon: "👑" },
];

function getLevel(coins: number) {
  let current = levels[0];
  for (const l of levels) {
    if (coins >= l.minCoins) current = l;
    else break;
  }
  const nextIdx = levels.findIndex((l) => l.level === current.level) + 1;
  const next = nextIdx < levels.length ? levels[nextIdx] : null;
  const progressToNext = next
    ? Math.round(((coins - current.minCoins) / (next.minCoins - current.minCoins)) * 100)
    : 100;
  return { current, next, progressToNext };
}

export default function StudentAchievementsPage() {
  const [loading, setLoading] = useState(true);
  const [awards, setAwards] = useState<BadgeAward[]>([]);
  const [coinBalance, setCoinBalance] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Coin balance
    const { data: balance } = await supabase.rpc("get_coin_balance", { _student_id: user.id });
    setCoinBalance(typeof balance === "number" ? balance : 0);

    // Badge awards
    const { data: badgeAwards } = await supabase
      .from("badge_awards")
      .select("id, reason, awarded_at, badges:badge_id (name, description, icon_url, points_value)")
      .eq("student_id", user.id)
      .order("awarded_at", { ascending: false });

    if (badgeAwards) {
      setAwards(badgeAwards.map((a: any) => ({
        id: a.id,
        badge_name: a.badges?.name || "Бейдж",
        badge_description: a.badges?.description,
        badge_icon: a.badges?.icon_url,
        points_value: a.badges?.points_value || 0,
        reason: a.reason,
        awarded_at: a.awarded_at,
      })));
    }

    setLoading(false);
  };

  const { current: currentLevel, next: nextLevel, progressToNext } = getLevel(coinBalance);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Досягнення" description="Твої нагороди та рівень" />

      {/* Level card */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 text-3xl">
              {currentLevel.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">Рівень {currentLevel.level}</h2>
                <Badge variant="secondary">{currentLevel.name}</Badge>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <Coins className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium text-foreground">{coinBalance} монет</span>
              </div>
            </div>
          </div>
          {nextLevel && (
            <div>
              <div className="flex items-center justify-between mb-1.5 text-sm">
                <span className="text-muted-foreground">До рівня «{nextLevel.name}»</span>
                <span className="text-muted-foreground">{nextLevel.minCoins - coinBalance} монет</span>
              </div>
              <Progress value={progressToNext} className="h-2.5" />
            </div>
          )}
          {!nextLevel && (
            <div className="flex items-center gap-2 text-success">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Максимальний рівень досягнуто!</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-warning/10">
              <Trophy className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{awards.length}</p>
              <p className="text-xs text-muted-foreground">Бейджів отримано</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-success/10">
              <Star className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {awards.reduce((sum, a) => sum + a.points_value, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Балів за бейджі</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badges */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Medal className="h-5 w-5 text-primary" />
          Мої бейджі
        </h2>
        {awards.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="Бейджів поки немає"
            description="Виконуй завдання, відвідуй заняття — і тут з'являться нагороди!"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {awards.map((award) => (
              <Card key={award.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-warning/10 text-xl">
                    {award.badge_icon || "🏅"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{award.badge_name}</p>
                    {award.badge_description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{award.badge_description}</p>
                    )}
                    {award.reason && (
                      <p className="text-xs text-muted-foreground mt-0.5">«{award.reason}»</p>
                    )}
                  </div>
                  <div className="text-right">
                    {award.points_value > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        +{award.points_value}
                      </Badge>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(award.awarded_at), "d MMM yyyy", { locale: uk })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
