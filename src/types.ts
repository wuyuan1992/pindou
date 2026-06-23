/**
 * v3.1 交互状态机。手势驱动,无离散工具态。
 * - idle: 静止
 * - placing: pointerdown 已放第一颗,未触发 move
 * - painting: placing 升级,正在拖动连续放豆
 * - erasing: 擦除中(右键/Shift/Eraser toggle)
 * - long_pressing: 移动端长按 >200ms 预备取色动画
 */
export type InteractionMode =
  | "idle"
  | "placing"
  | "painting"
  | "erasing"
  | "long_pressing";

export type PointerType = "mouse" | "touch" | "pen";

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
