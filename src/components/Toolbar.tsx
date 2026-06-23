import { useRef, useState } from "react";
import {
  Brush,
  Eraser,
  Pipette,
  Undo2,
  Redo2,
  Download,
  Upload,
  Grid3x3,
  Box,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useBeadStore } from "../store/useBeadStore.ts";
import { useClickOutside } from "../hooks/useClickOutside.ts";
import { Modal } from "./Modal.tsx";
import type { Tool } from "../types.ts";

const btnBase =
  "w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg transition-all shrink-0";
const btnIdle = "text-stone-600 hover:bg-amber-100";
const btnActive = "bg-amber-500 text-white shadow-md scale-105";
const btnDisabled = "opacity-30 hover:bg-transparent";

const cardClass =
  "flex items-center gap-0.5 md:gap-1 bg-white/95 rounded-xl p-1.5 shadow-sm border border-amber-100 flex-nowrap shrink-0";

function Divider() {
  return <div className="hidden sm:block w-px h-5 md:h-6 bg-amber-200 mx-0.5 md:mx-1.5 shrink-0" />;
}

const EDIT_TOOLS: { id: Tool; icon: typeof Brush; label: string }[] = [
  { id: "brush", icon: Brush, label: "画笔" },
  { id: "eraser", icon: Eraser, label: "橡皮" },
  { id: "eyedropper", icon: Pipette, label: "吸管" },
];

// 画板上方左：2D/3D 切换
export function ViewModeTab({
  mode,
  onModeChange,
}: {
  mode: "2d" | "3d";
  onModeChange: (m: "2d" | "3d") => void;
}) {
  return (
    <div
      data-ui
      className="inline-flex p-1 rounded-xl bg-white/80 backdrop-blur shadow-sm border border-amber-100 shrink-0"
    >
      {(["2d", "3d"] as const).map((m) => (
        <button
          key={m}
          role="tab"
          aria-selected={mode === m}
          onClick={() => onModeChange(m)}
          className={`px-4 py-1.5 text-xs md:text-sm font-medium rounded-lg transition-colors ${
            mode === m ? "bg-amber-500 text-white shadow" : "text-stone-600 hover:text-amber-700"
          }`}
        >
          {m === "2d" ? "2D 平面" : "3D 拟物"}
        </button>
      ))}
    </div>
  );
}

// 画板上方右：导入/导出/模板
export function FileToolbar({
  onExport,
  onExportFlat,
  onImportImage,
  exporting,
  exportingFlat,
  importing,
  children,
}: {
  onExport: () => void;
  onExportFlat: () => void;
  onImportImage: () => void;
  exporting: boolean;
  exportingFlat: boolean;
  importing: boolean;
  children?: React.ReactNode;
}) {
  const grid = useBeadStore((s) => s.grid);
  const isEmpty = grid.every((c) => c === null);

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  useClickOutside(exportRef, () => setExportOpen(false), exportOpen);

  const handlePickExport = (kind: "flat" | "3d") => {
    setExportOpen(false);
    if (kind === "flat") onExportFlat();
    else onExport();
  };

  return (
    <div data-ui className={cardClass}>
      <button
        onClick={onImportImage}
        disabled={importing}
        title="从图片生成拼豆"
        aria-label="导入图片"
        className={`${btnBase} ${importing ? "text-amber-400" : btnIdle}`}
      >
        <Upload size={18} strokeWidth={2.2} />
      </button>

      <div ref={exportRef} className="relative shrink-0">
        <button
          onClick={() => setExportOpen((o) => !o)}
          disabled={isEmpty || exporting || exportingFlat}
          title="导出图片"
          aria-label="导出图片"
          aria-expanded={exportOpen}
          className={`${btnBase} ${
            isEmpty || exporting || exportingFlat
              ? btnDisabled
              : exportOpen
              ? btnActive
              : "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:scale-105"
          }`}
        >
          <Download size={18} strokeWidth={2.2} />
        </button>

        {exportOpen && (
          <div
            data-ui
            className="absolute md:absolute fixed inset-x-2 top-16 md:inset-x-auto md:top-full md:right-0 md:mt-2 z-[100] w-72 max-w-[calc(100vw-1rem)] bg-white/95 backdrop-blur rounded-xl p-2 shadow-xl border border-amber-100"
          >
            <button
              onClick={() => handlePickExport("flat")}
              disabled={exportingFlat}
              className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-amber-100 transition-colors text-left disabled:opacity-50"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Grid3x3 size={18} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-stone-800">
                  {exportingFlat ? "导出中…" : "方格像素图"}
                </div>
                <div className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                  熨烫后的方格像素画
                </div>
              </div>
            </button>
            <button
              onClick={() => handlePickExport("3d")}
              disabled={exporting}
              className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-amber-100 transition-colors text-left disabled:opacity-50"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Box size={18} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-stone-800">
                  {exporting ? "导出中…" : "3D 立体图"}
                </div>
                <div className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                  带真实拼豆质感的立体渲染
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {children}
    </div>
  );
}

// 画板下方：编辑 + 历史/重置 + 静音
export function EditToolbar({
  onToggleMute,
  muted,
}: {
  onToggleMute: () => void;
  muted: boolean;
}) {
  const tool = useBeadStore((s) => s.tool);
  const setTool = useBeadStore((s) => s.setTool);
  const undo = useBeadStore((s) => s.undo);
  const redo = useBeadStore((s) => s.redo);
  const clear = useBeadStore((s) => s.clear);
  const history = useBeadStore((s) => s.history);
  const redoStack = useBeadStore((s) => s.redoStack);
  const strokeSnapshot = useBeadStore((s) => s.strokeSnapshot);
  const grid = useBeadStore((s) => s.grid);

  const canUndo = !strokeSnapshot && history.length > 0;
  const canRedo = !strokeSnapshot && redoStack.length > 0;
  const isEmpty = grid.every((c) => c === null);

  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <>
      <div
        data-ui
        className="flex items-center justify-center gap-0.5 md:gap-1 bg-white/98 border-t border-amber-100 shadow-lg px-2 py-2 md:py-2.5 overflow-x-auto"
      >
        {EDIT_TOOLS.map((t) => {
          const Icon = t.icon;
          const active = tool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={t.label}
              aria-label={t.label}
              aria-pressed={active}
              className={`${btnBase} ${active ? btnActive : btnIdle}`}
            >
              <Icon size={18} strokeWidth={2.2} />
            </button>
          );
        })}

        <Divider />

        <button
          onClick={undo}
          disabled={!canUndo}
          title="撤销"
          aria-label="撤销"
          className={`${btnBase} ${canUndo ? btnIdle : btnDisabled}`}
        >
          <Undo2 size={18} strokeWidth={2.2} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="前进"
          aria-label="前进"
          className={`${btnBase} ${canRedo ? btnIdle : btnDisabled}`}
        >
          <Redo2 size={18} strokeWidth={2.2} />
        </button>
        <button
          onClick={() => setConfirmReset(true)}
          disabled={isEmpty}
          title="重置画布"
          aria-label="重置画布"
          className={`${btnBase} ${
            isEmpty ? btnDisabled : "text-stone-600 hover:bg-red-100 hover:text-red-600"
          }`}
        >
          <RotateCcw size={18} strokeWidth={2.2} />
        </button>

        <Divider />

        <button
          onClick={onToggleMute}
          title={muted ? "取消静音" : "静音"}
          aria-label={muted ? "取消静音" : "静音"}
          aria-pressed={!muted}
          className={`${btnBase} ${
            muted ? "text-stone-400 hover:bg-amber-100" : "text-amber-600 bg-amber-50"
          }`}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      <Modal
        open={confirmReset}
        title="重置画布？"
        description="所有拼豆将被清空，但可以用撤销恢复。"
        variant="danger"
        confirmText="确认重置"
        cancelText="取消"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          clear();
          setConfirmReset(false);
        }}
      />
    </>
  );
}
