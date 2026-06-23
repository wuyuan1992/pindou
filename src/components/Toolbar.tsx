import { useRef, useState } from "react";
import {
  Download,
  Upload,
  Grid3x3,
  Box,
} from "lucide-react";
import { useBeadStore } from "../store/useBeadStore.ts";
import { useClickOutside } from "../hooks/useClickOutside.ts";

const btnBase =
  "w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg transition-all shrink-0";
const btnIdle = "text-stone-600 hover:bg-amber-100";
const btnActive = "bg-amber-500 text-white shadow-md scale-105";
const btnDisabled = "opacity-30 hover:bg-transparent";

const cardClass =
  "flex items-center gap-0.5 md:gap-1 bg-white/95 rounded-xl p-1.5 shadow-sm border border-amber-100 flex-nowrap shrink-0";

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
