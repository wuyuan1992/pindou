import { toPng } from "html-to-image";
import type { Cell } from "../types.ts";
import { getColor } from "../data/colors.ts";
import { useBeadStore } from "../store/useBeadStore.ts";
import { drawBead, drawPegHole } from "../components/canvasDraw.ts";

export async function exportBoardAsPng(
  node: HTMLElement,
  filename = "pindou-art"
): Promise<void> {
  // 优先走 canvas 原生导出：2D 板已经在内部用 canvas 渲染，
  // 我们用更大的 cell size 直接重画到离屏 canvas，避免 html-to-image 二次采样导致模糊。
  try {
    const dataUrl = exportBoardNative();
    if (dataUrl) {
      downloadDataUrl(dataUrl, filename);
      return;
    }
  } catch (err) {
    console.warn("canvas 原生导出失败，回退到 html-to-image", err);
  }

  const dataUrl = await toPng(node, {
    pixelRatio: 3,
    backgroundColor: "#f4ecd8",
    cacheBust: true,
    filter: (el) => {
      if (!(el instanceof HTMLElement)) return true;
      return el.dataset.ui === undefined;
    },
  });
  downloadDataUrl(dataUrl, filename);
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.download = `${filename}-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
}

// 高清重渲：用更大的 cell size 直接画到一个离屏 canvas。
const EXPORT_CELL = 64;
const EXPORT_PADDING_RATIO = 0.4;

function exportBoardNative(): string | null {
  const { grid, cols, rows } = useBeadStore.getState();
  if (!grid.length) return null;
  const cellSize = EXPORT_CELL;
  const pad = cellSize * EXPORT_PADDING_RATIO;
  const canvas = document.createElement("canvas");
  canvas.width = cols * cellSize + pad * 2;
  canvas.height = rows * cellSize + pad * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // 背景（与 board 一致）
  ctx.fillStyle = "#f4ecd8";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bg.addColorStop(0, "#f4ecd8");
  bg.addColorStop(1, "#ebdfbf");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const colorId = grid[idx];
      const color = colorId ? getColor(colorId) : null;
      const cx = pad + c * cellSize;
      const cy = pad + r * cellSize;
      if (color) {
        drawBead(ctx, cx, cy, cellSize, color);
      } else {
        drawPegHole(ctx, cx, cy, cellSize);
      }
    }
  }
  return canvas.toDataURL("image/png");
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
