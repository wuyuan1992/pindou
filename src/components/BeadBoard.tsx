import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { useBeadStore } from "../store/useBeadStore.ts";
import { useDrawing } from "../hooks/useDrawing.ts";
import { QuickPalette } from "./QuickPalette.tsx";
import { BeadCanvas, type BeadCanvasHandle } from "./BeadCanvas.tsx";

interface BeadBoardProps {
  beadSize?: number;
  exporting?: boolean;
  onPainted?: (colorId: string) => void;
}

export const BeadBoard = forwardRef<HTMLDivElement, BeadBoardProps>(
  function BeadBoard({ beadSize = 28, exporting = false, onPainted }, ref) {
    const currentColorId = useBeadStore((s) => s.currentColorId);
    const setColor = useBeadStore((s) => s.setColor);
    const drawing = useDrawing({ onPainted });

    const [palettePos, setPalettePos] = useState<{ x: number; y: number } | null>(
      null
    );

    const canvasHandleRef = useRef<BeadCanvasHandle>(null);

    // 保持 forwardRef 签名兼容；App.tsx 实际未通过此 ref 取 DOM。
    useImperativeHandle(ref, () => null as unknown as HTMLDivElement, []);

    const onContextMenu = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      setPalettePos({ x: e.clientX, y: e.clientY });
    }, []);

    const onLongPress = useCallback((x: number, y: number) => {
      setPalettePos({ x, y });
    }, []);

    return (
      <>
        <BeadCanvas
          ref={canvasHandleRef}
          beadSize={beadSize}
          exporting={exporting}
          onCellDown={(idx) => drawing.onCellDown(idx)}
          onCellEnter={(idx) => drawing.onCellEnter(idx)}
          onTouchHit={(idx) => drawing.onTouchHit(idx)}
          onContextMenu={onContextMenu}
          onLongPress={onLongPress}
        />

        {palettePos && (
          <QuickPalette
            position={palettePos}
            currentColorId={currentColorId}
            onPick={(id) => setColor(id)}
            onClose={() => setPalettePos(null)}
          />
        )}
      </>
    );
  }
);
