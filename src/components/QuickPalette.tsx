import { useEffect, useRef, type CSSProperties } from "react";
import { COLOR_BY_SLUG, COLOR_GROUPS, COLOR_MAP } from "../data/colors.ts";

interface QuickPaletteProps {
  position: { x: number; y: number };
  currentColorId: string;
  onPick: (colorId: string) => void;
  onClose: () => void;
}

const PALETTE_WIDTH = 280;

export function QuickPalette({
  position,
  currentColorId,
  onPick,
  onClose,
}: QuickPaletteProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    document.addEventListener("contextmenu", onClose, true);
    return () => document.removeEventListener("contextmenu", onClose, true);
  }, [onClose]);

  const left = clamp(position.x, 8, window.innerWidth - PALETTE_WIDTH - 8);
  const top = clamp(position.y, 8, window.innerHeight - 360);

  return (
    <div
      ref={ref}
      data-ui
      className="fixed z-50 bg-white/95 backdrop-blur rounded-xl p-3 shadow-2xl border border-amber-200"
      style={{ left, top, width: PALETTE_WIDTH }}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
          选择颜色
        </span>
        <span className="text-[10px] text-stone-400">右键/Esc 关闭</span>
      </div>
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {COLOR_GROUPS.map((group) => (
          <div key={group.name}>
            <div className="text-[10px] text-stone-400 mb-1 font-medium">
              {group.name}
            </div>
            <div className="grid grid-cols-8 gap-1">
              {group.slugs.map((slug) => {
                const color = COLOR_BY_SLUG[slug];
                if (!color) return null;
                const active = color.id === currentColorId;
                return (
                  <button
                    key={slug}
                    onClick={() => {
                      onPick(color.id);
                      onClose();
                    }}
                    title={color.name}
                    className="aspect-square rounded-full transition-transform hover:scale-110"
                    style={swatchStyle(color.base, active)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function swatchStyle(base: string, active: boolean): CSSProperties {
  return {
    background: `radial-gradient(circle at 30% 28%, ${base} 0%, ${base} 60%, rgba(0,0,0,0.25) 100%)`,
    boxShadow: active
      ? `0 0 0 3px white, 0 0 0 5px #f59e0b, 0 2px 4px rgba(0,0,0,0.2)`
      : "0 1px 2px rgba(0,0,0,0.15)",
    transform: active ? "scale(1.1)" : undefined,
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function getCurrentColorName(colorId: string | null): string | null {
  if (!colorId) return null;
  return COLOR_MAP[colorId]?.name ?? null;
}
