import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2, Eye, EyeOff, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStudyData } from "@/hooks/use-study-data";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const roleLabels: Record<AppRole, string> = {
  admin_network: "Адмін мережі",
  admin_campus: "Адмін закладу",
  teacher: "Викладач",
  student: "Студент",
  parent_viewer: "Батьки (перегляд)",
};

interface Campus {
  id: string;
  name: string;
}

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campuses: Campus[];
  onSuccess: () => void;
}

interface GeneratedCredentials {
  login: string;
  password: string;
}

export function AddUserDialog({
  open,
  onOpenChange,
  campuses,
  onSuccess,
}: AddUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedLogin, setCopiedLogin] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<GeneratedCredentials | null>(null);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [role, setRole] = useState<AppRole>("student");
  const [campusId, setCampusId] = useState("");
  const [studyProgramId, setStudyProgramId] = useState("");
  const [enrollmentCohortId, setEnrollmentCohortId] = useState("");

  const { studyPrograms, enrollmentCohorts } = useStudyData(campusId || undefined);

  const isStudent = role === "student";

  // Filter study programs and cohorts by selected campus
  const filteredPrograms = studyPrograms.filter(p => !campusId || p.campus_id === campusId);
  const filteredCohorts = enrollmentCohorts.filter(c => !campusId || c.campus_id === campusId);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
    setPhone("");
    setBirthDate(undefined);
    setRole("student");
    setCampusId("");
    setStudyProgramId("");
    setEnrollmentCohortId("");
    setGeneratedCredentials(null);
  };

  useEffect(() => {
    if (!open) {
      setGeneratedCredentials(null);
    }
  }, [open]);

  const copyToClipboard = async (text: string, type: 'login' | 'password') => {
    await navigator.clipboard.writeText(text);
    if (type === 'login') {
      setCopiedLogin(true);
      setTimeout(() => setCopiedLogin(false), 2000);
    } else {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
    toast.success("Скопійовано в буфер обміну");
  };

  const handleSubmit = async () => {
    if (!fullName) {
      toast.error("Введіть ПІБ");
      return;
    }

    // For non-students, require email and password
    if (!isStudent && (!email || !password)) {
      toast.error("Заповніть email та пароль");
      return;
    }

    if (!isStudent && password.length < 6) {
      toast.error("Пароль повинен містити мінімум 6 символів");
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Ви не авторизовані");
        setLoading(false);
        return;
      }

      const response = await supabase.functions.invoke("create-user", {
        body: {
          email: isStudent ? `temp-${Date.now()}@student.local` : email,
          password: isStudent ? "temp-password" : password,
          full_name: fullName,
          phone: phone || undefined,
          birth_date: birthDate ? format(birthDate, "yyyy-MM-dd") : undefined,
          role,
          campus_id: campusId || undefined,
          study_program_id: isStudent ? studyProgramId || undefined : undefined,
          enrollment_cohort_id: isStudent ? enrollmentCohortId || undefined : undefined,
          generate_credentials: isStudent,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      // If student with generated credentials, show them
      if (isStudent && response.data?.generated_login && response.data?.generated_password) {
        setGeneratedCredentials({
          login: response.data.generated_login,
          password: response.data.generated_password,
        });
        toast.success(`Студента ${fullName} створено`);
      } else {
        toast.success(`Користувача ${fullName} створено`);
        resetForm();
        onOpenChange(false);
      }
      
      onSuccess();
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error(error instanceof Error ? error.message : "Помилка створення користувача");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {generatedCredentials ? "Облікові дані студента" : "Додати користувача"}
          </DialogTitle>
        </DialogHeader>

        {generatedCredentials ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Збережіть ці дані, вони знадобляться для входу студента в систему.
            </p>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Логін</Label>
                <div className="flex gap-2">
                  <Input value={generatedCredentials.login} readOnly />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(generatedCredentials.login, 'login')}
                  >
                    {copiedLogin ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Пароль</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={generatedCredentials.password}
                      readOnly
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(generatedCredentials.password, 'password')}
                  >
                    {copiedPassword ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button onClick={handleClose}>Закрити</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">ПІБ *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Прізвище Ім'я По батькові"
                />
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label>Роль *</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Campus */}
              <div className="space-y-2">
                <Label>Заклад {isStudent && "*"}</Label>
                <Select value={campusId || "__none__"} onValueChange={(v) => {
                  setCampusId(v === "__none__" ? "" : v);
                  setStudyProgramId("");
                  setEnrollmentCohortId("");
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть заклад" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Без закладу</SelectItem>
                    {campuses.map((campus) => (
                      <SelectItem key={campus.id} value={campus.id}>
                        {campus.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Student-specific fields */}
              {isStudent && (
                <>
                  {/* Study Program */}
                  <div className="space-y-2">
                    <Label>Програма навчання</Label>
                    <Select 
                      value={studyProgramId || "__none__"} 
                      onValueChange={(v) => setStudyProgramId(v === "__none__" ? "" : v)}
                      disabled={!campusId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={campusId ? "Оберіть програму" : "Спочатку оберіть заклад"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Без програми</SelectItem>
                        {filteredPrograms.map((program) => (
                          <SelectItem key={program.id} value={program.id}>
                            {program.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Enrollment Cohort */}
                  <div className="space-y-2">
                    <Label>Потік набору</Label>
                    <Select 
                      value={enrollmentCohortId || "__none__"} 
                      onValueChange={(v) => setEnrollmentCohortId(v === "__none__" ? "" : v)}
                      disabled={!campusId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={campusId ? "Оберіть потік" : "Спочатку оберіть заклад"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Без потоку</SelectItem>
                        {filteredCohorts.map((cohort) => (
                          <SelectItem key={cohort.id} value={cohort.id}>
                            {cohort.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <p className="text-sm text-muted-foreground bg-accent/50 p-3 rounded-md">
                    Логін та пароль будуть згенеровані автоматично на основі ПІБ та домену закладу.
                  </p>
                </>
              )}

              {/* Non-student fields: Email & Password */}
              {!isStudent && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Пароль *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Мінімум 6 символів"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+380501234567"
                />
              </div>

              {/* Birth Date */}
              <div className="space-y-2">
                <Label>Дата народження</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !birthDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {birthDate ? format(birthDate, "dd.MM.yyyy") : "Оберіть дату"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={birthDate}
                      onSelect={setBirthDate}
                      initialFocus
                      className="pointer-events-auto"
                      captionLayout="dropdown-buttons"
                      fromYear={1950}
                      toYear={new Date().getFullYear()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Скасувати
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={loading || !fullName || (!isStudent && (!email || !password))}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Створити
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
