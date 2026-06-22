import { create } from "zustand";
import type { Cell, Template, Tool } from "../types.ts";
import { DEFAULT_COLOR_ID } from "../data/colors.ts";
import { createEmptyGrid, gridChanged, placeTemplateCentered } from "../lib/gridUtils.ts";

const BOARD_COLS = 40;
const BOARD_ROWS = 40;
const MAX_HISTORY = 50;
const INITIAL_COLOR_ID = DEFAULT_COLOR_ID;

interface BeadState {
  cols: number;
  rows: number;
  grid: Cell[];
  currentColorId: string;
  tool: Tool;
  history: Cell[][];
  strokeSnapshot: Cell[] | null;

  beginStroke: () => void;
  endStroke: () => void;
  paint: (idx: number) => string | null;
  pickColor: (idx: number) => void;
  setColor: (id: string) => void;
  setTool: (tool: Tool) => void;
  loadTemplate: (tpl: Template) => void;
  clear: () => void;
  undo: () => void;

  placeBead: (idx: number, colorId: string) => boolean;
  removeBead: (idx: number) => boolean;
}

function pushHistory(history: Cell[][], snapshot: Cell[]): Cell[][] {
  const next = [...history, snapshot];
  if (next.length > MAX_HISTORY) next.shift();
  return next;
}

export const useBeadStore = create<BeadState>()((set, get) => ({
  cols: BOARD_COLS,
  rows: BOARD_ROWS,
  grid: createEmptyGrid(BOARD_COLS, BOARD_ROWS),
  currentColorId: INITIAL_COLOR_ID,
  tool: "brush",
  history: [],
  strokeSnapshot: null,

  beginStroke: () => {
    const { strokeSnapshot, grid } = get();
    if (strokeSnapshot) return;
    set({ strokeSnapshot: grid.slice() });
  },

  endStroke: () => {
    const { strokeSnapshot, grid, history } = get();
    if (!strokeSnapshot) return;
    if (gridChanged(strokeSnapshot, grid)) {
      set({ history: pushHistory(history, strokeSnapshot), strokeSnapshot: null });
    } else {
      set({ strokeSnapshot: null });
    }
  },

  paint: (idx) => {
    const { grid, tool, currentColorId, cols, rows } = get();
    if (idx < 0 || idx >= cols * rows) return null;
    if (tool === "eyedropper") return null;
    const current = grid[idx];
    const next: Cell = tool === "eraser" ? null : currentColorId;
    if (current === next) return null;
    const newGrid = grid.slice();
    newGrid[idx] = next;
    set({ grid: newGrid });
    return next;
  },

  pickColor: (idx) => {
    const { grid } = get();
    const colorId = grid[idx];
    if (colorId) set({ currentColorId: colorId, tool: "brush" });
  },

  setColor: (id) => set({ currentColorId: id, tool: "brush" }),

  setTool: (tool) => set({ tool }),

  loadTemplate: (tpl) => {
    const { cols, rows, grid, history } = get();
    const newGrid = placeTemplateCentered(tpl, cols, rows);
    if (!gridChanged(grid, newGrid)) return;
    set({ grid: newGrid, history: pushHistory(history, grid.slice()) });
  },

  clear: () => {
    const { cols, rows, grid, history } = get();
    const isEmpty = grid.every((c) => c === null);
    if (isEmpty) return;
    set({
      grid: createEmptyGrid(cols, rows),
      history: pushHistory(history, grid.slice()),
    });
  },

  undo: () => {
    const { history, strokeSnapshot } = get();
    if (strokeSnapshot) return;
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    set({ grid: prev.slice(), history: history.slice(0, -1) });
  },

  placeBead: (idx, colorId) => {
    const { grid, cols, rows, history } = get();
    if (idx < 0 || idx >= cols * rows) return false;
    if (grid[idx] === colorId) return false;
    const newGrid = grid.slice();
    newGrid[idx] = colorId;
    set({ grid: newGrid, history: pushHistory(history, grid.slice()) });
    return true;
  },

  removeBead: (idx) => {
    const { grid, cols, rows, history } = get();
    if (idx < 0 || idx >= cols * rows) return false;
    if (grid[idx] === null) return false;
    const newGrid = grid.slice();
    newGrid[idx] = null;
    set({ grid: newGrid, history: pushHistory(history, grid.slice()) });
    return true;
  },
}));
