 import { Label } from "@/components/ui/label";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import type { DividerBlock } from "@/types/material-blocks";
 
 interface DividerBlockEditorProps {
   block: DividerBlock;
   onChange: (data: DividerBlock['data']) => void;
 }
 
 const styleLabels = {
   solid: 'Суцільна',
   dashed: 'Пунктирна',
   dotted: 'Крапками',
 };
 
 export function DividerBlockEditor({ block, onChange }: DividerBlockEditorProps) {
   const { data } = block;
 
   const lineClass = {
     solid: 'border-solid',
     dashed: 'border-dashed',
     dotted: 'border-dotted',
   };
 
   return (
     <div className="space-y-4">
       <div className="space-y-2">
         <Label>Стиль лінії</Label>
         <Select
           value={data.style}
           onValueChange={(v) => onChange({ style: v as typeof data.style })}
         >
           <SelectTrigger className="w-[180px]">
             <SelectValue />
           </SelectTrigger>
           <SelectContent>
             {Object.entries(styleLabels).map(([value, label]) => (
               <SelectItem key={value} value={value}>
                 {label}
               </SelectItem>
             ))}
           </SelectContent>
         </Select>
       </div>
 
       {/* Preview */}
       <div className="py-4">
         <hr className={`border-t-2 border-muted-foreground/25 ${lineClass[data.style]}`} />
       </div>
     </div>
   );
 }