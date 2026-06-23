import { create } from "zustand";
import type { Cell, InteractionMode, PointerType, Template } from "../types.ts";
import { DEFAULT_COLOR_ID } from "../data/colors.ts";
import { createEmptyGrid, gridChanged, placeTemplateCentered } from "../lib/gridUtils.ts";

const BOARD_COLS = 40;
const BOARD_ROWS = 40;
const MAX_HISTORY = 50;
const MAX_RECENT_COLORS = 8;
const INITIAL_COLOR_ID = DEFAULT_COLOR_ID;

interface BeadState {
  cols: number;
  rows: number;
  grid: Cell[];
  currentColorId: string;
  recentColorIds: string[];

  history: Cell[][];
  redoStack: Cell[][];
  strokeSnapshot: Cell[] | null;
  lastPaintedIdx: number | null;

  mode: InteractionMode;
  eraserToggle: boolean;
  pointerType: PointerType;

  beginStroke: () => void;
  endStroke: () => void;
  paintAt: (idx: number) => void;
  eraseAt: (idx: number) => void;
  // 批量涂/擦一串 idx，避免拖动时多次 setState 触发同步重渲染。
  // erase=true 走擦除语义，false 走 currentColorId 涂色。
  paintBatch: (idxs: number[], erase: boolean) => void;
  pickColor: (idx: number) => void;
  setColor: (id: string) => void;
  setMode: (m: InteractionMode) => void;
  setEraserToggle: (v: boolean) => void;
  setPointerType: (p: PointerType) => void;
  loadTemplate: (tpl: Template) => void;
  clear: () => void;
  undo: () => void;
  redo: () => void;

  placeBead: (idx: number, colorId: string) => boolean;
  removeBead: (idx: number) => boolean;
}

function pushHistory(history: Cell[][], snapshot: Cell[]): Cell[][] {
  const next = [...history, snapshot];
  if (next.length > MAX_HISTORY) next.shift();
  return next;
}

function withRecent(colorId: string, recent: string[]): string[] {
  if (recent.includes(colorId)) return recent;
  return [colorId, ...recent].slice(0, MAX_RECENT_COLORS);
}

export const useBeadStore = create<BeadState>()((set, get) => ({
  cols: BOARD_COLS,
  rows: BOARD_ROWS,
  grid: createEmptyGrid(BOARD_COLS, BOARD_ROWS),
  currentColorId: INITIAL_COLOR_ID,
  recentColorIds: [INITIAL_COLOR_ID],

  history: [],
  redoStack: [],
  strokeSnapshot: null,
  lastPaintedIdx: null,

  mode: "idle",
  eraserToggle: false,
  pointerType: "mouse",

  beginStroke: () => {
    const { strokeSnapshot, grid } = get();
    if (strokeSnapshot) return;
    set({ strokeSnapshot: grid.slice() });
  },

  endStroke: () => {
    const { strokeSnapshot, grid, history } = get();
    if (!strokeSnapshot) return;
    if (gridChanged(strokeSnapshot, grid)) {
      set({ history: pushHistory(history, strokeSnapshot), strokeSnapshot: null, redoStack: [], lastPaintedIdx: null });
    } else {
      set({ strokeSnapshot: null, lastPaintedIdx: null });
    }
  },

  paintAt: (idx) => {
    const { grid, currentColorId, recentColorIds, cols, rows, lastPaintedIdx } = get();
    if (idx < 0 || idx >= cols * rows) return;
    if (lastPaintedIdx === idx) return;
    if (grid[idx] === currentColorId) {
      set({ lastPaintedIdx: idx });
      return;
    }
    const newGrid = grid.slice();
    newGrid[idx] = currentColorId;
    set({
      grid: newGrid,
      lastPaintedIdx: idx,
      recentColorIds: withRecent(currentColorId, recentColorIds),
    });
  },

  eraseAt: (idx) => {
    const { grid, cols, rows, lastPaintedIdx } = get();
    if (idx < 0 || idx >= cols * rows) return;
    if (lastPaintedIdx === idx) return;
    if (grid[idx] === null) {
      set({ lastPaintedIdx: idx });
      return;
    }
    const newGrid = grid.slice();
    newGrid[idx] = null;
    set({ grid: newGrid, lastPaintedIdx: idx });
  },

  paintBatch: (idxs, erase) => {
    const { grid, currentColorId, recentColorIds, cols, rows } = get();
    const total = cols * rows;
    if (total <= 0 || idxs.length === 0) return;
    const newGrid = grid.slice();
    let lastChanged = -1;
    let anyChanged = false;
    let firstIdx = -1;
    for (let i = 0; i < idxs.length; i++) {
      const idx = idxs[i];
      if (idx < 0 || idx >= total) continue;
      if (firstIdx < 0) firstIdx = idx;
      if (erase) {
        if (newGrid[idx] !== null) {
          newGrid[idx] = null;
          lastChanged = idx;
          anyChanged = true;
        }
      } else if (newGrid[idx] !== currentColorId) {
        newGrid[idx] = currentColorId;
        lastChanged = idx;
        anyChanged = true;
      }
    }
    if (!anyChanged) {
      // 即便没改变 grid，也要更新 lastPaintedIdx 以保持拖动连续性（与 paintAt 行为一致）
      if (firstIdx >= 0) set({ lastPaintedIdx: firstIdx });
      return;
    }
    const payload: Partial<BeadState> = {
      grid: newGrid,
      lastPaintedIdx: lastChanged >= 0 ? lastChanged : firstIdx,
    };
    if (!erase) {
      payload.recentColorIds = withRecent(currentColorId, recentColorIds);
    }
    const t0 = performance.now();
    set(payload);
    const t1 = performance.now();
    if (t1 - t0 > 4) {
      console.log(`[pd] store.set ${idxs.length} cells took ${(t1 - t0).toFixed(1)}ms`);
    }
  },

  pickColor: (idx) => {
    const { grid, currentColorId, recentColorIds } = get();
    const colorId = grid[idx];
    if (!colorId || colorId === currentColorId) return;
    set({
      currentColorId: colorId,
      recentColorIds: withRecent(colorId, recentColorIds),
      mode: "idle",
    });
  },

  setColor: (id) => {
    const { currentColorId, recentColorIds } = get();
    if (id === currentColorId) return;
    set({
      currentColorId: id,
      recentColorIds: withRecent(id, recentColorIds),
    });
  },

  setMode: (m) => set({ mode: m }),
  setEraserToggle: (v) => set({ eraserToggle: v }),
  setPointerType: (p) => set({ pointerType: p }),

  loadTemplate: (tpl) => {
    const { cols, rows, grid, history } = get();
    const newGrid = placeTemplateCentered(tpl, cols, rows);
    if (!gridChanged(grid, newGrid)) return;
    set({ grid: newGrid, history: pushHistory(history, grid.slice()), redoStack: [] });
  },

  clear: () => {
    const { cols, rows, grid, history } = get();
    const isEmpty = grid.every((c) => c === null);
    if (isEmpty) return;
    set({
      grid: createEmptyGrid(cols, rows),
      history: pushHistory(history, grid.slice()),
      redoStack: [],
    });
  },

  undo: () => {
    const { history, redoStack, strokeSnapshot, grid } = get();
    if (strokeSnapshot) return;
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    set({
      grid: prev.slice(),
      history: history.slice(0, -1),
      redoStack: [...redoStack, grid.slice()],
    });
  },

  redo: () => {
    const { history, redoStack, strokeSnapshot, grid } = get();
    if (strokeSnapshot) return;
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    set({
      grid: next.slice(),
      redoStack: redoStack.slice(0, -1),
      history: pushHistory(history, grid.slice()),
    });
  },

  placeBead: (idx, colorId) => {
    const { grid, cols, rows, history } = get();
    if (idx < 0 || idx >= cols * rows) return false;
    if (grid[idx] === colorId) return false;
    const newGrid = grid.slice();
    newGrid[idx] = colorId;
    set({ grid: newGrid, history: pushHistory(history, grid.slice()), redoStack: [] });
    return true;
  },

  removeBead: (idx) => {
    const { grid, cols, rows, history } = get();
    if (idx < 0 || idx >= cols * rows) return false;
    if (grid[idx] === null) return false;
    const newGrid = grid.slice();
    newGrid[idx] = null;
    set({ grid: newGrid, history: pushHistory(history, grid.slice()), redoStack: [] });
    return true;
  },
}));
