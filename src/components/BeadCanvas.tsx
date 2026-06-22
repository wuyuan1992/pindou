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
}

export const BeadCanvas = forwardRef<BeadCanvasHandle, BeadCanvasProps>(
  function BeadCanvas(
    { beadSize, exporting = false, onCellDown, onCellEnter, onCellHover, onTouchHit, onContextMenu },
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
      if (prev == null) {
        fullRepaintBase();
      } else if (prev !== grid) {
        repaintDirty(prev, grid);
        gridSnapRef.current = grid.slice();
      }
      scheduleComposite();
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

    // ------- 事件 -------
    const onPointerDown = useCallback(
      (e: React.MouseEvent) => {
        if (e.button === 2) return;
        e.preventDefault();
        const idx = hitTest(e.clientX, e.clientY);
        if (idx >= 0) onCellDown?.(idx);
      },
      [hitTest, onCellDown]
    );

    const onPointerMove = useCallback(
      (e: React.MouseEvent) => {
        const idx = hitTest(e.clientX, e.clientY);
        if (idx !== hoverIdxRef.current) {
          hoverIdxRef.current = idx;
          onCellHover?.(idx);
          if (idx >= 0) onCellEnter?.(idx);
          scheduleComposite();
        }
      },
      [hitTest, onCellHover, onCellEnter, scheduleComposite]
    );

    const onPointerLeave = useCallback(() => {
      if (hoverIdxRef.current !== null) {
        hoverIdxRef.current = null;
        onCellHover?.(null);
        scheduleComposite();
      }
    }, [onCellHover, scheduleComposite]);

    const onTouchStart = useCallback(
      (e: React.TouchEvent) => {
        const t = e.touches[0];
        if (!t) return;
        e.preventDefault();
        const idx = hitTest(t.clientX, t.clientY);
        if (idx >= 0) {
          hoverIdxRef.current = idx;
          onCellDown?.(idx);
        }
      },
      [hitTest, onCellDown]
    );

    const onTouchMove = useCallback(
      (e: React.TouchEvent) => {
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
          }}
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseLeave={onPointerLeave}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
        />
      </div>
    );
  }
);
