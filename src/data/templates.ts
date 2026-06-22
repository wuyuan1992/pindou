import type { Template } from "../types.ts";
import { findClosestPaletteHex } from "./colors.ts";
import worksData from "./works.json";

interface WorkEntry {
  id: string;
  name: string;
  cols: number;
  rows: number;
  cells: (string | null)[];
}

const WORKS = worksData as WorkEntry[];

const compileCache = new Map<string, string>();

function resolvePaletteHex(reference: string): string {
  const cached = compileCache.get(reference);
  if (cached) return cached;
  const resolved = findClosestPaletteHex(reference);
  compileCache.set(reference, resolved);
  return resolved;
}

function compileWork(work: WorkEntry): Template {
  const cells = work.cells.map((cell) => (cell ? resolvePaletteHex(cell) : null));
  return {
    id: work.id,
    name: work.name,
    cols: work.cols,
    rows: work.rows,
    cells,
    builtin: true,
  };
}

export const BUILTIN_TEMPLATES: Template[] = WORKS.map(compileWork);
