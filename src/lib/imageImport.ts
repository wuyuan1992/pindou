import type { Template } from "../types.ts";
import { PALETTE_HEX } from "../data/colors.ts";
import { deterministicUuid } from "./uuid.ts";
import { pixelateFilter } from "./vendor/pixelateFilter.ts";

interface Rgb {
  id: string;
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

const COLOR_RGBS: Rgb[] = PALETTE_HEX.map((hex) => {
  const [r, g, b] = hexToRgb(hex);
  return { id: hex, r, g, b };
});

// pixelateFilter 的 palette 量化保证输出 RGB 严格等于 COLORS.base 某个 hex，
// 所以这里用精确反查表 O(1) 命中，findClosestColorId 只是防御性兜底。
const RGB_TO_ID: Map<string, string> = new Map();
for (const c of COLOR_RGBS) {
  RGB_TO_ID.set(`${c.r},${c.g},${c.b}`, c.id);
}

function redmeanDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const rmean = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return (
    ((512 + rmean) * dr * dr) / 256 +
    4 * dg * dg +
    ((767 - rmean) * db * db) / 256
  );
}

function findClosestColorId(r: number, g: number, b: number): string {
  let bestId = COLOR_RGBS[0].id;
  let bestDist = Infinity;
  for (const c of COLOR_RGBS) {
    const d = redmeanDistance(r, g, b, c.r, c.g, c.b);
    if (d < bestDist) {
      bestDist = d;
      bestId = c.id;
    }
  }
  return bestId;
}

function rgbToPaletteId(r: number, g: number, b: number): string {
  const direct = RGB_TO_ID.get(`${r},${g},${b}`);
  if (direct) return direct;
  return findClosestColorId(r, g, b);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片加载失败，请确认文件格式"));
    img.src = src;
  });
}

export interface ImageImportOptions {
  // alpha 低于此值的像素视为空格
  alphaThreshold?: number;
  // 从四角开始 flood-fill：把和角落连通的近白区域当背景抠掉，
  // 被前景包围的内部白色保留。适合白底图标 / 照片。
  ignoreNearWhite?: boolean;
  // 每个 cell 覆盖多少输入像素（pixi 左上角采样粒度）。越大越"块状"，
  // 越小越接近原图。默认 8。
  cellSize?: number;
}

interface NormalizedOptions {
  alphaThreshold: number;
  ignoreNearWhite: boolean;
  cellSize: number;
}

function normalizeOptions(opts: ImageImportOptions): NormalizedOptions {
  return {
    alphaThreshold: opts.alphaThreshold ?? 128,
    ignoreNearWhite: opts.ignoreNearWhite ?? false,
    cellSize: Math.max(1, Math.floor(opts.cellSize ?? 8)),
  };
}

// contain 缩放参数：把原图居中放进 targetW×targetH 的画布里，空余保持透明。
function containPlacement(
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number
): { x: number; y: number; w: number; h: number } {
  const scale = Math.min(targetW / srcW, targetH / srcH);
  const w = srcW * scale;
  const h = srcH * scale;
  return { x: (targetW - w) / 2, y: (targetH - h) / 2, w, h };
}

// 把原图 contain 居中绘制到目标尺寸 canvas，并返回每个输出 cell 对应
// 左上角像素的原始 alpha（pixi 的采样规则是 floor(coord/cellSize)*cellSize，
// 所以 cell (cx,cy) 的代表 alpha 就是 (cx*C, cy*C) 处的输入像素 alpha）。
function drawContainCanvas(
  img: HTMLImageElement,
  targetW: number,
  targetH: number
): { canvas: HTMLCanvasElement; alpha: Uint8ClampedArray } {
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("无法创建 Canvas 2D 上下文");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const place = containPlacement(img.width, img.height, targetW, targetH);
  ctx.drawImage(img, place.x, place.y, place.w, place.h);

  const data = ctx.getImageData(0, 0, targetW, targetH).data;
  const alpha = new Uint8ClampedArray(targetW * targetH);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    alpha[j] = data[i + 3];
  }
  return { canvas, alpha };
}

export async function imageFileToTemplate(
  file: File,
  cols: number,
  rows: number,
  opts: ImageImportOptions = {}
): Promise<Template> {
  const norm = normalizeOptions(opts);

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    if (!img.width || !img.height) {
      throw new Error("图片尺寸无效");
    }

    const paletteHex = PALETTE_HEX;

    // 把原图 contain 到 cols*C × rows*C 的大 canvas，再用 cellSize=C 做
    // pixi 左上角采样。输入必须是 C 的整数倍，否则 floor(W/C) 会丢一行。
    const C = norm.cellSize;
    const drawn = drawContainCanvas(img, cols * C, rows * C);

    const outCanvas = pixelateFilter({
      image: drawn.canvas,
      cellSize: C,
      palette: paletteHex,
    });

    const outCtx = outCanvas.getContext("2d");
    if (!outCtx) throw new Error("无法读取输出 Canvas");
    const out = outCtx.getImageData(0, 0, cols, rows);

    // 用每个 cell 左上角的原始 alpha 覆盖输出 alpha —— pixelateFilter 会
    // 保留采样 alpha，但在调色板量化后个别边缘像素可能漂移，强制覆盖
    // 保证透明边带被稳定识别为空格。
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const srcAlpha = drawn.alpha[cy * cols * C + cx * C];
        const outIdx = (cy * cols + cx) * 4;
        out.data[outIdx + 3] = srcAlpha;
      }
    }

    const cells: (string | null)[] = new Array(cols * rows).fill(null);
    const isNearWhite = new Uint8Array(cols * rows);
    for (let i = 0; i < cells.length; i++) {
      const r = out.data[i * 4];
      const g = out.data[i * 4 + 1];
      const b = out.data[i * 4 + 2];
      const a = out.data[i * 4 + 3];

      if (a < norm.alphaThreshold) {
        cells[i] = null;
        continue;
      }
      cells[i] = rgbToPaletteId(r, g, b);
      if (r >= 238 && g >= 238 && b >= 238) {
        isNearWhite[i] = 1;
      }
    }

    // 近白 flood-fill：从 4 个角落出发，只把和角落连通的近白区域当背景抠掉，
    // 内部白色（比如眼睛高光、白色花瓣）保留。
    if (norm.ignoreNearWhite) {
      const visited = new Uint8Array(cols * rows);
      const queue: number[] = [];
      const enqueue = (x: number, y: number) => {
        const idx = y * cols + x;
        if (isNearWhite[idx] && !visited[idx]) {
          visited[idx] = 1;
          queue.push(idx);
        }
      };
      // 从四角开始。如果某角是近白，BFS 会沿边缘和内部白区扩散。
      enqueue(0, 0);
      enqueue(cols - 1, 0);
      enqueue(0, rows - 1);
      enqueue(cols - 1, rows - 1);
      for (let head = 0; head < queue.length; head++) {
        const idx = queue[head];
        const cx = idx % cols;
        const cy = Math.floor(idx / cols);
        if (cx > 0) {
          const n = idx - 1;
          if (isNearWhite[n] && !visited[n]) {
            visited[n] = 1;
            queue.push(n);
          }
        }
        if (cx < cols - 1) {
          const n = idx + 1;
          if (isNearWhite[n] && !visited[n]) {
            visited[n] = 1;
            queue.push(n);
          }
        }
        if (cy > 0) {
          const n = idx - cols;
          if (isNearWhite[n] && !visited[n]) {
            visited[n] = 1;
            queue.push(n);
          }
        }
        if (cy < rows - 1) {
          const n = idx + cols;
          if (isNearWhite[n] && !visited[n]) {
            visited[n] = 1;
            queue.push(n);
          }
        }
      }
      for (let i = 0; i < cells.length; i++) {
        if (visited[i]) cells[i] = null;
      }
    }

    const baseName = file.name.replace(/\.[^.]+$/, "");

    return {
      id: deterministicUuid("template-img", `${file.name}-${cols}x${rows}`),
      name: baseName || "导入图片",
      cols,
      rows,
      cells,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
