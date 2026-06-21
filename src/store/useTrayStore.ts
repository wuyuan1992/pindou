import { create } from "zustand";
import { randomUuid } from "../lib/uuid.ts";

export interface TrayBead {
  id: string;
  colorId: string;
}

interface TrayState {
  beads: TrayBead[];
  add: (colorId: string) => string;
  removeById: (id: string) => string | null;
  clear: () => void;
}

export const useTrayStore = create<TrayState>()((set, get) => ({
  beads: [],
  add: (colorId) => {
    const id = randomUuid();
    set({ beads: [...get().beads, { id, colorId }] });
    return id;
  },
  removeById: (id) => {
    const { beads } = get();
    const target = beads.find((b) => b.id === id);
    if (!target) return null;
    set({ beads: beads.filter((b) => b.id !== id) });
    return target.colorId;
  },
  clear: () => set({ beads: [] }),
}));
