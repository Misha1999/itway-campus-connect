import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message === "Invalid login credentials" 
          ? "Невірний email або пароль" 
          : error.message);
        return;
      }

      if (data.session) {
        toast.success("Вхід успішний");
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Помилка входу в систему");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground font-bold text-2xl">
            IT
          </div>
          <h1 className="text-2xl font-semibold text-foreground">ITway LMS</h1>
          <p className="text-sm text-muted-foreground">Електронний щоденник</p>
        </div>

        {/* Login Card */}
        <Card className="border-border shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Вхід в систему</CardTitle>
            <CardDescription>
              Введіть ваші облікові дані для входу
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Пароль</Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Забули пароль?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-background"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Завантаження..." : "Увійти"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
