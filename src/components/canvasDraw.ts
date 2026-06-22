import type { BeadColor } from "../types.ts";

// 与原 Bead.tsx 视觉常量对齐
export const BEAD_TO_CELL = 0.92;
export const HOLE_TO_BEAD = 0.22;

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 在给定 ctx 上绘制单个 cell 的 bead。
 * (cx, cy) 是 cell 的左上角；size 是 cell 边长。
 */
export function drawCell(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: BeadColor | null
): void {
  if (!color) {
    drawPegHole(ctx, cx, cy, size);
    return;
  }
  drawBead(ctx, cx, cy, size, color);
}

export function drawPegHole(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number
): void {
  const hole = size * BEAD_TO_CELL * HOLE_TO_BEAD;
  const r = hole / 2;
  const ccx = cx + size / 2;
  const ccy = cy + size / 2;

  ctx.save();
  ctx.shadowColor = "rgba(255,255,255,0.5)";
  ctx.shadowBlur = size * 0.04;
  const g = ctx.createRadialGradient(
    ccx,
    ccy - hole * 0.08,
    0,
    ccx,
    ccy,
    r
  );
  g.addColorStop(0, "rgba(255,255,255,0.78)");
  g.addColorStop(0.45, "rgba(244,244,246,0.52)");
  g.addColorStop(1, "rgba(198,198,205,0.38)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(ccx, ccy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawBead(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: BeadColor
): void {
  const beadSize = size * BEAD_TO_CELL;
  const half = beadSize / 2;
  const ccx = cx + size / 2;
  const ccy = cy + size / 2;

  ctx.save();

  // 1. 落地投影
  ctx.shadowColor = "rgba(0,0,0,0.32)";
  ctx.shadowBlur = size * 0.08;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = size * 0.05;
  ctx.fillStyle = rgba(color.base, 1);
  ctx.beginPath();
  ctx.arc(ccx, ccy, half, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // 2. 主渐变 radial-gradient(circle at 38% 32%, ...)
  const offX = (0.38 - 0.5) * beadSize;
  const offY = (0.32 - 0.5) * beadSize;
  const grad = ctx.createRadialGradient(
    ccx + offX,
    ccy + offY,
    0,
    ccx,
    ccy,
    half
  );
  grad.addColorStop(0, rgba(color.highlight, 0.55));
  grad.addColorStop(0.38, rgba(color.base, 1));
  grad.addColorStop(0.7, rgba(color.base, 1));
  grad.addColorStop(1, rgba(color.shadow, 0.85));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(ccx, ccy, half, 0, Math.PI * 2);
  ctx.fill();

  // inset 区域：clip 到圆内画
  ctx.save();
  ctx.beginPath();
  ctx.arc(ccx, ccy, half, 0, Math.PI * 2);
  ctx.clip();

  // 3. inset 顶部亮边
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = size * 0.04;
  ctx.beginPath();
  ctx.arc(ccx, ccy, half - size * 0.015, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  // 4. inset 底部暗边
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = size * 0.055;
  ctx.beginPath();
  ctx.arc(ccx, ccy, half - size * 0.02, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();

  // 5. 玻璃内透光
  const inner = ctx.createRadialGradient(ccx, ccy, 0, ccx, ccy, half);
  inner.addColorStop(0, "rgba(0,0,0,0)");
  inner.addColorStop(0.55, "rgba(0,0,0,0)");
  inner.addColorStop(1, rgba(color.highlight, 0.28));
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.arc(ccx, ccy, half, 0, Math.PI * 2);
  ctx.fill();

  // 6. 倒角亮环
  const rim = ctx.createRadialGradient(ccx, ccy, half * 0.78, ccx, ccy, half);
  rim.addColorStop(0, "rgba(255,255,255,0)");
  rim.addColorStop(0.7, "rgba(255,255,255,0.6)");
  rim.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(ccx, ccy, half, 0, Math.PI * 2);
  ctx.fill();

  // 7. 镜面高光
  const hw = beadSize * 0.3;
  const hh = beadSize * 0.2;
  const hx = ccx - half + beadSize * 0.22 + hw / 2;
  const hy = ccy - half + beadSize * 0.16 + hh / 2;
  const hgrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, hw / 2);
  hgrad.addColorStop(0, "rgba(255,255,255,0.95)");
  hgrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.save();
  ctx.translate(hx, hy);
  ctx.scale(1, hh / hw);
  ctx.translate(-hx, -hy);
  ctx.fillStyle = hgrad;
  ctx.beginPath();
  ctx.arc(hx, hy, hw / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore(); // exit inset clip

  // 8. 中心磨砂孔柱
  drawHolePillar(ctx, ccx, ccy, size);
  ctx.restore();
}

export function drawHolePillar(
  ctx: CanvasRenderingContext2D,
  ccx: number,
  ccy: number,
  size: number
): void {
  const hole = size * BEAD_TO_CELL * HOLE_TO_BEAD;
  const r = hole / 2;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = size * 0.02;
  ctx.shadowOffsetY = size * 0.008;

  const g = ctx.createRadialGradient(
    ccx,
    ccy - hole * 0.1,
    0,
    ccx,
    ccy,
    r
  );
  g.addColorStop(0, "rgba(255,255,255,0.78)");
  g.addColorStop(0.45, "rgba(244,244,246,0.52)");
  g.addColorStop(1, "rgba(198,198,205,0.38)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(ccx, ccy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = Math.max(0.6, size * 0.012);
  ctx.beginPath();
  ctx.arc(ccx, ccy, r - size * 0.006, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  ctx.restore();
}

export function drawHoverPreview(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: BeadColor
): void {
  ctx.save();
  ctx.globalAlpha = 0.55;
  drawBead(ctx, cx, cy, size, color);
  ctx.restore();
}
