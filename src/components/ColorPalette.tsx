import { type CSSProperties } from "react";
import { COLOR_BY_SLUG, COLOR_GROUPS, COLOR_MAP } from "../data/colors.ts";
import { useBeadStore } from "../store/useBeadStore.ts";

export function ColorPalette() {
  const currentColorId = useBeadStore((s) => s.currentColorId);
  const setColor = useBeadStore((s) => s.setColor);

  return (
    <div
      data-ui
      className="bg-white/80 backdrop-blur rounded-xl p-4 shadow-sm border border-amber-100 max-h-[60vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
          调色板
        </h3>
        <CurrentColorPreview colorId={currentColorId} />
      </div>
      <div className="space-y-3">
        {COLOR_GROUPS.map((group) => (
          <div key={group.name}>
            <div className="text-[10px] text-stone-400 mb-1.5 font-medium">
              {group.name}
            </div>
            <div className="grid grid-cols-8 gap-1.5">
              {group.slugs.map((slug) => {
                const color = COLOR_BY_SLUG[slug];
                if (!color) return null;
                const active = color.id === currentColorId;
                return (
                  <button
                    key={slug}
                    onClick={() => setColor(color.id)}
                    title={color.name}
                    className="aspect-square rounded-full relative transition-transform hover:scale-110"
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

function CurrentColorPreview({ colorId }: { colorId: string }) {
  const color = COLOR_MAP[colorId];
  if (!color) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-stone-600">{color.name}</span>
      <div
        className="w-5 h-5 rounded-full border border-stone-300 shadow-sm"
        style={{ background: color.base }}
      />
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
