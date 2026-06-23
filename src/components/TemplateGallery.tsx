import { useState, useRef, type CSSProperties } from "react";
import { LayoutGrid, Plus, Trash2 } from "lucide-react";
import { useTemplatesStore } from "../store/useTemplatesStore.ts";
import { useBeadStore } from "../store/useBeadStore.ts";
import { useClickOutside } from "../hooks/useClickOutside.ts";
import { Modal } from "./Modal.tsx";
import { getColor } from "../data/colors.ts";
import type { Template } from "../types.ts";

type DialogState =
  | { kind: "empty" }
  | { kind: "save" }
  | { kind: "remove"; id: string }
  | null;

export function TemplateGallery() {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [draftName, setDraftName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setOpen(false), open);

  const loadTemplate = useBeadStore((s) => s.loadTemplate);
  const grid = useBeadStore((s) => s.grid);
  const cols = useBeadStore((s) => s.cols);
  const rows = useBeadStore((s) => s.rows);
  const builtin = useTemplatesStore((s) => s.builtin);
  const custom = useTemplatesStore((s) => s.custom);
  const saveCustom = useTemplatesStore((s) => s.saveCustom);
  const removeCustom = useTemplatesStore((s) => s.removeCustom);

  const handleSave = () => {
    const isEmpty = grid.every((c) => c === null);
    if (isEmpty) {
      setDialog({ kind: "empty" });
      return;
    }
    setDraftName(`我的作品 ${custom.length + 1}`);
    setDialog({ kind: "save" });
  };

  const handleRemove = (id: string) => {
    setDialog({ kind: "remove", id });
  };

  return (
    <>
      <div ref={containerRef} className="relative shrink-0">
        <button
          onClick={() => setOpen((o) => !o)}
          title="模板"
          aria-label="模板"
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
            className="absolute top-full mt-2 right-0 z-[100] w-[360px] max-w-[calc(100vw-1rem)] bg-white/95 backdrop-blur rounded-xl p-4 shadow-xl border border-amber-100 max-h-[60vh] overflow-y-auto"
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

      <Modal
        open={dialog?.kind === "empty"}
        mode="alert"
        title="画布是空的"
        description="先画点什么，再保存为模板吧。"
        confirmText="知道了"
        onConfirm={() => setDialog(null)}
      />

      <Modal
        open={dialog?.kind === "save"}
        mode="prompt"
        title="保存模板"
        description="给这个作品起个名字。"
        confirmText="保存"
        cancelText="取消"
        defaultValue={draftName}
        placeholder="作品名称"
        onCancel={() => setDialog(null)}
        onConfirm={(name) => {
          const trimmed = name.trim();
          if (!trimmed) return;
          saveCustom(trimmed, grid, cols, rows);
          setDialog(null);
        }}
      />

      <Modal
        open={dialog?.kind === "remove"}
        title="删除模板？"
        description="删除后无法恢复。"
        variant="danger"
        confirmText="删除"
        cancelText="取消"
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          if (dialog?.kind === "remove") removeCustom(dialog.id);
          setDialog(null);
        }}
      />
    </>
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
