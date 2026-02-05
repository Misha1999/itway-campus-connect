 import { useState } from "react";
 import { Label } from "@/components/ui/label";
 import { Input } from "@/components/ui/input";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Link2, File, Plus, X, ExternalLink, FileText } from "lucide-react";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import type { MaterialsBlock } from "@/types/material-blocks";
 
 interface MaterialsBlockEditorProps {
   block: MaterialsBlock;
   onChange: (data: MaterialsBlock['data']) => void;
 }
 
 export function MaterialsBlockEditor({ block, onChange }: MaterialsBlockEditorProps) {
   const { data } = block;
   const [newItemType, setNewItemType] = useState<'link' | 'file'>('link');
   const [newItemTitle, setNewItemTitle] = useState('');
   const [newItemUrl, setNewItemUrl] = useState('');
 
   const addItem = () => {
     if (!newItemTitle.trim() || !newItemUrl.trim()) return;
 
     const newItem = {
       id: crypto.randomUUID(),
       type: newItemType,
       title: newItemTitle.trim(),
       url: newItemUrl.trim(),
     };
 
     onChange({ items: [...data.items, newItem] });
     setNewItemTitle('');
     setNewItemUrl('');
   };
 
   const removeItem = (id: string) => {
     onChange({ items: data.items.filter(item => item.id !== id) });
   };
 
   return (
     <div className="space-y-4">
       {/* Existing items */}
       {data.items.length > 0 && (
         <div className="space-y-2">
           <Label>Додані матеріали</Label>
           <div className="space-y-2">
             {data.items.map((item) => (
               <div
                 key={item.id}
                 className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50"
               >
                 {item.type === 'link' ? (
                   <Link2 className="h-4 w-4 text-primary shrink-0" />
                 ) : (
                   <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                 )}
                 <div className="flex-1 min-w-0">
                   <p className="font-medium text-sm truncate">{item.title}</p>
                   <p className="text-xs text-muted-foreground truncate">{item.url}</p>
                 </div>
                 <Badge variant="secondary" className="shrink-0">
                   {item.type === 'link' ? 'Посилання' : 'Файл'}
                 </Badge>
                 <Button
                   type="button"
                   variant="ghost"
                   size="icon"
                   className="h-8 w-8 shrink-0"
                   onClick={() => removeItem(item.id)}
                 >
                   <X className="h-4 w-4" />
                 </Button>
               </div>
             ))}
           </div>
         </div>
       )}
 
       {/* Add new item */}
       <div className="space-y-3 p-4 rounded-lg border border-dashed">
         <div className="flex gap-2">
           <Select value={newItemType} onValueChange={(v) => setNewItemType(v as 'link' | 'file')}>
             <SelectTrigger className="w-[140px]">
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="link">
                 <div className="flex items-center gap-2">
                   <Link2 className="h-4 w-4" />
                   Посилання
                 </div>
               </SelectItem>
               <SelectItem value="file">
                 <div className="flex items-center gap-2">
                   <File className="h-4 w-4" />
                   Файл
                 </div>
               </SelectItem>
             </SelectContent>
           </Select>
         </div>
         <Input
           value={newItemTitle}
           onChange={(e) => setNewItemTitle(e.target.value)}
           placeholder="Назва"
         />
         <Input
           value={newItemUrl}
           onChange={(e) => setNewItemUrl(e.target.value)}
           placeholder={newItemType === 'link' ? 'https://...' : 'URL файлу'}
         />
         <Button
           type="button"
           variant="outline"
           size="sm"
           onClick={addItem}
           disabled={!newItemTitle.trim() || !newItemUrl.trim()}
         >
           <Plus className="h-4 w-4 mr-1" />
           Додати {newItemType === 'link' ? 'посилання' : 'файл'}
         </Button>
       </div>
     </div>
   );
 }