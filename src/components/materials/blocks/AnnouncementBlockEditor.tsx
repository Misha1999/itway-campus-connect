 import { Label } from "@/components/ui/label";
 import { Input } from "@/components/ui/input";
 import { Textarea } from "@/components/ui/textarea";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
 import type { AnnouncementBlock } from "@/types/material-blocks";
 
 interface AnnouncementBlockEditorProps {
   block: AnnouncementBlock;
   onChange: (data: AnnouncementBlock['data']) => void;
 }
 
 const variantIcons = {
   info: Info,
   warning: AlertTriangle,
   success: CheckCircle,
   error: XCircle,
 };
 
 const variantLabels = {
   info: 'Інформація',
   warning: 'Попередження',
   success: 'Успіх',
   error: 'Помилка',
 };
 
 const variantColors = {
   info: 'bg-primary/10 border-primary/20',
   warning: 'bg-amber-500/10 border-amber-500/20',
   success: 'bg-emerald-500/10 border-emerald-500/20',
   error: 'bg-destructive/10 border-destructive/20',
 };
 
 export function AnnouncementBlockEditor({ block, onChange }: AnnouncementBlockEditorProps) {
   const { data } = block;
   const Icon = variantIcons[data.variant];
 
   return (
     <div className="space-y-4">
       <div className="space-y-2">
         <Label>Тип оголошення</Label>
         <Select
           value={data.variant}
           onValueChange={(v) => onChange({ ...data, variant: v as typeof data.variant })}
         >
           <SelectTrigger>
             <SelectValue />
           </SelectTrigger>
           <SelectContent>
             {Object.entries(variantLabels).map(([value, label]) => {
               const VIcon = variantIcons[value as keyof typeof variantIcons];
               return (
                 <SelectItem key={value} value={value}>
                   <div className="flex items-center gap-2">
                     <VIcon className="h-4 w-4" />
                     {label}
                   </div>
                 </SelectItem>
               );
             })}
           </SelectContent>
         </Select>
       </div>
 
       <div className="space-y-2">
         <Label htmlFor={`ann-title-${block.id}`}>Заголовок (необов'язково)</Label>
         <Input
           id={`ann-title-${block.id}`}
           value={data.title || ''}
           onChange={(e) => onChange({ ...data, title: e.target.value })}
           placeholder="Заголовок оголошення"
         />
       </div>
 
       <div className="space-y-2">
         <Label htmlFor={`ann-content-${block.id}`}>Текст</Label>
         <Textarea
           id={`ann-content-${block.id}`}
           value={data.content}
           onChange={(e) => onChange({ ...data, content: e.target.value })}
           placeholder="Текст оголошення"
           rows={3}
         />
       </div>
 
       {/* Preview */}
       {data.content && (
         <div className={`p-4 rounded-lg border ${variantColors[data.variant]}`}>
           <div className="flex gap-3">
             <Icon className="h-5 w-5 shrink-0 mt-0.5" />
             <div>
               {data.title && <p className="font-medium mb-1">{data.title}</p>}
               <p className="text-sm">{data.content}</p>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 }