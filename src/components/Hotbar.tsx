import { useRef, useState, type CSSProperties } from "react";
import { Eraser, Undo2, Redo2, RotateCcw, Eye, Volume2, VolumeX, Palette } from "lucide-react";
import { useBeadStore } from "../store/useBeadStore.ts";
import { useLayoutStore } from "../store/useLayoutStore.ts";
import { useClickOutside } from "../hooks/useClickOutside.ts";
import { QuickPalette } from "./QuickPalette.tsx";
import { Modal } from "./Modal.tsx";
import { getColor } from "../data/colors.ts";

export const btnBase =
  "w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-lg transition-all shrink-0 active:scale-95";
export const btnIdle = "text-stone-600 hover:bg-amber-100";
export const btnActive = "bg-amber-500 text-white shadow-md scale-105";
export const btnDisabled = "opacity-30 hover:bg-transparent";

export const cardClass =
  "flex items-center gap-0.5 md:gap-1 bg-white/95 rounded-xl p-1 md:p-1.5 shadow-sm border border-amber-100 flex-nowrap";

function Divider() {
  return <div className="w-px h-5 md:h-6 bg-amber-200 mx-0.5 md:mx-1 shrink-0" />;
}

function swatchStyle(base: string, active: boolean): CSSProperties {
  return {
    background: `radial-gradient(circle at 30% 28%, ${base} 0%, ${base} 60%, rgba(0,0,0,0.25) 100%)`,
    boxShadow: active
      ? "0 0 0 2px white, 0 0 0 4px #f59e0b, 0 2px 4px rgba(0,0,0,0.2)"
      : "0 1px 2px rgba(0,0,0,0.15)",
  };
}

export function Hotbar({
  viewMode,
  muted,
  onToggleMute,
}: {
  viewMode: "2d" | "3d";
  muted: boolean;
  onToggleMute: () => void;
}) {
  const currentColorId = useBeadStore((s) => s.currentColorId);
  const recentColorIds = useBeadStore((s) => s.recentColorIds);
  const setColor = useBeadStore((s) => s.setColor);
  const eraserToggle = useBeadStore((s) => s.eraserToggle);
  const setEraserToggle = useBeadStore((s) => s.setEraserToggle);
  const undo = useBeadStore((s) => s.undo);
  const redo = useBeadStore((s) => s.redo);
  const clear = useBeadStore((s) => s.clear);
  const history = useBeadStore((s) => s.history);
  const redoStack = useBeadStore((s) => s.redoStack);
  const strokeSnapshot = useBeadStore((s) => s.strokeSnapshot);
  const grid = useBeadStore((s) => s.grid);

  const previewMode = useLayoutStore((s) => s.previewMode);
  const togglePreview = useLayoutStore((s) => s.togglePreview);

  const chipRef = useRef<HTMLButtonElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [palettePos, setPalettePos] = useState({ x: 0, y: 0 });
  const [confirmReset, setConfirmReset] = useState(false);

  useClickOutside(paletteRef, () => setPaletteOpen(false), paletteOpen);

  const openPalette = () => {
    const rect = chipRef.current?.getBoundingClientRect();
    if (rect) {
      setPalettePos({ x: rect.left, y: rect.bottom + 8 });
    }
    setPaletteOpen(true);
  };

  const canUndo = !strokeSnapshot && history.length > 0;
  const canRedo = !strokeSnapshot && redoStack.length > 0;
  const isEmpty = grid.every((c) => c === null);
  const slots = Array.from({ length: 8 }, (_, i) => recentColorIds[i] ?? null);

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const { recentColorIds: recent, currentColorId: cur } =
      useBeadStore.getState();
    if (recent.length === 0) return;
    const curIdx = recent.indexOf(cur);
    const dir = e.deltaY > 0 ? 1 : -1;
    const baseIdx = curIdx === -1 ? 0 : curIdx;
    const nextIdx = (baseIdx + dir + recent.length) % recent.length;
    setColor(recent[nextIdx]);
  };

  return (
    <>
      <div
        data-ui
        data-onboarding="hotbar"
        onWheel={onWheel}
        className={`${cardClass} overflow-x-auto max-w-full`}
      >
        <button
          ref={chipRef}
          onClick={openPalette}
          title="选择颜色"
          aria-label="选择颜色"
          className="group relative w-8 h-8 md:w-9 md:h-9 rounded-full transition-transform hover:scale-105 shrink-0 rainbow-chip flex items-center justify-center"
          style={{
            background:
              "conic-gradient(from 0deg, #ff3b3b, #ffd93b, #6bcb77, #4d96ff, #9b5de5, #ff5da2, #ff3b3b)",
            boxShadow:
              "0 0 0 2px white, 0 0 0 3px rgba(245,158,11,0.35), 0 2px 4px rgba(0,0,0,0.2)",
          }}
        >
          <Palette size={16} className="text-white drop-shadow" strokeWidth={2.4} />
        </button>

        <div className="flex items-center gap-1 md:gap-1.5 shrink-0">
          {slots.map((colorId, i) => (
            <button
              key={i}
              onClick={() => colorId && setColor(colorId)}
              disabled={!colorId}
              title={colorId ? getColor(colorId).name : "空"}
              aria-label={colorId ? `选择第 ${i + 1} 个最近色` : "空槽位"}
              className={`w-5 h-5 md:w-6 md:h-6 rounded-full transition-transform ${
                colorId ? "hover:scale-110" : "opacity-20 cursor-default"
              }`}
              style={colorId ? swatchStyle(getColor(colorId).base, colorId === currentColorId) : { background: "#e7e5e4" }}
            />
          ))}
        </div>

        <Divider />

        <button
          data-onboarding="eraser"
          onClick={() => setEraserToggle(!eraserToggle)}
          title="擦除模式(再次点击退出)"
          aria-label="擦除模式"
          aria-pressed={eraserToggle}
          className={`${btnBase} ${eraserToggle ? "bg-red-500 text-white shadow-md scale-105" : btnIdle}`}
        >
          <Eraser size={18} strokeWidth={2.2} />
        </button>

        <Divider />

        <button
          data-onboarding="undo"
          onClick={undo}
          disabled={!canUndo}
          title="撤销(Ctrl+Z)"
          aria-label="撤销"
          className={`${btnBase} ${canUndo ? btnIdle : btnDisabled}`}
        >
          <Undo2 size={18} strokeWidth={2.2} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="重做(Ctrl+Shift+Z)"
          aria-label="重做"
          className={`${btnBase} ${canRedo ? btnIdle : btnDisabled}`}
        >
          <Redo2 size={18} strokeWidth={2.2} />
        </button>
        <button
          onClick={() => setConfirmReset(true)}
          disabled={isEmpty}
          title="清空画布"
          aria-label="清空画布"
          className={`${btnBase} ${
            isEmpty ? btnDisabled : "text-stone-600 hover:bg-red-100 hover:text-red-600"
          }`}
        >
          <RotateCcw size={18} strokeWidth={2.2} />
        </button>

        {viewMode === "3d" && (
          <>
            <Divider />
            <button
              onClick={togglePreview}
              title={previewMode ? "退出预览" : "预览模式"}
              aria-label="预览模式"
              aria-pressed={previewMode}
              className={`${btnBase} ${previewMode ? btnActive : btnIdle}`}
            >
              <Eye size={18} strokeWidth={2.2} />
            </button>
          </>
        )}

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

      {paletteOpen && (
        <div ref={paletteRef}>
          <QuickPalette
            position={palettePos}
            currentColorId={currentColorId}
            onPick={(id) => setColor(id)}
            onClose={() => setPaletteOpen(false)}
          />
        </div>
      )}

      <Modal
        open={confirmReset}
        title="重置画布?"
        description="所有拼豆将被清空,但可以用撤销恢复。"
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
