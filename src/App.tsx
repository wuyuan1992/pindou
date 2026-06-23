import { useRef, useState, useCallback, useEffect } from "react";
import { BeadBoard } from "./components/BeadBoard.tsx";
import { ViewModeTab, FileToolbar, EditToolbar } from "./components/Toolbar.tsx";
import { TemplateGallery } from "./components/TemplateGallery.tsx";
import { Modal } from "./components/Modal.tsx";
import { exportBoardAsPng, exportGridAsPng } from "./lib/exporter.ts";
import { imageFileToTemplate } from "./lib/imageImport.ts";
import { useBeadStore } from "./store/useBeadStore.ts";
import { useLayoutStore } from "./store/useLayoutStore.ts";
import { useSound } from "./hooks/useSound.ts";
import { useIsMobile } from "./hooks/useMediaQuery.ts";
import { getColor } from "./data/colors.ts";
import { PindouCanvas } from "./three/PindouCanvas.tsx";
import { StoreLocation } from "./components/StoreLocation.tsx";

type ViewMode = "2d" | "3d";

const FLAT_CELL_SIZE = 32;
const DEFAULT_BEAD_SIZE = 24;
const MIN_BEAD_SIZE = 6;

export default function App() {
  const boardRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [muted, setMuted] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingFlat, setExportingFlat] = useState(false);
  const [importing, setImporting] = useState(false);
  const [mode, setMode] = useState<ViewMode>("2d");
  const [beadSize, setBeadSize] = useState(DEFAULT_BEAD_SIZE);
  const [notice, setNotice] = useState<string | null>(null);
  const [storeOpen, setStoreOpen] = useState(false);
  const isMobile = useIsMobile();

  // 2D 画布 beadSize 自适应：按容器较小边等比例缩放，画板（含 padding）刚好填满容器。
  // pad = beadSize * 0.4 两侧共 0.8，所以画板占 beadSize * (cols + 0.8)。
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const compute = () => {
      const { cols, rows } = useBeadStore.getState();
      const w = el.clientWidth;
      const h = el.clientHeight;
      const size = Math.floor(
        Math.min((w - 16) / (cols + 0.8), (h - 16) / (rows + 0.8))
      );
      setBeadSize(Math.max(MIN_BEAD_SIZE, size));
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
      setNotice("导出失败：" + (err as Error).message);
    } finally {
      setExporting(false);
    }
  }, [exporting]);

  const handleExportFlat = useCallback(() => {
    if (exportingFlat) return;
    const { grid, cols, rows } = useBeadStore.getState();
    if (grid.every((c) => c === null)) {
      setNotice("画布是空的，先画点什么吧");
      return;
    }
    setExportingFlat(true);
    try {
      exportGridAsPng(grid, cols, rows, "pindou-flat", FLAT_CELL_SIZE);
    } catch (err) {
      console.error("导出失败", err);
      setNotice("导出失败：" + (err as Error).message);
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
        setNotice("请选择图片文件");
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
        setNotice("图片转换失败：" + (err as Error).message);
      } finally {
        setImporting(false);
      }
    },
    []
  );

  return (
    <div className="h-[100dvh] md:h-auto md:min-h-screen flex flex-col overflow-hidden md:overflow-auto bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-stone-800 focus:rounded focus:shadow-lg"
      >
        跳到主要内容
      </a>
      <div className="flex-1 w-full max-w-7xl mx-auto px-2 py-2 md:px-8 md:py-6 flex flex-col min-h-0">
        <header className="relative z-20 flex items-center justify-between gap-3 mb-2 md:mb-3">
          <div className="min-w-0">
            <h1 className="text-base md:text-2xl lg:text-3xl font-bold text-stone-800 flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-rose-500 shadow-sm" />
              <span className="inline-block w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-amber-400 shadow-sm -ml-1.5" />
              <span className="inline-block w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-emerald-400 shadow-sm -ml-1.5" />
              <span className="ml-1.5 md:ml-2">拼豆</span>
            </h1>
            <p className="hidden md:block text-stone-500 text-xs md:text-sm mt-1 truncate">
              在线拼豆画 / 3D 像素画创作工具 · 图片一键转拼豆图案
            </p>
          </div>
          <StoreLocation onOpenChange={setStoreOpen} />
        </header>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* 画板上方：左 2D/3D 切换 + 右 导入/导出/模板 */}
        <div className="flex items-center justify-between gap-2 mb-2 md:mb-3 shrink-0">
          <ViewModeTab mode={mode} onModeChange={setMode} />
          <FileToolbar
            onExport={handleExport}
            onExportFlat={handleExportFlat}
            onImportImage={handleImportImage}
            exporting={exporting}
            exportingFlat={exportingFlat}
            importing={importing}
          >
            <TemplateGallery />
          </FileToolbar>
        </div>

        <main id="main" className="flex-1 min-h-0 pb-20 md:pb-15 grid items-stretch">
          <div ref={measureRef} className="w-full h-full flex justify-center items-center min-h-full max-h-full">
            {mode === "2d" && (
              <div
                ref={boardRef}
                className="relative max-w-full max-h-full"
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
                className="w-full h-full md:h-[600px] md:max-w-[1216px] rounded-xl overflow-hidden border border-amber-200/60 shadow-lg bg-[#f7eed8]"
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
        </main>
      </div>

      {/* 画板下方：编辑 + 历史/重置 + 静音（门店弹窗打开时隐藏） */}
      <div
        className={`fixed bottom-0 inset-x-0 z-40 ${storeOpen ? "hidden" : ""}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <EditToolbar muted={muted} onToggleMute={() => setMuted((m) => !m)} />
      </div>

      {mode === "3d" && !storeOpen && <PreviewToggleButton />}

      <Modal
        open={notice !== null}
        mode="alert"
        title="提示"
        description={notice ?? ""}
        confirmText="知道了"
        onConfirm={() => setNotice(null)}
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
      className={`md:hidden fixed right-3 bottom-24 z-30 px-3 py-2 rounded-full text-xs font-medium shadow-lg transition-colors ${
        previewMode
          ? "bg-amber-500 text-white"
          : "bg-white/90 text-stone-700 border border-amber-200"
      }`}
    >
      {previewMode ? "退出预览" : "预览"}
    </button>
  );
}
