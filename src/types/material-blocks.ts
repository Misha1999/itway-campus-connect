 // Block types for material editor (like HUMAN.ua)
 
 export type BlockType = 'text' | 'media' | 'materials' | 'announcement' | 'divider';
 
 export interface BaseBlock {
   id: string;
   type: BlockType;
   order: number;
 }
 
 export interface TextBlock extends BaseBlock {
   type: 'text';
   data: {
     title?: string;
     content: string;
     description?: string;
   };
 }
 
 export interface MediaBlock extends BaseBlock {
   type: 'media';
   data: {
     url: string;
     caption?: string;
     alt?: string;
   };
 }
 
 export interface MaterialsBlock extends BaseBlock {
   type: 'materials';
   data: {
     items: Array<{
       id: string;
       type: 'link' | 'file';
       title: string;
       url: string;
     }>;
   };
 }
 
 export interface AnnouncementBlock extends BaseBlock {
   type: 'announcement';
   data: {
     variant: 'info' | 'warning' | 'success' | 'error';
     title?: string;
     content: string;
   };
 }
 
 export interface DividerBlock extends BaseBlock {
   type: 'divider';
   data: {
     style: 'solid' | 'dashed' | 'dotted';
   };
 }
 
 export type ContentBlock = TextBlock | MediaBlock | MaterialsBlock | AnnouncementBlock | DividerBlock;
 
 export const BLOCK_LABELS: Record<BlockType, string> = {
   text: 'Текст',
   media: 'Медіа',
   materials: 'Матеріали',
   announcement: 'Оголошення',
   divider: 'Роздільник',
 };
 
 export const BLOCK_DESCRIPTIONS: Record<BlockType, string> = {
   text: 'Заголовок, текст та опис',
   media: 'Зображення та відео',
   materials: 'Посилання та файли',
   announcement: 'Важлива інформація',
   divider: 'Візуальний розділювач',
 };