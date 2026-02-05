 import { Button } from "@/components/ui/button";
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
 import { Plus, Type, Image, Link2, AlertCircle, Minus } from "lucide-react";
 import type { BlockType } from "@/types/material-blocks";
 import { BLOCK_LABELS, BLOCK_DESCRIPTIONS } from "@/types/material-blocks";
 
 const blockIcons: Record<BlockType, React.ElementType> = {
   text: Type,
   media: Image,
   materials: Link2,
   announcement: AlertCircle,
   divider: Minus,
 };
 
 interface AddBlockButtonProps {
   onAddBlock: (type: BlockType) => void;
   variant?: 'default' | 'inline';
 }
 
 export function AddBlockButton({ onAddBlock, variant = 'default' }: AddBlockButtonProps) {
   const blockTypes: BlockType[] = ['text', 'media', 'materials', 'announcement', 'divider'];
 
   if (variant === 'inline') {
     return (
       <div className="flex justify-center py-2">
         <DropdownMenu>
           <DropdownMenuTrigger asChild>
             <Button
               type="button"
               variant="ghost"
               size="sm"
               className="h-8 px-3 text-muted-foreground hover:text-foreground"
             >
               <Plus className="h-4 w-4 mr-1" />
               Додати блок
             </Button>
           </DropdownMenuTrigger>
           <DropdownMenuContent align="center" className="w-[220px]">
             {blockTypes.map((type) => {
               const Icon = blockIcons[type];
               return (
                 <DropdownMenuItem
                   key={type}
                   onClick={() => onAddBlock(type)}
                   className="flex items-start gap-3 py-2"
                 >
                   <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                   <div>
                     <p className="font-medium text-sm">{BLOCK_LABELS[type]}</p>
                     <p className="text-xs text-muted-foreground">{BLOCK_DESCRIPTIONS[type]}</p>
                   </div>
                 </DropdownMenuItem>
               );
             })}
           </DropdownMenuContent>
         </DropdownMenu>
       </div>
     );
   }
 
   return (
     <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
       <p className="text-muted-foreground mb-4">Матеріал поки що порожній</p>
       <div className="flex flex-wrap justify-center gap-2">
         {blockTypes.map((type) => {
           const Icon = blockIcons[type];
           return (
             <Button
               key={type}
               type="button"
               variant="outline"
               onClick={() => onAddBlock(type)}
               className="gap-2"
             >
               <Icon className="h-4 w-4" />
               {BLOCK_LABELS[type]}
             </Button>
           );
         })}
       </div>
     </div>
   );
 }