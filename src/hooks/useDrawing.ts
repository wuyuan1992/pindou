import { useEffect, useRef } from "react";
import { useBeadStore } from "../store/useBeadStore.ts";

interface DrawingOptions {
  onPainted?: (colorId: string) => void;
  onErased?: () => void;
}

export function useDrawing(options: DrawingOptions = {}) {
  const beginStroke = useBeadStore((s) => s.beginStroke);
  const endStroke = useBeadStore((s) => s.endStroke);
  const paintAt = useBeadStore((s) => s.paintAt);
  const eraseAt = useBeadStore((s) => s.eraseAt);
  const paintBatch = useBeadStore((s) => s.paintBatch);
  const setMode = useBeadStore((s) => s.setMode);
  const onPaintedRef = useRef(options.onPainted);
  const onErasedRef = useRef(options.onErased);
  onPaintedRef.current = options.onPainted;
  onErasedRef.current = options.onErased;

  const isDrawing = useRef(false);
  const isErasing = useRef(false);
  // 最近一次涂色的 idx，用于在拖动跨 cell 时做 Bresenham 线段插值，
  // 避免快速拖动 pointermove 事件之间间隔过大而漏涂中间格子。
  const lastIdxRef = useRef<number | null>(null);

  useEffect(() => {
    const stop = () => {
      if (isDrawing.current) {
        endStroke();
        setMode("idle");
        isDrawing.current = false;
        isErasing.current = false;
        lastIdxRef.current = null;
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
  }, [endStroke, setMode]);

  const colsRef = useRef<number>(useBeadStore.getState().cols);
  colsRef.current = useBeadStore.getState().cols;

  const handle = (idx: number, erase: boolean) => {
    const s = useBeadStore.getState();
    if (erase) {
      if (s.grid[idx] === null) return;
      eraseAt(idx);
      onErasedRef.current?.();
    } else {
      if (s.grid[idx] === s.currentColorId) return;
      paintAt(idx);
      onPaintedRef.current?.(s.currentColorId);
    }
  };

  // 从 lastIdx 画一条直线到 idx，沿途所有 cell 都涂/擦一遍。
  // 用 Bresenham 算法，整数运算，开销可忽略。
  // 重要：一次性收集所有 idx 交给 store.paintBatch，避免 N 次 setState
  // 触发 N 次同步重渲染（window listener 不在 React 事件上下文里，
  // React 18 automatic batching 不生效）。
  const paintLine = (fromIdx: number, toIdx: number, erase: boolean) => {
    const cols = colsRef.current;
    if (cols <= 0) {
      handle(toIdx, erase);
      return;
    }
    const fromR = Math.floor(fromIdx / cols);
    const fromC = fromIdx % cols;
    const toR = Math.floor(toIdx / cols);
    const toC = toIdx % cols;
    const dx = Math.abs(toC - fromC);
    const dy = Math.abs(toR - fromR);
    const sx = fromC < toC ? 1 : -1;
    const sy = fromR < toR ? 1 : -1;
    let err = dx - dy;
    let c = fromC;
    let r = fromR;
    // 上限保护：避免异常情况下死循环
    const maxSteps = dx + dy + 2;
    const targets: number[] = [];
    for (let i = 0; i < maxSteps; i++) {
      targets.push(r * cols + c);
      if (c === toC && r === toR) break;
      const e2 = err * 2;
      if (e2 > -dy) {
        err -= dy;
        c += sx;
      }
      if (e2 < dx) {
        err += dx;
        r += sy;
      }
    }
    // 批量更新前先比较，确认是否真的有格子改变
    const before = useBeadStore.getState();
    const colorId = before.currentColorId;
    let anyChanged = false;
    for (const idx of targets) {
      if (erase ? before.grid[idx] !== null : before.grid[idx] !== colorId) {
        anyChanged = true;
        break;
      }
    }
    paintBatch(targets, erase);
    if (anyChanged) {
      if (erase) onErasedRef.current?.();
      else onPaintedRef.current?.(colorId);
    }
  };

  const onCellDown = (idx: number, shiftKey = false) => {
    const s = useBeadStore.getState();
    const erase = shiftKey || s.eraserToggle;
    isDrawing.current = true;
    isErasing.current = erase;
    lastIdxRef.current = idx;
    const t0 = performance.now();
    setMode(erase ? "erasing" : "placing");
    beginStroke();
    handle(idx, erase);
    const t1 = performance.now();
    if (t1 - t0 > 20) {
      console.log(`[pd] onCellDown sync work ${(t1 - t0).toFixed(1)}ms`);
    }
  };

  const onCellEnter = (idx: number) => {
    if (!isDrawing.current) return;
    const last = lastIdxRef.current;
    if (last != null && last !== idx) {
      paintLine(last, idx, isErasing.current);
    } else {
      handle(idx, isErasing.current);
    }
    lastIdxRef.current = idx;
  };

  const onCellDblClick = (idx: number) => {
    const s = useBeadStore.getState();
    if (s.grid[idx]) s.pickColor(idx);
  };

  // 触摸路径：BeadCanvas 改用 pointer events，拖动期间由 global
  // pointermove 调 onCellEnter，已经能覆盖触摸；这里保留 onTouchHit
  // 作为兼容入口（也走插值路径）。
  const onTouchHit = (idx: number) => {
    if (!isDrawing.current) return;
    onCellEnter(idx);
  };

  return { onCellDown, onCellEnter, onCellDblClick, onTouchHit };
}
