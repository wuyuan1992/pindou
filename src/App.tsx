import { useRef, useState, useCallback, useEffect } from "react";
import { BeadBoard } from "./components/BeadBoard.tsx";
import { Toolbar } from "./components/Toolbar.tsx";
import { TemplateGallery } from "./components/TemplateGallery.tsx";
import { exportBoardAsPng, exportGridAsPng } from "./lib/exporter.ts";
import { imageFileToTemplate } from "./lib/imageImport.ts";
import { useBeadStore } from "./store/useBeadStore.ts";
import { useLayoutStore } from "./store/useLayoutStore.ts";
import { useSound } from "./hooks/useSound.ts";
import { useIsMobile } from "./hooks/useMediaQuery.ts";
import { getColor } from "./data/colors.ts";
import { PindouCanvas } from "./three/PindouCanvas.tsx";

type ViewMode = "2d" | "3d";

const FLAT_CELL_SIZE = 32;
const DEFAULT_BEAD_SIZE = 13;
const MIN_BEAD_SIZE = 6;

export default function App() {
  const boardRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [muted, setMuted] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingFlat, setExportingFlat] = useState(false);
  const [importing, setImporting] = useState(false);
  const [mode, setMode] = useState<ViewMode>("3d");
  const [beadSize, setBeadSize] = useState(DEFAULT_BEAD_SIZE);
  const isMobile = useIsMobile();

  // 2D 画布 beadSize 自适应：测量可用宽度，按 cols 等分，夹在 [MIN, DEFAULT]。
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const compute = () => {
      const cols = useBeadStore.getState().cols;
      const w = el.clientWidth;
      // 减去左右内边距余量，再除以列数
      const size = Math.floor((w - 32) / cols);
      setBeadSize(Math.max(MIN_BEAD_SIZE, Math.min(DEFAULT_BEAD_SIZE, size)));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { playTick, playPlace, playGrab, playRemove } = useSound({ muted });

  const onPainted = useCallback(
    (colorId: string) => {
      playTick(getColor(colorId).hue);
    },
    [playTick]
  );

  const onPlace3D = useCallback(
    (colorId: string) => {
      playPlace(getColor(colorId).hue);
    },
    [playPlace]
  );

  const onPick3D = useCallback(() => {
    playGrab();
  }, [playGrab]);

  const onPickBead3D = useCallback(() => {
    playGrab();
  }, [playGrab]);

  const onTrayDrop3D = useCallback(() => {
    playPlace(220);
  }, [playPlace]);

  const onTrayPick3D = useCallback(() => {
    playGrab();
  }, [playGrab]);

  const onErase3D = useCallback(() => {
    playRemove();
  }, [playRemove]);

  const handleExport = useCallback(async () => {
    if (!boardRef.current || exporting) return;
    setExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 60));
      await exportBoardAsPng(boardRef.current, "pindou-art");
    } catch (err) {
      console.error("导出失败", err);
      alert("导出失败：" + (err as Error).message);
    } finally {
      setExporting(false);
    }
  }, [exporting]);

  const handleExportFlat = useCallback(() => {
    if (exportingFlat) return;
    const { grid, cols, rows } = useBeadStore.getState();
    if (grid.every((c) => c === null)) {
      alert("画布是空的，先画点什么吧");
      return;
    }
    setExportingFlat(true);
    try {
      exportGridAsPng(grid, cols, rows, "pindou-flat", FLAT_CELL_SIZE);
    } catch (err) {
      console.error("导出失败", err);
      alert("导出失败：" + (err as Error).message);
    } finally {
      setExportingFlat(false);
    }
  }, [exportingFlat]);

  const handleImportImage = useCallback(() => {
    if (importing) return;
    fileInputRef.current?.click();
  }, [importing]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        alert("请选择图片文件");
        return;
      }
      setImporting(true);
      try {
        const { cols, rows, loadTemplate } = useBeadStore.getState();
        const tpl = await imageFileToTemplate(file, cols, rows, {
          ignoreNearWhite: true,
        });
        loadTemplate(tpl);
      } catch (err) {
        console.error("图片转换失败", err);
        alert("图片转换失败：" + (err as Error).message);
      } finally {
        setImporting(false);
      }
    },
    []
  );

  return (
    <div className="min-h-screen md:min-h-screen h-[100dvh] md:h-auto overflow-hidden md:overflow-auto bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-stone-800 focus:rounded focus:shadow-lg"
      >
        跳到主要内容
      </a>
      <div className="max-w-7xl mx-auto px-3 py-3 md:px-8 md:py-10 lg:pb-16">
        <header className="relative z-20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3 md:mb-6">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-stone-800 flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-rose-500 shadow-sm" />
              <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-sm -ml-1.5" />
              <span className="inline-block w-3 h-3 rounded-full bg-emerald-400 shadow-sm -ml-1.5" />
              <span className="ml-2">拼豆</span>
            </h1>
            <p className="text-stone-500 text-xs md:text-sm mt-1 truncate">
              在线拼豆画 / 3D 像素画创作工具 · 图片一键转拼豆图案
            </p>
          </div>
          <div className="hidden md:flex items-center gap-1 flex-wrap">
            <Toolbar
              onExport={handleExport}
              onExportFlat={handleExportFlat}
              onImportImage={handleImportImage}
              onToggleMute={() => setMuted((m) => !m)}
              muted={muted}
              exporting={exporting}
              exportingFlat={exportingFlat}
              importing={importing}
            />
            <TemplateGallery />
          </div>
        </header>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <main id="main" className="flex flex-col items-center gap-3">
          <div
            role="tablist"
            aria-label="视图模式"
            className="inline-flex p-1 rounded-lg bg-white/70 border border-amber-100 shadow-sm"
          >
            <button
              role="tab"
              aria-selected={mode === "2d"}
              onClick={() => setMode("2d")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === "2d"
                  ? "bg-amber-500 text-white shadow"
                  : "text-stone-600 hover:text-amber-700"
              }`}
            >
              2D 平面
            </button>
            <button
              role="tab"
              aria-selected={mode === "3d"}
              onClick={() => setMode("3d")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === "3d"
                  ? "bg-amber-500 text-white shadow"
                  : "text-stone-600 hover:text-amber-700"
              }`}
            >
              3D 拟物
            </button>
          </div>

          <div ref={measureRef} className="w-full flex justify-center">
            {mode === "2d" && (
              <div
                ref={boardRef}
                className="relative max-w-full"
                style={{ overflowX: "auto" }}
              >
                <BeadBoard
                  beadSize={beadSize}
                  exporting={exporting}
                  onPainted={onPainted}
                />
              </div>
            )}

            {mode === "3d" && (
              <div
                aria-label="拼豆 3D 创作画布"
                style={{
                  cursor: isMobile ? "auto" : "none",
                }}
                className="w-full max-w-[900px] h-[58vh] md:h-[600px] aspect-[3/2] rounded-xl overflow-hidden border border-amber-200/60 shadow-lg bg-[#f7eed8]"
              >
                <PindouCanvas
                  dpr={isMobile ? [1, 1.5] : [1, 1.75]}
                  onPlace={onPlace3D}
                  onPick={onPick3D}
                  onErase={onErase3D}
                  onPickBead={onPickBead3D}
                  onTrayDrop={onTrayDrop3D}
                  onTrayPick={onTrayPick3D}
                />
              </div>
            )}
          </div>

          {mode === "3d" && <PreviewToggleButton />}

          <footer className="hidden md:block mt-8 text-center text-xs text-stone-400 space-y-1">
            <p>
              2D 拼豆画：按住鼠标拖动连续绘制 · 右键唤出调色板快速换色 · hover 预览当前颜色
            </p>
            <p>
              3D 拟物拼豆：左侧容器取豆入栈 · peg 上放下/拾取 · 右侧托盘右键扔下/左键拾取 · 长按连续
            </p>
            <p className="pt-2 text-stone-400">
              拼豆 Pindou — 免费在线拼豆 / 像素画制作工具（Perler beads · fuse beads · pixel art maker）
            </p>
          </footer>

          <p className="md:hidden text-center text-[11px] text-stone-400 px-4">
            长按 = 3D 擦除/扔豆 · 2D 唤出调色板
          </p>
        </main>
      </div>

      {/* 移动端底部固定工具栏 */}
      <MobileToolbar
        onExport={handleExport}
        onExportFlat={handleExportFlat}
        onImportImage={handleImportImage}
        onToggleMute={() => setMuted((m) => !m)}
        muted={muted}
        exporting={exporting}
        exportingFlat={exportingFlat}
        importing={importing}
      />
    </div>
  );
}

function PreviewToggleButton() {
  const previewMode = useLayoutStore((s) => s.previewMode);
  const togglePreview = useLayoutStore((s) => s.togglePreview);
  return (
    <button
      onClick={togglePreview}
      className={`md:hidden fixed right-3 bottom-20 z-30 px-3 py-2 rounded-full text-xs font-medium shadow-lg transition-colors ${
        previewMode
          ? "bg-amber-500 text-white"
          : "bg-white/90 text-stone-700 border border-amber-200"
      }`}
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      {previewMode ? "退出预览" : "预览"}
    </button>
  );
}

function MobileToolbar(props: React.ComponentProps<typeof Toolbar>) {
  return (
    <div
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-amber-100 shadow-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center gap-1 px-2 py-2 overflow-x-auto">
        <Toolbar {...props} />
        <TemplateGallery />
      </div>
    </div>
  );
}
