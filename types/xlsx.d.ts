declare module 'xlsx' {
  export interface CellStyle {
    fill?: {
      fgColor?: { rgb: string };
      bgColor?: { rgb: string };
    };
    font?: {
      color?: { rgb: string };
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
    };
    alignment?: {
      horizontal?: 'left' | 'center' | 'right';
      vertical?: 'top' | 'center' | 'bottom';
    };
    border?: {
      top?: { style: string; color: { rgb: string } };
      bottom?: { style: string; color: { rgb: string } };
      left?: { style: string; color: { rgb: string } };
      right?: { style: string; color: { rgb: string } };
    };
  }

  export interface Cell {
    v: any;
    t: string;
    s?: CellStyle;
  }

  export interface WorkSheet {
    [key: string]: Cell | any;
    '!ref'?: string;
    '!cols'?: Array<{ wch: number }>;
  }

  export interface WorkBook {
    SheetNames: string[];
    Sheets: { [key: string]: WorkSheet };
  }

  export const utils: {
    book_new(): WorkBook;
    json_to_sheet(data: any[]): WorkSheet;
    book_append_sheet(workbook: WorkBook, worksheet: WorkSheet, name: string): void;
    decode_range(range: string): { s: { r: number; c: number }; e: { r: number; c: number } };
    encode_cell(cell: { r: number; c: number }): string;
  };

  export function writeFile(workbook: WorkBook, filename: string): void;
} 