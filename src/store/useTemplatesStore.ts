import { create } from "zustand";
import type { Cell, Template } from "../types.ts";
import { BUILTIN_TEMPLATES } from "../data/templates.ts";
import { randomUuid } from "../lib/uuid.ts";

const STORAGE_KEY = "pindou:custom-templates:v1";

interface TemplatesState {
  builtin: Template[];
  custom: Template[];
  saveCustom: (name: string, cells: Cell[], cols: number, rows: number) => Template;
  removeCustom: (id: string) => void;
  renameCustom: (id: string, name: string) => void;
}

function isTemplate(x: unknown): x is Template {
  if (!x || typeof x !== "object") return false;
  const t = x as Partial<Template>;
  return (
    typeof t.id === "string" &&
    typeof t.name === "string" &&
    typeof t.cols === "number" &&
    typeof t.rows === "number" &&
    Array.isArray(t.cells)
  );
}

function readFromStorage(): Template[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isTemplate);
  } catch {
    return [];
  }
}

function writeToStorage(templates: Template[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (err) {
    console.error("无法保存模板到 localStorage", err);
  }
}

const INITIAL_CUSTOM = readFromStorage();

export const useTemplatesStore = create<TemplatesState>()((set, get) => ({
  builtin: BUILTIN_TEMPLATES,
  custom: INITIAL_CUSTOM,
  saveCustom: (name, cells, cols, rows) => {
    const trimmed = name.trim();
    const fallback = `我的作品 ${get().custom.length + 1}`;
    const tpl: Template = {
      id: randomUuid(),
      name: trimmed || fallback,
      cols,
      rows,
      cells: cells.slice(),
      builtin: false,
      createdAt: Date.now(),
    };
    const next = [tpl, ...get().custom];
    writeToStorage(next);
    set({ custom: next });
    return tpl;
  },
  removeCustom: (id) => {
    const next = get().custom.filter((t) => t.id !== id);
    writeToStorage(next);
    set({ custom: next });
  },
  renameCustom: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const next = get().custom.map((t) =>
      t.id === id ? { ...t, name: trimmed } : t
    );
    writeToStorage(next);
    set({ custom: next });
  },
}));
