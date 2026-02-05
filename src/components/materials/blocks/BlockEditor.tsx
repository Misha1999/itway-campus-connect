 import { Card, CardContent, CardHeader } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
 import {
   GripVertical,
   ChevronUp,
   ChevronDown,
   Copy,
   Trash2,
   MoreHorizontal,
   Type,
   Image,
   Link2,
   AlertCircle,
   Minus,
 } from "lucide-react";
 import type {
   ContentBlock,
   BlockType,
   TextBlock,
   MediaBlock,
   MaterialsBlock,
   AnnouncementBlock,
   DividerBlock,
 } from "@/types/material-blocks";
 import { BLOCK_LABELS } from "@/types/material-blocks";
 import { TextBlockEditor } from "./TextBlockEditor";
 import { MediaBlockEditor } from "./MediaBlockEditor";
 import { MaterialsBlockEditor } from "./MaterialsBlockEditor";
 import { AnnouncementBlockEditor } from "./AnnouncementBlockEditor";
 import { DividerBlockEditor } from "./DividerBlockEditor";
 
 const blockIcons: Record<BlockType, React.ElementType> = {
   text: Type,
   media: Image,
   materials: Link2,
   announcement: AlertCircle,
   divider: Minus,
 };
 
 interface BlockEditorProps {
   block: ContentBlock;
   isFirst: boolean;
   isLast: boolean;
   onUpdate: (data: ContentBlock['data']) => void;
   onMoveUp: () => void;
   onMoveDown: () => void;
   onCopy: () => void;
   onDelete: () => void;
 }
 
 export function BlockEditor({
   block,
   isFirst,
   isLast,
   onUpdate,
   onMoveUp,
   onMoveDown,
   onCopy,
   onDelete,
 }: BlockEditorProps) {
   const Icon = blockIcons[block.type];
 
   const renderEditor = () => {
     switch (block.type) {
       case 'text':
         return (
           <TextBlockEditor
             block={block as TextBlock}
             onChange={onUpdate as (data: TextBlock['data']) => void}
           />
         );
       case 'media':
         return (
           <MediaBlockEditor
             block={block as MediaBlock}
             onChange={onUpdate as (data: MediaBlock['data']) => void}
           />
         );
       case 'materials':
         return (
           <MaterialsBlockEditor
             block={block as MaterialsBlock}
             onChange={onUpdate as (data: MaterialsBlock['data']) => void}
           />
         );
       case 'announcement':
         return (
           <AnnouncementBlockEditor
             block={block as AnnouncementBlock}
             onChange={onUpdate as (data: AnnouncementBlock['data']) => void}
           />
         );
       case 'divider':
         return (
           <DividerBlockEditor
             block={block as DividerBlock}
             onChange={onUpdate as (data: DividerBlock['data']) => void}
           />
         );
       default:
         return null;
     }
   };
 
   return (
     <Card className="group relative">
       <CardHeader className="flex flex-row items-center gap-2 py-3 px-4 border-b bg-muted/30">
         <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
         <Icon className="h-4 w-4 text-primary" />
         <span className="text-sm font-medium">{BLOCK_LABELS[block.type]}</span>
         <div className="flex-1" />
 
         <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
           <Button
             type="button"
             variant="ghost"
             size="icon"
             className="h-7 w-7"
             onClick={onMoveUp}
             disabled={isFirst}
           >
             <ChevronUp className="h-4 w-4" />
           </Button>
           <Button
             type="button"
             variant="ghost"
             size="icon"
             className="h-7 w-7"
             onClick={onMoveDown}
             disabled={isLast}
           >
             <ChevronDown className="h-4 w-4" />
           </Button>
         </div>
 
         <DropdownMenu>
           <DropdownMenuTrigger asChild>
             <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
               <MoreHorizontal className="h-4 w-4" />
             </Button>
           </DropdownMenuTrigger>
           <DropdownMenuContent align="end">
             <DropdownMenuItem onClick={onMoveUp} disabled={isFirst}>
               <ChevronUp className="h-4 w-4 mr-2" />
               Перемістити вгору
             </DropdownMenuItem>
             <DropdownMenuItem onClick={onMoveDown} disabled={isLast}>
               <ChevronDown className="h-4 w-4 mr-2" />
               Перемістити вниз
             </DropdownMenuItem>
             <DropdownMenuItem onClick={onCopy}>
               <Copy className="h-4 w-4 mr-2" />
               Копіювати
             </DropdownMenuItem>
             <DropdownMenuSeparator />
             <DropdownMenuItem onClick={onDelete} className="text-destructive">
               <Trash2 className="h-4 w-4 mr-2" />
               Видалити
             </DropdownMenuItem>
           </DropdownMenuContent>
         </DropdownMenu>
       </CardHeader>
       <CardContent className="p-4">
         {renderEditor()}
       </CardContent>
     </Card>
   );
 }