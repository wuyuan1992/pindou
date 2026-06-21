import { useRef, useState, useCallback } from "react";
import { BeadBoard } from "./components/BeadBoard.tsx";
import { Toolbar } from "./components/Toolbar.tsx";
import { ColorPalette } from "./components/ColorPalette.tsx";
import { TemplateGallery } from "./components/TemplateGallery.tsx";
import { exportBoardAsPng } from "./lib/exporter.ts";
import { useSound } from "./hooks/useSound.ts";
import { COLOR_MAP } from "./data/colors.ts";

export default function App() {
  const boardRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { playTick } = useSound({ muted });

  const onPainted = useCallback(
    (colorId: string) => {
      const color = COLOR_MAP[colorId];
      if (color) playTick(color.hue);
    },
    [playTick]
  );

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      <div className="max-w-7xl mx-auto px-4 py-6 lg:px-8 lg:py-10">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-stone-800 flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-rose-500 shadow-sm" />
              <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-sm -ml-1.5" />
              <span className="inline-block w-3 h-3 rounded-full bg-emerald-400 shadow-sm -ml-1.5" />
              <span className="ml-2">拼豆工作室</span>
            </h1>
            <p className="text-stone-500 text-sm mt-1">
              选颜色，点格子，拖动连续绘制 · 完成后导出 PNG
            </p>
          </div>
          <Toolbar
            onExport={handleExport}
            onToggleMute={() => setMuted((m) => !m)}
            muted={muted}
            exporting={exporting}
          />
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-[260px_1fr_220px] gap-4 lg:gap-6">
          <aside className="order-2 lg:order-1">
            <ColorPalette />
          </aside>

          <section className="order-1 lg:order-2 flex justify-center">
            <div className="relative">
              <BeadBoard
                ref={boardRef}
                beadSize={26}
                exporting={exporting}
                onPainted={onPainted}
              />
            </div>
          </section>

          <aside className="order-3">
            <TemplateGallery />
          </aside>
        </main>

        <footer className="mt-8 text-center text-xs text-stone-400">
          <p>
            按住鼠标拖动连续绘制 · 右键/长按可触屏 · 撤销按整个笔画回退
          </p>
        </footer>
      </div>
    </div>
  );
}
