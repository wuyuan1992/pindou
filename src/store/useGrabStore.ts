import { create } from "zustand";

export type DragPos = [number, number, number] | null;

interface GrabState {
  dragPos: DragPos;
  hoveredIdx: number | null;
  carriedColorId: string | null;

  setDragPos: (pos: DragPos) => void;
  setHoveredIdx: (idx: number | null) => void;
  setCarriedColorId: (colorId: string | null) => void;
}

export const useGrabStore = create<GrabState>()((set) => ({
  dragPos: null,
  hoveredIdx: null,
  carriedColorId: null,

  setDragPos: (pos) => set({ dragPos: pos }),
  setHoveredIdx: (idx) => set({ hoveredIdx: idx }),
  setCarriedColorId: (colorId) => set({ carriedColorId: colorId }),
}));
