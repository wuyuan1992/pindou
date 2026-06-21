import {
  Brush,
  Eraser,
  Pipette,
  Undo2,
  Trash2,
  Download,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useBeadStore } from "../store/useBeadStore.ts";
import type { Tool } from "../types.ts";

interface ToolbarProps {
  onExport: () => void;
  onToggleMute: () => void;
  muted: boolean;
  exporting: boolean;
}

export function Toolbar({
  onExport,
  onToggleMute,
  muted,
  exporting,
}: ToolbarProps) {
  const tool = useBeadStore((s) => s.tool);
  const setTool = useBeadStore((s) => s.setTool);
  const undo = useBeadStore((s) => s.undo);
  const clear = useBeadStore((s) => s.clear);
  const history = useBeadStore((s) => s.history);
  const strokeSnapshot = useBeadStore((s) => s.strokeSnapshot);

  const canUndo = !strokeSnapshot && history.length > 0;

  const tools: { id: Tool; icon: typeof Brush; label: string }[] = [
    { id: "brush", icon: Brush, label: "画笔" },
    { id: "eraser", icon: Eraser, label: "橡皮" },
    { id: "eyedropper", icon: Pipette, label: "吸管" },
  ];

  return (
    <div
      data-ui
      className="flex items-center gap-1 bg-white/80 backdrop-blur rounded-xl p-1.5 shadow-sm border border-amber-100"
    >
      {tools.map((t) => {
        const Icon = t.icon;
        const active = tool === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            title={t.label}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
              active
                ? "bg-amber-500 text-white shadow-md scale-105"
                : "text-stone-600 hover:bg-amber-100"
            }`}
          >
            <Icon size={18} strokeWidth={2.2} />
          </button>
        );
      })}

      <div className="w-px h-6 bg-amber-200 mx-1" />

      <button
        onClick={() => onToggleMute()}
        title={muted ? "取消静音" : "静音"}
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
          muted
            ? "text-stone-400 hover:bg-amber-100"
            : "text-amber-600 bg-amber-50"
        }`}
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      <div className="w-px h-6 bg-amber-200 mx-1" />

      <button
        onClick={undo}
        disabled={!canUndo}
        title="撤销"
        className="w-10 h-10 flex items-center justify-center rounded-lg transition-all text-stone-600 hover:bg-amber-100 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <Undo2 size={18} strokeWidth={2.2} />
      </button>
      <button
        onClick={() => {
          if (confirm("清空整个画布？")) clear();
        }}
        title="清空"
        className="w-10 h-10 flex items-center justify-center rounded-lg transition-all text-stone-600 hover:bg-red-100 hover:text-red-600"
      >
        <Trash2 size={18} strokeWidth={2.2} />
      </button>

      <div className="w-px h-6 bg-amber-200 mx-1" />

      <button
        onClick={onExport}
        disabled={exporting}
        title="导出 PNG"
        className="h-10 px-4 flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
      >
        <Download size={16} strokeWidth={2.5} />
        {exporting ? "导出中…" : "导出"}
      </button>
    </div>
  );
}
