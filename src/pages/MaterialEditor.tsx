 import { useState, useEffect, useCallback } from "react";
 import { useNavigate, useParams } from "react-router-dom";
 import { PageHeader } from "@/components/ui/page-header";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Separator } from "@/components/ui/separator";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
 } from "@/components/ui/alert-dialog";
 import { ArrowLeft, Save, Eye, X, Loader2 } from "lucide-react";
 import { useCampuses } from "@/hooks/use-campuses";
 import { useMaterials, type MaterialStatus } from "@/hooks/use-materials";
 import { BlockEditor, AddBlockButton } from "@/components/materials/blocks";
 import type {
   ContentBlock,
   BlockType,
   TextBlock,
   MediaBlock,
   MaterialsBlock,
   AnnouncementBlock,
   DividerBlock,
 } from "@/types/material-blocks";
 import { toast } from "sonner";
 
 function createDefaultBlockData(type: BlockType): ContentBlock['data'] {
   switch (type) {
     case 'text':
       return { content: '' };
     case 'media':
       return { url: '' };
     case 'materials':
       return { items: [] };
     case 'announcement':
       return { variant: 'info', content: '' };
     case 'divider':
       return { style: 'solid' };
   }
 }
 
 export default function MaterialEditorPage() {
   const navigate = useNavigate();
   const { id } = useParams();
   const isEditing = !!id;
 
   const { campuses } = useCampuses();
   const { materials, createMaterial, updateMaterial } = useMaterials();
 
   // Form state
   const [title, setTitle] = useState("");
   const [description, setDescription] = useState("");
   const [campusId, setCampusId] = useState("");
   const [status, setStatus] = useState<MaterialStatus>("draft");
   const [tagInput, setTagInput] = useState("");
   const [tags, setTags] = useState<string[]>([]);
   const [blocks, setBlocks] = useState<ContentBlock[]>([]);
 
   const [loading, setLoading] = useState(false);
   const [showExitDialog, setShowExitDialog] = useState(false);
   const [hasChanges, setHasChanges] = useState(false);
 
   // Load existing material for editing
   useEffect(() => {
     if (isEditing && materials.length > 0) {
       const material = materials.find(m => m.id === id);
       if (material) {
         setTitle(material.title);
         setDescription(material.description || "");
         setCampusId(material.campus_id || "");
         setStatus(material.status);
         setTags(material.tags || []);
         // Load blocks from content_text if it's JSON
         if (material.content_text) {
           try {
             const parsed = JSON.parse(material.content_text);
             if (Array.isArray(parsed)) {
               setBlocks(parsed);
             }
           } catch {
             // Not JSON, create a text block with the content
             if (material.content_text) {
               setBlocks([{
                 id: crypto.randomUUID(),
                 type: 'text',
                 order: 0,
                 data: { content: material.content_text },
               }]);
             }
           }
         }
       }
     }
   }, [id, isEditing, materials]);
 
   // Set default campus
   useEffect(() => {
     if (!campusId && campuses.length > 0) {
       setCampusId(campuses[0].id);
     }
   }, [campuses, campusId]);
 
   const addBlock = useCallback((type: BlockType, afterIndex?: number) => {
     const newBlock: ContentBlock = {
       id: crypto.randomUUID(),
       type,
       order: afterIndex !== undefined ? afterIndex + 1 : blocks.length,
       data: createDefaultBlockData(type),
     } as ContentBlock;
 
     setBlocks(prev => {
       if (afterIndex !== undefined) {
         const newBlocks = [...prev];
         newBlocks.splice(afterIndex + 1, 0, newBlock);
         return newBlocks.map((b, i) => ({ ...b, order: i }));
       }
       return [...prev, newBlock];
     });
     setHasChanges(true);
   }, [blocks.length]);
 
   const updateBlock = useCallback((blockId: string, data: ContentBlock['data']) => {
     setBlocks(prev => prev.map(b => 
       b.id === blockId ? { ...b, data } as ContentBlock : b
     ));
     setHasChanges(true);
   }, []);
 
   const moveBlock = useCallback((index: number, direction: 'up' | 'down') => {
     setBlocks(prev => {
       const newBlocks = [...prev];
       const targetIndex = direction === 'up' ? index - 1 : index + 1;
       if (targetIndex < 0 || targetIndex >= newBlocks.length) return prev;
       
       [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
       return newBlocks.map((b, i) => ({ ...b, order: i }));
     });
     setHasChanges(true);
   }, []);
 
   const copyBlock = useCallback((index: number) => {
     setBlocks(prev => {
       const blockToCopy = prev[index];
       const newBlock: ContentBlock = {
         ...blockToCopy,
         id: crypto.randomUUID(),
         data: JSON.parse(JSON.stringify(blockToCopy.data)),
       } as ContentBlock;
       
       const newBlocks = [...prev];
       newBlocks.splice(index + 1, 0, newBlock);
       return newBlocks.map((b, i) => ({ ...b, order: i }));
     });
     setHasChanges(true);
   }, []);
 
   const deleteBlock = useCallback((index: number) => {
     setBlocks(prev => prev.filter((_, i) => i !== index).map((b, i) => ({ ...b, order: i })));
     setHasChanges(true);
   }, []);
 
   const addTag = () => {
     const tag = tagInput.trim();
     if (tag && !tags.includes(tag)) {
       setTags([...tags, tag]);
       setTagInput("");
       setHasChanges(true);
     }
   };
 
   const removeTag = (tagToRemove: string) => {
     setTags(tags.filter(t => t !== tagToRemove));
     setHasChanges(true);
   };
 
   const handleSave = async (publish: boolean = false) => {
     if (!title.trim()) {
       toast.error("Введіть назву матеріалу");
       return;
     }
     if (!campusId) {
       toast.error("Оберіть заклад");
       return;
     }
 
     setLoading(true);
     try {
       const materialData = {
         campus_id: campusId,
         title: title.trim(),
         description: description.trim() || null,
         content_type: 'text' as const, // Store blocks as text
         content_text: JSON.stringify(blocks),
         tags,
         status: publish ? 'published' as const : status,
       };
 
       if (isEditing && id) {
         await updateMaterial(id, materialData);
         toast.success("Матеріал збережено");
       } else {
         const result = await createMaterial(materialData);
         if (result) {
           toast.success("Матеріал створено");
           navigate('/library');
         }
       }
       setHasChanges(false);
     } finally {
       setLoading(false);
     }
   };
 
   const handleBack = () => {
     if (hasChanges) {
       setShowExitDialog(true);
     } else {
       navigate('/library');
     }
   };
 
   return (
     <div className="space-y-6 animate-fade-in pb-20">
       <PageHeader
         title={isEditing ? "Редагування матеріалу" : "Новий матеріал"}
         description="Наповніть матеріал блоками контенту"
       >
         <Button variant="ghost" onClick={handleBack}>
           <ArrowLeft className="h-4 w-4 mr-2" />
           Назад
         </Button>
       </PageHeader>
 
       <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
         {/* Main content area */}
         <div className="space-y-4">
           {/* Title & Description */}
           <Card>
             <CardContent className="pt-6 space-y-4">
               <div className="space-y-2">
                 <Label htmlFor="title">Назва матеріалу *</Label>
                 <Input
                   id="title"
                   value={title}
                   onChange={(e) => { setTitle(e.target.value); setHasChanges(true); }}
                   placeholder="Введіть назву"
                   className="text-lg"
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="description">Короткий опис</Label>
                 <Textarea
                   id="description"
                   value={description}
                   onChange={(e) => { setDescription(e.target.value); setHasChanges(true); }}
                   placeholder="Опис матеріалу для списку"
                   rows={2}
                 />
               </div>
             </CardContent>
           </Card>
 
           {/* Blocks */}
           <div className="space-y-3">
             {blocks.length === 0 ? (
               <AddBlockButton onAddBlock={(type) => addBlock(type)} />
             ) : (
               <>
                 {blocks.map((block, index) => (
                   <div key={block.id}>
                     <BlockEditor
                       block={block}
                       isFirst={index === 0}
                       isLast={index === blocks.length - 1}
                       onUpdate={(data) => updateBlock(block.id, data)}
                       onMoveUp={() => moveBlock(index, 'up')}
                       onMoveDown={() => moveBlock(index, 'down')}
                       onCopy={() => copyBlock(index)}
                       onDelete={() => deleteBlock(index)}
                     />
                     <AddBlockButton
                       variant="inline"
                       onAddBlock={(type) => addBlock(type, index)}
                     />
                   </div>
                 ))}
               </>
             )}
           </div>
         </div>
 
         {/* Sidebar */}
         <div className="space-y-4">
           {/* Actions */}
           <Card>
             <CardHeader className="pb-3">
               <CardTitle className="text-base">Дії</CardTitle>
             </CardHeader>
             <CardContent className="space-y-3">
               <Button
                 className="w-full"
                 onClick={() => handleSave(false)}
                 disabled={loading}
               >
                 {loading ? (
                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                 ) : (
                   <Save className="h-4 w-4 mr-2" />
                 )}
                 Зберегти
               </Button>
               {status === 'draft' && (
                 <Button
                   variant="outline"
                   className="w-full"
                   onClick={() => handleSave(true)}
                   disabled={loading}
                 >
                   <Eye className="h-4 w-4 mr-2" />
                   Опублікувати
                 </Button>
               )}
             </CardContent>
           </Card>
 
           {/* Settings */}
           <Card>
             <CardHeader className="pb-3">
               <CardTitle className="text-base">Налаштування</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className="space-y-2">
                 <Label>Заклад *</Label>
                 <Select value={campusId} onValueChange={(v) => { setCampusId(v); setHasChanges(true); }}>
                   <SelectTrigger>
                     <SelectValue placeholder="Оберіть заклад" />
                   </SelectTrigger>
                   <SelectContent>
                     {campuses.map((campus) => (
                       <SelectItem key={campus.id} value={campus.id}>
                         {campus.name}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
 
               <div className="space-y-2">
                 <Label>Статус</Label>
                 <Select value={status} onValueChange={(v) => { setStatus(v as MaterialStatus); setHasChanges(true); }}>
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="draft">Чернетка</SelectItem>
                     <SelectItem value="published">Опубліковано</SelectItem>
                     <SelectItem value="archived">Архів</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
 
               <Separator />
 
               <div className="space-y-2">
                 <Label>Теги</Label>
                 <div className="flex gap-2">
                   <Input
                     value={tagInput}
                     onChange={(e) => setTagInput(e.target.value)}
                     placeholder="Новий тег"
                     onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                     className="flex-1"
                   />
                   <Button type="button" variant="outline" size="sm" onClick={addTag}>
                     +
                   </Button>
                 </div>
                 {tags.length > 0 && (
                   <div className="flex flex-wrap gap-1 mt-2">
                     {tags.map((tag) => (
                       <Badge key={tag} variant="secondary" className="gap-1">
                         {tag}
                         <X
                           className="h-3 w-3 cursor-pointer"
                           onClick={() => removeTag(tag)}
                         />
                       </Badge>
                     ))}
                   </div>
                 )}
               </div>
             </CardContent>
           </Card>
 
           {/* Info */}
           <Card>
             <CardContent className="pt-4 text-sm text-muted-foreground">
               <p>Усі блоки: {blocks.length}</p>
               <p className="mt-1">
                 Блоки можна переміщати, копіювати та видаляти через меню справа.
               </p>
             </CardContent>
           </Card>
         </div>
       </div>
 
       {/* Exit confirmation dialog */}
       <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Незбережені зміни</AlertDialogTitle>
             <AlertDialogDescription>
               У вас є незбережені зміни. Ви впевнені, що хочете вийти?
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Залишитися</AlertDialogCancel>
             <AlertDialogAction onClick={() => navigate('/library')}>
               Вийти без збереження
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </div>
   );
 }