 import { Label } from "@/components/ui/label";
 import { Input } from "@/components/ui/input";
 import { Textarea } from "@/components/ui/textarea";
 import type { TextBlock } from "@/types/material-blocks";
 
 interface TextBlockEditorProps {
   block: TextBlock;
   onChange: (data: TextBlock['data']) => void;
 }
 
 export function TextBlockEditor({ block, onChange }: TextBlockEditorProps) {
   const { data } = block;
 
   return (
     <div className="space-y-4">
       <div className="space-y-2">
         <Label htmlFor={`title-${block.id}`}>Заголовок</Label>
         <Input
           id={`title-${block.id}`}
           value={data.title || ''}
           onChange={(e) => onChange({ ...data, title: e.target.value })}
           placeholder="Введіть заголовок"
         />
       </div>
       <div className="space-y-2">
         <Label htmlFor={`content-${block.id}`}>Текст</Label>
         <Textarea
           id={`content-${block.id}`}
           value={data.content}
           onChange={(e) => onChange({ ...data, content: e.target.value })}
           placeholder="Введіть основний текст"
           rows={5}
         />
       </div>
       <div className="space-y-2">
         <Label htmlFor={`desc-${block.id}`}>Опис (необов'язково)</Label>
         <Input
           id={`desc-${block.id}`}
           value={data.description || ''}
           onChange={(e) => onChange({ ...data, description: e.target.value })}
           placeholder="Короткий опис"
         />
       </div>
     </div>
   );
 }