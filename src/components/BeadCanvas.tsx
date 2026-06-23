import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { useBeadStore } from "../store/useBeadStore.ts";
import { getColor } from "../data/colors.ts";
import {
  drawCell,
  drawHoverPreview,
} from "./canvasDraw.ts";

// 内部渲染 cell size（不受显示尺寸影响）。始终用这个分辨率绘制底图，
// 显示时用 CSS 缩放到 beadSize。32 在 13px 显示时是降采样，足够锐利。
const RENDER_CELL = 32;

const BOARD_BG_CSS =
  "linear-gradient(135deg, #f4ecd8 0%, #ebdfbf 100%)";

export interface BeadCanvasHandle {
  canvas: HTMLCanvasElement | null;
}

interface BeadCanvasProps {
  beadSize: number;
  exporting?: boolean;
  onCellDown?: (idx: number) => void;
  onCellEnter?: (idx: number) => void;
  onCellHover?: (idx: number | null) => void;
  onTouchHit?: (idx: number) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onLongPress?: (x: number, y: number) => void;
}

export const BeadCanvas = forwardRef<BeadCanvasHandle, BeadCanvasProps>(
  function BeadCanvas(
    { beadSize, exporting = false, onCellDown, onCellEnter, onCellHover, onTouchHit, onContextMenu, onLongPress },
    ref
  ) {
    const grid = useBeadStore((s) => s.grid);
    const cols = useBeadStore((s) => s.cols);
    const rows = useBeadStore((s) => s.rows);
    const currentColorId = useBeadStore((s) => s.currentColorId);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    // 离屏底图（grid 内容），独立于可视 canvas，避免 hover 预览污染
    const baseRef = useRef<HTMLCanvasElement | null>(null);
    // 上次 grid 的快照，用于 diff
    const gridSnapRef = useRef<(string | null)[] | null>(null);
    const hoverIdxRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);
    const moveStartTsRef = useRef<number>(0);

    // ------- 底图绘制 -------
    const fullRepaintBase = useCallback(() => {
      const cellSize = RENDER_CELL;
      const canvas = baseRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = cols * cellSize;
      canvas.height = rows * cellSize;
      // 背景
      ctx.fillStyle = "#f4ecd8";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bg.addColorStop(0, "#f4ecd8");
      bg.addColorStop(1, "#ebdfbf");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const colorId = grid[idx];
          const color = colorId ? getColor(colorId) : null;
          drawCell(ctx, c * cellSize, r * cellSize, cellSize, color);
        }
      }
      gridSnapRef.current = grid.slice();
    }, [cols, rows, grid]);

    const repaintDirty = useCallback(
      (prev: (string | null)[], next: (string | null)[]) => {
        const cellSize = RENDER_CELL;
        const canvas = baseRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const len = Math.min(prev.length, next.length);
        for (let i = 0; i < len; i++) {
          if (prev[i] !== next[i]) {
            const c = i % cols;
            const r = Math.floor(i / cols);
            const colorId = next[i];
            const color = colorId ? getColor(colorId) : null;
            drawCell(ctx, c * cellSize, r * cellSize, cellSize, color);
          }
        }
      },
      [cols]
    );

    // grid 变化时 diff 重绘底图
    useEffect(() => {
      const prev = gridSnapRef.current;
      const t0 = performance.now();
      if (prev == null) {
        fullRepaintBase();
      } else if (prev !== grid) {
        repaintDirty(prev, grid);
        gridSnapRef.current = grid.slice();
      }
      const t1 = performance.now();
      scheduleComposite();
      if (t1 - t0 > 8) {
        console.log(`[pd] grid-effect repaint=${(t1 - t0).toFixed(1)}ms`);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [grid, fullRepaintBase, repaintDirty]);

    // ------- 可视层合成（底图 + hover 预览） -------
    const compositeRef = useRef<() => void>(() => {});

    const composite = useCallback(() => {
      const canvas = canvasRef.current;
      const base = baseRef.current;
      if (!canvas || !base) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const t0 = performance.now();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = cols * beadSize;
      const cssH = rows * beadSize;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.drawImage(base, 0, 0, cssW, cssH);

      const hi = hoverIdxRef.current;
      if (hi != null && hi >= 0 && hi < cols * rows && !exporting) {
        const color = getColor(currentColorId);
        const c = hi % cols;
        const r = Math.floor(hi / cols);
        drawHoverPreview(ctx, c * beadSize, r * beadSize, beadSize, color);
      }
      const t1 = performance.now();
      const ms = moveStartTsRef.current;
      if (ms > 0) {
        moveStartTsRef.current = 0;
        const total = t1 - ms;
        if (total > 60) {
          console.log(`[pd] move->paint ${total.toFixed(1)}ms (composite=${(t1 - t0).toFixed(1)}ms)`);
        }
      }
    }, [cols, rows, beadSize, currentColorId, exporting]);

    const scheduleComposite = useCallback(() => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        compositeRef.current();
      });
    }, []);

    useEffect(() => {
      compositeRef.current = composite;
      scheduleComposite();
    }, [composite, scheduleComposite]);

    // 初始化底图
    useEffect(() => {
      if (!baseRef.current) {
        baseRef.current = document.createElement("canvas");
      }
      fullRepaintBase();
      scheduleComposite();
    }, [fullRepaintBase, scheduleComposite]);

    // ------- 命中测试 -------
    const hitTest = useCallback(
      (clientX: number, clientY: number): number => {
        const canvas = canvasRef.current;
        if (!canvas) return -1;
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return -1;
        const col = Math.floor(x / beadSize);
        const row = Math.floor(y / beadSize);
        if (col < 0 || col >= cols || row < 0 || row >= rows) return -1;
        return row * cols + col;
      },
      [beadSize, cols, rows]
    );

    // ------- 拖动状态 -------
    // 拖动期间 isDraggingRef=true，pointermove/up 走 window 全局 listener，
    // 不依赖 React 合成事件分发，延迟最低；同时统一处理 mouse 与 touch。
    const isDraggingRef = useRef(false);
    const dragListenersRef = useRef<(() => void) | null>(null);

    const detachDragListeners = useCallback(() => {
      dragListenersRef.current?.();
      dragListenersRef.current = null;
    }, []);

    const stopDrag = useCallback(() => {
      isDraggingRef.current = false;
      detachDragListeners();
    }, [detachDragListeners]);

    const startDrag = useCallback(() => {
      isDraggingRef.current = true;
      detachDragListeners();

      const onMove = (ev: PointerEvent) => {
        if (!isDraggingRef.current) return;
        const idx = hitTest(ev.clientX, ev.clientY);
        if (idx >= 0) {
          hoverIdxRef.current = idx;
          moveStartTsRef.current = performance.now();
          onCellEnter?.(idx);
          scheduleComposite();
        }
      };
      const onUp = () => {
        // 抬起时 useDrawing 的 window mouseup/touchend 会 stop，
        // 这里只清理本地 listener。
        stopDrag();
      };
      const onCancel = () => stopDrag();

      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      dragListenersRef.current = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
      };
    }, [hitTest, onCellEnter, scheduleComposite, detachDragListeners, stopDrag]);

    // ------- 事件 -------
    const onMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (e.button === 2) return;
        e.preventDefault();
        const idx = hitTest(e.clientX, e.clientY);
        if (idx >= 0) {
          onCellDown?.(idx);
          // useDrawing 的 onCellDown 已经知道 erase/shift；这里只是
          // 启动 global listener 跟踪后续移动。
          startDrag();
        }
      },
      [hitTest, onCellDown, startDrag]
    );

    const onMouseMove = useCallback(
      (e: React.MouseEvent) => {
        // 拖动期间移动由 global pointermove 处理，这里只更新 hover 预览。
        if (isDraggingRef.current) {
          // 仍然刷新 hover 显示（拖动时显示当前色）
          const idx = hitTest(e.clientX, e.clientY);
          if (idx !== hoverIdxRef.current) {
            hoverIdxRef.current = idx;
            scheduleComposite();
          }
          return;
        }
        const idx = hitTest(e.clientX, e.clientY);
        if (idx !== hoverIdxRef.current) {
          hoverIdxRef.current = idx;
          onCellHover?.(idx);
          scheduleComposite();
        }
      },
      [hitTest, onCellHover, scheduleComposite]
    );

    const onMouseLeave = useCallback(() => {
      if (hoverIdxRef.current !== null) {
        hoverIdxRef.current = null;
        onCellHover?.(null);
        scheduleComposite();
      }
    }, [onCellHover, scheduleComposite]);

    // 卸载时清理 global listener
    useEffect(() => {
      return () => detachDragListeners();
    }, [detachDragListeners]);

    // 移动端触摸事件模型（v3.1 §3.1/§3.2）:
    // touch down 立即 onCellDown + startDrag,不等任何 timer。
    // 同时并行启动 longPress timer(用于打开 QuickPalette),
    // move > 4px(与 3D Board 一致)时只取消 timer,不影响 stroke。
    // 这避免了「按下立即拖动」被误判为 tap cancel 而永远不绘制。
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const longPressTimerRef = useRef<number | undefined>(undefined);
    const longPressFiredRef = useRef(false);
    const LONG_PRESS_MS = 350;
    const MOVE_THRESHOLD_PX = 4;

    const clearLongPressTimer = useCallback(() => {
      if (longPressTimerRef.current !== undefined) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = undefined;
      }
    }, []);

    useEffect(() => () => clearLongPressTimer(), [clearLongPressTimer]);

    const onTouchStart = useCallback(
      (e: React.TouchEvent) => {
        const t = e.touches[0];
        if (!t) return;
        e.preventDefault();
        const x = t.clientX;
        const y = t.clientY;
        touchStartRef.current = { x, y };
        longPressFiredRef.current = false;

        // 立即绘制（不等 timer）。hitTest 后立即 onCellDown + startDrag,
        // 后续拖动由 global pointermove 接管。
        const idx = hitTest(x, y);
        if (idx >= 0) {
          hoverIdxRef.current = idx;
          onCellDown?.(idx);
          startDrag();
        }

        // 并行启动 longPress timer,move > 4px 时取消。
        clearLongPressTimer();
        longPressTimerRef.current = window.setTimeout(() => {
          longPressFiredRef.current = true;
          onLongPress?.(x, y);
        }, LONG_PRESS_MS);

        const startX = x;
        const startY = y;
        const onMove = (ev: PointerEvent) => {
          if (longPressFiredRef.current) return;
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          if (dx * dx + dy * dy > MOVE_THRESHOLD_PX * MOVE_THRESHOLD_PX) {
            clearLongPressTimer();
          }
        };
        const detach = () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", detach);
          window.removeEventListener("pointercancel", detach);
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerup", detach);
        window.addEventListener("pointercancel", detach);
      },
      [hitTest, onCellDown, onLongPress, startDrag, clearLongPressTimer]
    );

    // 触摸拖动期间不再依赖 React onTouchMove（已被 global pointermove 接管）。
    // 但需要保留 onTouchMove 以兼容某些不会触发 pointerevent 的边界场景。
    const onTouchMove = useCallback(
      (e: React.TouchEvent) => {
        if (!isDraggingRef.current) return;
        const t = e.touches[0];
        if (!t) return;
        const idx = hitTest(t.clientX, t.clientY);
        if (idx >= 0) {
          onTouchHit?.(idx);
        }
      },
      [hitTest, onTouchHit]
    );

    useImperativeHandle(
      ref,
      (): BeadCanvasHandle => ({
        canvas: canvasRef.current,
      }),
      []
    );

    const cssW = cols * beadSize;
    const cssH = rows * beadSize;
    const pad = beadSize * 0.4;

    return (
      <div
        data-export-root
        style={{
          display: "block",
          background: BOARD_BG_CSS,
          borderRadius: 12,
          padding: pad,
          boxShadow:
            "inset 0 2px 8px rgba(80, 60, 30, 0.18), 0 8px 24px rgba(80, 60, 30, 0.15)",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
          touchAction: "none",
          width: cssW + pad * 2,
          height: cssH + pad * 2,
        }}
        onContextMenu={onContextMenu}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            width: cssW,
            height: cssH,
            cursor: "crosshair",
            touchAction: "none",
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
        />
      </div>
    );
  }
);
