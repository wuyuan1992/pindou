/**
 * CPU port of pixijs/filters PixelateFilter.
 *
 * Source:  https://github.com/pixijs/filters/blob/master/src/pixelate/PixelateFilter.ts
 *          https://github.com/pixijs/filters/blob/master/src/pixelate/pixelate.frag
 * License: MIT (see https://github.com/pixijs/filters/blob/master/LICENSE)
 *
 * The original runs as a WebGL/WGSL shader: for each output texel it computes
 *   coord = floor(coord / uSize) * uSize
 * and samples the source texture at that coordinate. In plain English: every
 * output pixel takes the color of the **top-left corner** of the cell it falls
 * in. No averaging, no majority vote — this is what gives pixi pixelate its
 * characteristic sharp, blocky look.
 *
 * This port reproduces that behavior on a 2D canvas context. An optional
 * palette quantization step is appended so output can map to a fixed color
 * set (the original filter leaves colors untouched).
 */

export type RgbTuple = readonly [number, number, number];

export interface PixelateFilterOptions {
  image: HTMLCanvasElement | HTMLImageElement | ImageData;
  /**
   * Side length of each pixel cell, in source-image pixels.
   * An input of W×H produces an output of floor(W/cellSize) × floor(H/cellSize).
   */
  cellSize: number;
  /** Optional palette as hex strings. When provided, each sampled pixel is
   *  quantized to its nearest palette color (Euclidean RGB). */
  palette?: string[];
}

function hexToRgbTuple(hex: string): RgbTuple {
  const h = hex.replace("#", "");
  const bigint = parseInt(h, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

// redmean 加权 RGB 距离（https://www.compuphase.com/cmetric.htm）。
// 比纯欧式距离更贴近人眼感知，尤其在大调色板下能让相邻色相的边界
// 落到更自然的位置。
function colorDistanceSquared(
  c1: readonly number[],
  c2: readonly number[]
): number {
  const rmean = (c1[0] + c2[0]) / 2;
  const dr = c1[0] - c2[0];
  const dg = c1[1] - c2[1];
  const db = c1[2] - c2[2];
  return (
    ((512 + rmean) * dr * dr) / 256 +
    4 * dg * dg +
    ((767 - rmean) * db * db) / 256
  );
}

function findClosestPaletteColor(
  color: readonly number[],
  palette: RgbTuple[]
): RgbTuple {
  let closest = palette[0];
  let closestDist = colorDistanceSquared(color, closest);
  for (let i = 1; i < palette.length; i++) {
    const dist = colorDistanceSquared(color, palette[i]);
    if (dist < closestDist) {
      closestDist = dist;
      closest = palette[i];
    }
  }
  return closest;
}

function toImageData(
  src: HTMLCanvasElement | HTMLImageElement | ImageData
): { data: ImageData; width: number; height: number } {
  if (src instanceof ImageData) {
    return { data: src, width: src.width, height: src.height };
  }
  let w: number;
  let h: number;
  let drawSrc: CanvasImageSource;
  if (src instanceof HTMLCanvasElement) {
    w = src.width;
    h = src.height;
    drawSrc = src;
  } else {
    w = src.naturalWidth || src.width;
    h = src.naturalHeight || src.height;
    drawSrc = src;
  }
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("无法创建 Canvas 2D 上下文");
  ctx.drawImage(drawSrc, 0, 0);
  return { data: ctx.getImageData(0, 0, w, h), width: w, height: h };
}

/**
 * Pixelate using pixi's top-left-corner sampling rule.
 *
 * Output dimensions are floor(input.w / cellSize) × floor(input.h / cellSize).
 * Each output pixel `(cx, cy)` reads the source pixel at `(cx*cellSize, cy*cellSize)`.
 */
export function pixelateFilter(
  options: PixelateFilterOptions
): HTMLCanvasElement {
  const { image, cellSize, palette } = options;
  if (!image) throw new Error("image is required.");
  if (!cellSize || cellSize < 1) {
    throw new Error("cellSize must be a positive integer.");
  }

  const { data: srcImageData, width: srcW, height: srcH } = toImageData(image);
  const srcData = srcImageData.data;

  const outW = Math.floor(srcW / cellSize);
  const outH = Math.floor(srcH / cellSize);
  if (outW < 1 || outH < 1) {
    throw new Error(
      `cellSize ${cellSize} too large for ${srcW}×${srcH} input (output would be empty)`
    );
  }

  const paletteTuples = palette?.map(hexToRgbTuple);

  const outCanvas = document.createElement("canvas");
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) throw new Error("无法创建 Canvas 2D 上下文");
  const outImageData = outCtx.createImageData(outW, outH);
  const outData = outImageData.data;

  for (let cy = 0; cy < outH; cy++) {
    for (let cx = 0; cx < outW; cx++) {
      // Pixi's sampling rule: top-left corner of the cell.
      const srcX = cx * cellSize;
      const srcY = cy * cellSize;
      const srcIdx = (srcY * srcW + srcX) * 4;

      let r = srcData[srcIdx];
      let g = srcData[srcIdx + 1];
      let b = srcData[srcIdx + 2];
      const a = srcData[srcIdx + 3];

      if (paletteTuples && paletteTuples.length > 0) {
        const [pr, pg, pb] = findClosestPaletteColor(
          [r, g, b],
          paletteTuples
        );
        r = pr;
        g = pg;
        b = pb;
      }

      const outIdx = (cy * outW + cx) * 4;
      outData[outIdx] = r;
      outData[outIdx + 1] = g;
      outData[outIdx + 2] = b;
      outData[outIdx + 3] = a;
    }
  }

  outCtx.putImageData(outImageData, 0, 0);
  return outCanvas;
}

export { hexToRgbTuple, findClosestPaletteColor };
