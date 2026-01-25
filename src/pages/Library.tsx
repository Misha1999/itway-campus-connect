import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, FolderOpen, FileText, Video, Link2, File, Upload, MoreHorizontal } from "lucide-react";

interface ContentItem {
  id: string;
  title: string;
  type: "file" | "video" | "link" | "document";
  direction: string;
  level: string;
  tags: string[];
  createdAt: string;
  downloads: number;
}

// Demo data
const demoContent: ContentItem[] = [
  { id: "1", title: "Вступ до Python - Презентація", type: "document", direction: "Programming", level: "Beginner", tags: ["Python", "Intro"], createdAt: "20.01.2025", downloads: 45 },
  { id: "2", title: "HTML Basics - Відеоурок", type: "video", direction: "Web Design", level: "Beginner", tags: ["HTML", "Web"], createdAt: "18.01.2025", downloads: 120 },
  { id: "3", title: "Roblox Studio Tutorial", type: "link", direction: "Roblox", level: "Beginner", tags: ["Roblox", "Game Dev"], createdAt: "15.01.2025", downloads: 38 },
  { id: "4", title: "CSS Flexbox Cheatsheet", type: "file", direction: "Web Design", level: "Intermediate", tags: ["CSS", "Flexbox"], createdAt: "12.01.2025", downloads: 89 },
  { id: "5", title: "3D Modeling Basics", type: "video", direction: "3D Design", level: "Beginner", tags: ["Blender", "3D"], createdAt: "10.01.2025", downloads: 56 },
  { id: "6", title: "Python Loops Practice", type: "file", direction: "Programming", level: "Beginner", tags: ["Python", "Practice"], createdAt: "08.01.2025", downloads: 72 },
];

const typeIcons = {
  file: File,
  video: Video,
  link: Link2,
  document: FileText,
};

const typeColors = {
  file: "bg-primary/10 text-primary",
  video: "bg-destructive/10 text-destructive",
  link: "bg-success/10 text-success",
  document: "bg-warning/10 text-warning",
};

function ContentCard({ item }: { item: ContentItem }) {
  const Icon = typeIcons[item.type];

  return (
    <Card className="hover:shadow-sm transition-shadow cursor-pointer group">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${typeColors[item.type]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                {item.title}
              </h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {item.direction} • {item.level}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span>{item.createdAt}</span>
              <span>{item.downloads} завантажень</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LibraryPage() {
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredContent = demoContent.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchesDirection = directionFilter === "all" || item.direction === directionFilter;
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    return matchesSearch && matchesDirection && matchesType;
  });

  const directions = ["Programming", "Web Design", "Roblox", "3D Design"];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Матеріали" 
        description="Бібліотека навчальних матеріалів ITway"
      >
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Завантажити
        </Button>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Додати
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold text-foreground">156</div>
            <p className="text-sm text-muted-foreground">Всього матеріалів</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold text-foreground">42</div>
            <p className="text-sm text-muted-foreground">Відеоуроки</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold text-foreground">89</div>
            <p className="text-sm text-muted-foreground">Документи</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold text-foreground">1.2k</div>
            <p className="text-sm text-muted-foreground">Завантажень</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Пошук матеріалів..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={directionFilter} onValueChange={setDirectionFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Напрям" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі напрями</SelectItem>
            {directions.map((dir) => (
              <SelectItem key={dir} value={dir}>{dir}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Тип" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі типи</SelectItem>
            <SelectItem value="document">Документи</SelectItem>
            <SelectItem value="video">Відео</SelectItem>
            <SelectItem value="file">Файли</SelectItem>
            <SelectItem value="link">Посилання</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content grid */}
      {filteredContent.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContent.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FolderOpen}
          title="Матеріалів не знайдено"
          description="Додайте навчальні матеріали для вашої бібліотеки"
          action={{
            label: "Додати матеріал",
            onClick: () => {},
          }}
        />
      )}
    </div>
  );
}
