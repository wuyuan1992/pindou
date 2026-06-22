import { useEffect, useRef } from "react";
import { useBeadStore } from "../store/useBeadStore.ts";

interface DrawingOptions {
  onPainted?: (colorId: string) => void;
}

export function useDrawing(options: DrawingOptions = {}) {
  const tool = useBeadStore((s) => s.tool);
  const beginStroke = useBeadStore((s) => s.beginStroke);
  const endStroke = useBeadStore((s) => s.endStroke);
  const paint = useBeadStore((s) => s.paint);
  const pickColor = useBeadStore((s) => s.pickColor);
  const onPaintedRef = useRef(options.onPainted);
  onPaintedRef.current = options.onPainted;

  const isDrawing = useRef(false);
  const lastIdx = useRef<number>(-1);

  useEffect(() => {
    const stop = () => {
      if (isDrawing.current) {
        endStroke();
        isDrawing.current = false;
        lastIdx.current = -1;
      }
    };
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchend", stop);
    window.addEventListener("touchcancel", stop);
    return () => {
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchend", stop);
      window.removeEventListener("touchcancel", stop);
    };
  }, [endStroke]);

  const handle = (idx: number) => {
    if (idx === lastIdx.current) return;
    lastIdx.current = idx;
    if (tool === "eyedropper") {
      pickColor(idx);
      return;
    }
    const painted = paint(idx);
    if (painted && onPaintedRef.current) {
      onPaintedRef.current(painted);
    }
  };

  const onCellDown = (idx: number) => {
    isDrawing.current = true;
    if (tool !== "eyedropper") beginStroke();
    handle(idx);
  };

  const onCellEnter = (idx: number) => {
    if (!isDrawing.current) return;
    handle(idx);
  };

  // 旧 DOM 版：依赖 elementFromPoint + data-cell-idx
  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDrawing.current) return;
    const t = e.touches[0];
    if (!t) return;
    const el = document.elementFromPoint(t.clientX, t.clientY);
    const cell = el?.closest("[data-cell-idx]") as HTMLElement | null;
    if (cell) {
      const idx = Number(cell.dataset.cellIdx);
      if (!Number.isNaN(idx)) handle(idx);
    }
  };

  // 新 canvas 版：上层已经做好 hit-test，直接传入 idx
  const onTouchHit = (idx: number) => {
    if (!isDrawing.current) return;
    handle(idx);
  };

  return { onCellDown, onCellEnter, onTouchMove, onTouchHit };
}
