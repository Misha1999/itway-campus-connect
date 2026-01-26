import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { CalendarIcon, Upload, X, Plus, Trash2, GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { FileUploader } from "./FileUploader";
import { GradingCriteria, type Criterion } from "./GradingCriteria";

const assignmentSchema = z.object({
  title: z.string().min(3, "Мінімум 3 символи"),
  description: z.string().optional(),
  instructions: z.string().optional(),
  groupId: z.string().min(1, "Оберіть групу"),
  lessonId: z.string().optional(),
  workType: z.enum(["homework", "practice", "project", "test", "activity"]),
  deadline: z.date({ required_error: "Оберіть дедлайн" }),
  deadlineTime: z.string().default("23:59"),
  maxScore: z.number().min(1).max(1000).default(100),
  allowResubmission: z.boolean().default(true),
  visibleFrom: z.date().optional(),
  status: z.enum(["draft", "published"]).default("draft"),
});

type AssignmentFormValues = z.infer<typeof assignmentSchema>;

interface Group {
  id: string;
  name: string;
  course?: string;
}

interface Lesson {
  id: string;
  name: string;
  moduleId: string;
}

interface AssignmentFormProps {
  groups: Group[];
  lessons?: Lesson[];
  onSubmit: (data: AssignmentFormValues & { 
    fileUrls: string[]; 
    criteria: Criterion[] 
  }) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<AssignmentFormValues>;
  isLoading?: boolean;
}

const workTypeLabels: Record<string, string> = {
  homework: "Домашнє завдання",
  practice: "Практична робота",
  project: "Проєкт",
  test: "Тест / Контрольна",
  activity: "Активність на уроці",
};

export function AssignmentForm({
  groups,
  lessons = [],
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}: AssignmentFormProps) {
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([
    { id: crypto.randomUUID(), name: "", maxScore: 0 },
  ]);

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      instructions: initialData?.instructions || "",
      groupId: initialData?.groupId || "",
      lessonId: initialData?.lessonId || "",
      workType: initialData?.workType || "homework",
      deadline: initialData?.deadline || undefined,
      deadlineTime: "23:59",
      maxScore: initialData?.maxScore || 100,
      allowResubmission: initialData?.allowResubmission ?? true,
      status: initialData?.status || "draft",
    },
  });

  const handleSubmit = async (data: AssignmentFormValues) => {
    // Filter out empty criteria
    const validCriteria = criteria.filter(c => c.name.trim() !== "" && c.maxScore > 0);
    await onSubmit({ ...data, fileUrls, criteria: validCriteria });
  };

  const handleFilesChange = useCallback((urls: string[]) => {
    setFileUrls(urls);
  }, []);

  const selectedWorkType = form.watch("workType");
  const totalCriteriaScore = criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Основна інформація</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Назва завдання *</FormLabel>
                  <FormControl>
                    <Input placeholder="Наприклад: Проєкт Калькулятор" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="groupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Група *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Оберіть групу" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name} {group.course && `• ${group.course}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="workType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип роботи *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(workTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {lessons.length > 0 && (
              <FormField
                control={form.control}
                name="lessonId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Прив'язати до уроку</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Без прив'язки" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Без прив'язки</SelectItem>
                        {lessons.map((lesson) => (
                          <SelectItem key={lesson.id} value={lesson.id}>
                            {lesson.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Опціонально: пов'яжіть завдання з конкретним уроком
                    </FormDescription>
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Опис</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Короткий опис завдання для студентів..."
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Інструкції виконання</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Детальні інструкції: що потрібно зробити, як здати, формат здачі..."
                      className="min-h-[120px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Підтримується Markdown для форматування
                  </FormDescription>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Deadline & Scoring */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Дедлайн та оцінювання</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Дедлайн *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "d MMMM yyyy", { locale: uk })
                            ) : (
                              <span>Оберіть дату</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deadlineTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Час</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Максимальний бал</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        max={1000}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 100)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="visibleFrom"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Показати студентам з</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[280px] pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "d MMMM yyyy", { locale: uk })
                          ) : (
                            <span>Одразу після публікації</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Заплануйте показ завдання на певну дату
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allowResubmission"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Дозволити перездачу</FormLabel>
                    <FormDescription>
                      Студенти зможуть повторно здати роботу після перевірки
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Grading Criteria */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Критерії оцінювання</span>
              {criteria.length > 0 && totalCriteriaScore > 0 && (
                <Badge variant="secondary">
                  Сума: {totalCriteriaScore} балів
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GradingCriteria 
              criteria={criteria} 
              onChange={setCriteria}
              maxTotal={form.watch("maxScore")}
            />
          </CardContent>
        </Card>

        {/* File Attachments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Прикріплені файли</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUploader
              bucket="assignments"
              onFilesChange={handleFilesChange}
              maxFiles={10}
              maxSizeMB={50}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Скасувати
          </Button>
          
          <div className="flex gap-2">
            <Button 
              type="submit" 
              variant="outline"
              disabled={isLoading}
              onClick={() => form.setValue("status", "draft")}
            >
              Зберегти як чернетку
            </Button>
            <Button 
              type="submit"
              disabled={isLoading}
              onClick={() => form.setValue("status", "published")}
            >
              {isLoading ? "Збереження..." : "Опублікувати"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
