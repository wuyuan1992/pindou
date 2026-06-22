import { create } from "zustand";

export type ItemType = "palette" | "board" | "tray";

export interface ItemTransform {
  position: [number, number, number];
  rotationY: number;
}

export const DEFAULT_TRANSFORMS: Record<ItemType, ItemTransform> = {
  palette: { position: [-6, 0, 3.5], rotationY: 0 },
  board: { position: [4, 0, 0], rotationY: 0 },
  tray: { position: [-6, 0, -3.5], rotationY: 0 },
};

interface LayoutState {
  transforms: Record<ItemType, ItemTransform>;
  draggingItem: ItemType | null;
  hoveringHandler: boolean;
  previewMode: boolean;
  setTransform: (key: ItemType, t: Partial<ItemTransform>) => void;
  resetItem: (key: ItemType) => void;
  setDraggingItem: (key: ItemType | null) => void;
  setHoveringHandler: (b: boolean) => void;
  setPreviewMode: (b: boolean) => void;
  togglePreview: () => void;
}

export const useLayoutStore = create<LayoutState>()((set) => ({
  transforms: {
    palette: { ...DEFAULT_TRANSFORMS.palette },
    board: { ...DEFAULT_TRANSFORMS.board },
    tray: { ...DEFAULT_TRANSFORMS.tray },
  },
  draggingItem: null,
  hoveringHandler: false,
  previewMode: false,
  setTransform: (key, t) =>
    set((s) => ({
      transforms: {
        ...s.transforms,
        [key]: { ...s.transforms[key], ...t },
      },
    })),
  resetItem: (key) =>
    set((s) => ({
      transforms: {
        ...s.transforms,
        [key]: { ...DEFAULT_TRANSFORMS[key] },
      },
    })),
  setDraggingItem: (key) => set({ draggingItem: key }),
  setHoveringHandler: (b) => set({ hoveringHandler: b }),
  setPreviewMode: (b) => set({ previewMode: b }),
  togglePreview: () => set((s) => ({ previewMode: !s.previewMode })),
}));
