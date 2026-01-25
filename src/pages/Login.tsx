import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Demo login - navigate to dashboard
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Вхід успішний",
        description: "Ласкаво просимо до ITway LMS",
      });
      navigate("/dashboard");
    }, 1000);
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

        {/* Demo accounts info */}
        <Card className="border-border bg-muted/50">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-foreground mb-2">Демо-акаунти:</p>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>admin@itway.edu.ua (Адмін мережі)</p>
              <p>teacher@itway.edu.ua (Викладач)</p>
              <p>student@itway.edu.ua (Студент)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
