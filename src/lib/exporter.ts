import { toPng } from "html-to-image";
import type { Cell } from "../types.ts";
import { getColor } from "../data/colors.ts";

export async function exportBoardAsPng(
  node: HTMLElement,
  filename = "pindou-art"
): Promise<void> {
  const dataUrl = await toPng(node, {
    pixelRatio: 3,
    backgroundColor: "#f4ecd8",
    cacheBust: true,
    filter: (el) => {
      if (!(el instanceof HTMLElement)) return true;
      return el.dataset.ui === undefined;
    },
  });
  const link = document.createElement("a");
  link.download = `${filename}-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
}

// 把拼豆数据渲染成平面 PNG：每个豆填满所在 cell，空格透明
export function gridToCanvas(
  grid: Cell[],
  cols: number,
  rows: number,
  cellSize = 32
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = cols * cellSize;
  canvas.height = rows * cellSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建 Canvas 上下文");
  ctx.imageSmoothingEnabled = false;

  for (let i = 0; i < grid.length; i++) {
    const colorId = grid[i];
    if (!colorId) continue;
    const color = getColor(colorId);
    const px = (i % cols) * cellSize;
    const py = Math.floor(i / cols) * cellSize;
    ctx.fillStyle = color.base;
    ctx.fillRect(px, py, cellSize, cellSize);
  }

  return canvas;
}

export function exportGridAsPng(
  grid: Cell[],
  cols: number,
  rows: number,
  filename = "pindou-flat",
  cellSize = 32
): void {
  const canvas = gridToCanvas(grid, cols, rows, cellSize);
  const link = document.createElement("a");
  link.download = `${filename}-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
