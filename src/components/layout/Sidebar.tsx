import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  GraduationCap,
  Calendar,
  BookOpen,
  ClipboardList,
  FileText,
  Coins,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Trophy,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navItems: NavItem[] = [
  { title: "Головна", href: "/dashboard", icon: LayoutDashboard },
  { title: "Заклади", href: "/campuses", icon: Building2, roles: ["admin_network"] },
  { title: "Користувачі", href: "/users", icon: Users, roles: ["admin_network", "admin_campus"] },
  { title: "Групи", href: "/groups", icon: GraduationCap, roles: ["admin_network", "admin_campus", "teacher"] },
  { title: "Розклад", href: "/schedule", icon: Calendar },
  { title: "Журнал", href: "/gradebook", icon: ClipboardList, roles: ["admin_network", "admin_campus", "teacher"] },
  { title: "Завдання", href: "/assignments", icon: FileText },
  { title: "Оцінки", href: "/grades", icon: BarChart3, roles: ["student"] },
  { title: "Прогрес", href: "/progress", icon: TrendingUp, roles: ["student"] },
  { title: "Досягнення", href: "/achievements", icon: Trophy, roles: ["student"] },
  { title: "Матеріали", href: "/library", icon: BookOpen, roles: ["admin_network", "admin_campus", "teacher"] },
  { title: "Монети", href: "/coins", icon: Coins },
  { title: "Сповіщення", href: "/notifications", icon: Bell },
  { title: "Налаштування", href: "/settings", icon: Settings },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { roles, loading: rolesLoading } = useUserRole();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Ви вийшли з системи");
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Помилка виходу");
    }
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={cn(
      "flex flex-col h-full bg-card border-r border-border",
      !isMobile && (collapsed ? "w-16" : "w-64"),
      isMobile && "w-full"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground font-bold text-lg">
          IT
        </div>
        {(!collapsed || isMobile) && (
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">ITway</span>
            <span className="text-xs text-muted-foreground">LMS</span>
          </div>
        )}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-8 w-8"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.filter((item) => {
          if (!item.roles) return true;
          if (rolesLoading) return false;
          // admin_network sees everything
          if (roles.includes("admin_network")) return true;
          return item.roles.some((r) => roles.includes(r as any));
        }).map((item) => {
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {(!collapsed || isMobile) && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-2 border-t border-border">
        <button 
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full",
            "text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {(!collapsed || isMobile) && <span>Вийти</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn("hidden lg:flex h-screen sticky top-0", className)}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden fixed top-4 left-4 z-50">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72">
          <SidebarContent isMobile />
        </SheetContent>
      </Sheet>
    </>
  );
}
