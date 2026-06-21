import { create } from "zustand";

export const STACK_SIZE = 10;

interface StackState {
  stack: string[];
  push: (colorId: string) => boolean;
  pop: () => string | null;
  clear: () => void;
}

export const useStackStore = create<StackState>()((set, get) => ({
  stack: [],
  push: (colorId) => {
    const { stack } = get();
    if (stack.length >= STACK_SIZE) return false;
    set({ stack: [...stack, colorId] });
    return true;
  },
  pop: () => {
    const { stack } = get();
    if (stack.length === 0) return null;
    const top = stack[stack.length - 1];
    set({ stack: stack.slice(0, -1) });
    return top;
  },
  clear: () => set({ stack: [] }),
}));
