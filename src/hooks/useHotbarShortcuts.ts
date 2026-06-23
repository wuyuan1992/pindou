import { useEffect } from "react";
import { useBeadStore } from "../store/useBeadStore.ts";

const THROTTLE_KEYS = new Set(["1", "2", "3", "4", "5", "6", "7", "8"]);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function useHotbarShortcuts() {
  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!THROTTLE_KEYS.has(e.key)) return;
      if (isEditableTarget(e.target)) return;

      const idx = Number(e.key) - 1;
      const { recentColorIds, setColor } = useBeadStore.getState();
      const colorId = recentColorIds[idx];
      if (!colorId) return;
      setColor(colorId);
    };

    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, []);
}
