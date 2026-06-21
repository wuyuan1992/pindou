import type { Cell, Template } from "../types.ts";

export function createEmptyGrid(cols: number, rows: number): Cell[] {
  return new Array(cols * rows).fill(null);
}

export function cloneGrid(grid: Cell[]): Cell[] {
  return grid.slice();
}

export function idxToXY(idx: number, cols: number): [number, number] {
  return [idx % cols, Math.floor(idx / cols)];
}

export function xyToIdx(x: number, y: number, cols: number): number {
  return y * cols + x;
}

export function placeTemplateCentered(
  tpl: Template,
  targetCols: number,
  targetRows: number
): Cell[] {
  const cells = createEmptyGrid(targetCols, targetRows);
  const offsetX = Math.floor((targetCols - tpl.cols) / 2);
  const offsetY = Math.floor((targetRows - tpl.rows) / 2);
  for (let y = 0; y < tpl.rows; y++) {
    for (let x = 0; x < tpl.cols; x++) {
      const colorId = tpl.cells[y * tpl.cols + x];
      if (!colorId) continue;
      const tx = x + offsetX;
      const ty = y + offsetY;
      if (tx < 0 || tx >= targetCols || ty < 0 || ty >= targetRows) continue;
      cells[ty * targetCols + tx] = colorId;
    }
  }
  return cells;
}

export function gridChanged(a: Cell[], b: Cell[]): boolean {
  if (a.length !== b.length) return true;
  return a.some((c, i) => c !== b[i]);
}
