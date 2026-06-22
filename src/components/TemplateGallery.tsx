import { useState, useRef, useEffect, type CSSProperties } from "react";
import { LayoutGrid, Plus, Trash2 } from "lucide-react";
import { useTemplatesStore } from "../store/useTemplatesStore.ts";
import { useBeadStore } from "../store/useBeadStore.ts";
import { getColor } from "../data/colors.ts";
import type { Template } from "../types.ts";

export function TemplateGallery() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadTemplate = useBeadStore((s) => s.loadTemplate);
  const grid = useBeadStore((s) => s.grid);
  const cols = useBeadStore((s) => s.cols);
  const rows = useBeadStore((s) => s.rows);
  const builtin = useTemplatesStore((s) => s.builtin);
  const custom = useTemplatesStore((s) => s.custom);
  const saveCustom = useTemplatesStore((s) => s.saveCustom);
  const removeCustom = useTemplatesStore((s) => s.removeCustom);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const handleSave = () => {
    const isEmpty = grid.every((c) => c === null);
    if (isEmpty) {
      alert("画布是空的，先画点什么吧");
      return;
    }
    const name = prompt("给模板起个名字", `我的作品 ${custom.length + 1}`);
    if (name === null) return;
    saveCustom(name, grid, cols, rows);
  };

  const handleRemove = (id: string) => {
    if (confirm("删除这个模板？")) removeCustom(id);
  };

  return (
    <div
      ref={containerRef}
      data-ui
      className="relative bg-white/80 backdrop-blur rounded-xl p-1.5 shadow-sm border border-amber-100"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        title="模板"
        aria-expanded={open}
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
          open
            ? "bg-amber-500 text-white shadow-md scale-105"
            : "text-stone-600 hover:bg-amber-100"
        }`}
      >
        <LayoutGrid size={18} strokeWidth={2.2} />
      </button>

      {open && (
        <div
          data-ui
          className="absolute z-50 mt-2 w-[360px] right-0 bg-white/95 backdrop-blur rounded-xl p-4 shadow-xl border border-amber-100 max-h-[70vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              模板
            </h3>
            <button
              onClick={handleSave}
              className="text-xs flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500 text-white hover:bg-amber-600 transition-colors font-medium"
            >
              <Plus size={12} strokeWidth={3} />
              保存当前
            </button>
          </div>

          {custom.length > 0 && (
            <div className="mb-4">
              <div className="text-[10px] text-stone-400 mb-1.5 font-medium">
                我的模板
              </div>
              <div className="grid grid-cols-2 gap-2">
                {custom.map((tpl) => (
                  <TemplateCard
                    key={tpl.id}
                    tpl={tpl}
                    onClick={() => loadTemplate(tpl)}
                    onRemove={() => handleRemove(tpl.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-[10px] text-stone-400 mb-1.5 font-medium">
              内置模板
            </div>
            <div className="grid grid-cols-2 gap-2">
              {builtin.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  tpl={tpl}
                  onClick={() => loadTemplate(tpl)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  tpl,
  onClick,
  onRemove,
}: {
  tpl: Template;
  onClick: () => void;
  onRemove?: () => void;
}) {
  const maxDim = 110;
  const cellSize = Math.max(
    2,
    Math.floor(maxDim / Math.max(tpl.cols, tpl.rows))
  );

  return (
    <div className="relative group flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-amber-100 transition-colors">
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-sm hover:bg-red-600 z-10"
          title="删除"
        >
          <Trash2 size={10} strokeWidth={3} />
        </button>
      )}
      <button onClick={onClick} className="flex flex-col items-center gap-1">
        <div
          className="bg-amber-50 rounded-md p-1 group-hover:scale-105 transition-transform"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${tpl.cols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${tpl.rows}, ${cellSize}px)`,
          }}
        >
          {tpl.cells.map((colorId, idx) => {
            const color = colorId ? getColor(colorId) : null;
            const style: CSSProperties = {
              width: cellSize,
              height: cellSize,
              borderRadius: "50%",
            };
            if (color) {
              style.background = `radial-gradient(circle at 30% 28%, ${color.highlight}, ${color.base} 60%, ${color.shadow})`;
            }
            return <div key={idx} style={style} />;
          })}
        </div>
        <span className="text-[11px] text-stone-600 group-hover:text-amber-700 font-medium truncate max-w-[72px]">
          {tpl.name}
        </span>
      </button>
    </div>
  );
}
