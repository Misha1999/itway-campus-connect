import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, Search, FolderOpen, FileText, Video, Link2, File, 
  Upload, MoreHorizontal, Eye, Pencil, Trash2, Shield, 
  BookOpen, X 
} from "lucide-react";
import { useMaterials, type Material, type MaterialContentType } from "@/hooks/use-materials";
import { useCampuses } from "@/hooks/use-campuses";
import { MaterialAccessDialog } from "@/components/materials/MaterialAccessDialog";
import { format } from "date-fns";
import { uk } from "date-fns/locale";

const typeIcons: Record<MaterialContentType, React.ElementType> = {
  file: File,
  video: Video,
  link: Link2,
  text: FileText,
  homework: BookOpen,
  test: FileText,
};

const typeLabels: Record<MaterialContentType, string> = {
  file: "Файл",
  video: "Відео",
  link: "Посилання",
  text: "Текст",
  homework: "Домашка",
  test: "Тест",
};

const typeColors: Record<MaterialContentType, string> = {
  file: "bg-primary/10 text-primary",
  video: "bg-destructive/10 text-destructive",
  link: "bg-accent text-accent-foreground",
  text: "bg-secondary text-secondary-foreground",
  homework: "bg-muted text-muted-foreground",
  test: "bg-muted text-muted-foreground",
};

interface MaterialCardProps {
  material: Material;
  onView: (material: Material) => void;
  onEdit: (material: Material) => void;
  onManageAccess: (material: Material) => void;
  onDelete: (material: Material) => void;
  onPublish: (material: Material) => void;
}

function MaterialCard({ material, onView, onEdit, onManageAccess, onDelete, onPublish }: MaterialCardProps) {
  const Icon = typeIcons[material.content_type] || File;

  return (
    <Card className="hover:shadow-sm transition-shadow group">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${typeColors[material.content_type] || typeColors.file}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <h3 
                className="font-medium text-foreground group-hover:text-primary transition-colors cursor-pointer"
                onClick={() => onView(material)}
              >
                {material.title}
              </h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView(material)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Переглянути
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(material)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Редагувати
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onManageAccess(material)}>
                    <Shield className="h-4 w-4 mr-2" />
                    Надати доступ
                  </DropdownMenuItem>
                  {material.status === 'draft' && (
                    <DropdownMenuItem onClick={() => onPublish(material)}>
                      Опублікувати
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete(material)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Видалити
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {typeLabels[material.content_type]}
              </Badge>
              <StatusBadge status={material.status} />
            </div>

            {material.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {material.description}
              </p>
            )}
            
            {material.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {material.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {material.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{material.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              {material.campus_name && <span>{material.campus_name}</span>}
              <span>
                {format(new Date(material.created_at), "d MMM yyyy", { locale: uk })}
              </span>
              {material.access_rules && material.access_rules.length > 0 && (
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  {material.access_rules.length} правил
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LibraryPage() {
  const navigate = useNavigate();
  const { materials, loading, updateMaterial, deleteMaterial } = useMaterials();
  const { campuses } = useCampuses();
  
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [campusFilter, setCampusFilter] = useState("all");
  
  const [accessDialogMaterial, setAccessDialogMaterial] = useState<Material | null>(null);

  const filteredMaterials = useMemo(() => {
    return materials.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
      const matchesType = typeFilter === "all" || item.content_type === typeFilter;
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesCampus = campusFilter === "all" || item.campus_id === campusFilter;
      return matchesSearch && matchesType && matchesStatus && matchesCampus;
    });
  }, [materials, search, typeFilter, statusFilter, campusFilter]);

  const hasActiveFilters = typeFilter !== "all" || statusFilter !== "all" || 
    campusFilter !== "all" || search;

  const resetFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
    setCampusFilter("all");
  };

  const publishedCount = materials.filter(m => m.status === 'published').length;
  const draftCount = materials.filter(m => m.status === 'draft').length;

  const handlePublish = async (material: Material) => {
    await updateMaterial(material.id, { status: 'published' });
  };

  const handleDelete = async (material: Material) => {
    if (confirm(`Видалити матеріал "${material.title}"?`)) {
      await deleteMaterial(material.id);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Матеріали" description="Бібліотека навчальних матеріалів">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </PageHeader>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Матеріали" 
        description="Бібліотека навчальних матеріалів"
      >
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Завантажити
        </Button>
        <Button onClick={() => navigate('/library/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Додати
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold text-foreground">{materials.length}</div>
            <p className="text-sm text-muted-foreground">Всього матеріалів</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold text-foreground">{publishedCount}</div>
            <p className="text-sm text-muted-foreground">Опубліковано</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold text-foreground">{draftCount}</div>
            <p className="text-sm text-muted-foreground">Чернетки</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold text-foreground">
              {materials.filter(m => m.content_type === 'video').length}
            </div>
            <p className="text-sm text-muted-foreground">Відеоуроки</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Пошук матеріалів..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={campusFilter} onValueChange={setCampusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Заклад" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі заклади</SelectItem>
            {campuses.map((campus) => (
              <SelectItem key={campus.id} value={campus.id}>
                {campus.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Тип" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі типи</SelectItem>
            {Object.entries(typeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі статуси</SelectItem>
            <SelectItem value="published">Опубліковано</SelectItem>
            <SelectItem value="draft">Чернетка</SelectItem>
            <SelectItem value="archived">Архів</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X className="h-4 w-4 mr-1" />
            Скинути
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Всі ({filteredMaterials.length})</TabsTrigger>
          <TabsTrigger value="published">
            Опубліковані ({filteredMaterials.filter(m => m.status === 'published').length})
          </TabsTrigger>
          <TabsTrigger value="drafts">
            Чернетки ({filteredMaterials.filter(m => m.status === 'draft').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {filteredMaterials.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMaterials.map((item) => (
                <MaterialCard 
                  key={item.id} 
                  material={item}
                  onView={() => navigate(`/library/${item.id}/edit`)}
                  onEdit={() => navigate(`/library/${item.id}/edit`)}
                  onManageAccess={(m) => setAccessDialogMaterial(m)}
                  onDelete={handleDelete}
                  onPublish={handlePublish}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FolderOpen}
              title="Матеріалів не знайдено"
              description="Додайте навчальні матеріали для вашої бібліотеки"
              action={{
                label: "Додати матеріал",
                onClick: () => navigate('/library/create'),
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="published" className="mt-6">
          {filteredMaterials.filter(m => m.status === 'published').length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMaterials.filter(m => m.status === 'published').map((item) => (
                <MaterialCard 
                  key={item.id} 
                  material={item}
                  onView={() => navigate(`/library/${item.id}/edit`)}
                  onEdit={() => navigate(`/library/${item.id}/edit`)}
                  onManageAccess={(m) => setAccessDialogMaterial(m)}
                  onDelete={handleDelete}
                  onPublish={handlePublish}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FolderOpen}
              title="Немає опублікованих матеріалів"
              description="Опублікуйте чернетки для доступу студентам"
            />
          )}
        </TabsContent>

        <TabsContent value="drafts" className="mt-6">
          {filteredMaterials.filter(m => m.status === 'draft').length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMaterials.filter(m => m.status === 'draft').map((item) => (
                <MaterialCard 
                  key={item.id} 
                  material={item}
                  onView={() => navigate(`/library/${item.id}/edit`)}
                  onEdit={() => navigate(`/library/${item.id}/edit`)}
                  onManageAccess={(m) => setAccessDialogMaterial(m)}
                  onDelete={handleDelete}
                  onPublish={handlePublish}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FolderOpen}
              title="Немає чернеток"
              description="Всі матеріали опубліковані"
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Material Access Dialog */}
      <MaterialAccessDialog
        open={!!accessDialogMaterial}
        onOpenChange={(open) => !open && setAccessDialogMaterial(null)}
        material={accessDialogMaterial}
      />
    </div>
  );
}
