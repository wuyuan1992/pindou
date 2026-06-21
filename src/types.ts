export type Tool = "brush" | "eraser" | "eyedropper";

export interface BeadColor {
  id: string;
  slug: string;
  name: string;
  base: string;
  highlight: string;
  shadow: string;
  hue: number;
}

export interface Template {
  id: string;
  name: string;
  cols: number;
  rows: number;
  cells: (string | null)[];
  builtin?: boolean;
  createdAt?: number;
}

export type Cell = string | null;
