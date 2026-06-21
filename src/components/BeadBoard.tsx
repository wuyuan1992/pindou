import {
  type CSSProperties,
  forwardRef,
  useCallback,
  useState,
} from "react";
import { useBeadStore } from "../store/useBeadStore.ts";
import { COLOR_MAP } from "../data/colors.ts";
import { Bead } from "./Bead.tsx";
import { useDrawing } from "../hooks/useDrawing.ts";
import { QuickPalette } from "./QuickPalette.tsx";

interface BeadBoardProps {
  beadSize?: number;
  exporting?: boolean;
  onPainted?: (colorId: string) => void;
}

export const BeadBoard = forwardRef<HTMLDivElement, BeadBoardProps>(
  function BeadBoard({ beadSize = 28, exporting = false, onPainted }, ref) {
    const grid = useBeadStore((s) => s.grid);
    const cols = useBeadStore((s) => s.cols);
    const rows = useBeadStore((s) => s.rows);
    const currentColorId = useBeadStore((s) => s.currentColorId);
    const setColor = useBeadStore((s) => s.setColor);
    const drawing = useDrawing({ onPainted });

    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
    const [palettePos, setPalettePos] = useState<{ x: number; y: number } | null>(
      null
    );

    const previewColor =
      hoveredIdx !== null ? COLOR_MAP[currentColorId] : null;

    const onContextMenu = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        setPalettePos({ x: e.clientX, y: e.clientY });
      },
      []
    );

    const boardStyle: CSSProperties = {
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, ${beadSize}px)`,
      gridTemplateRows: `repeat(${rows}, ${beadSize}px)`,
      background: "linear-gradient(135deg, #f4ecd8 0%, #ebdfbf 100%)",
      borderRadius: 12,
      padding: beadSize * 0.4,
      boxShadow: [
        "inset 0 2px 8px rgba(80, 60, 30, 0.18)",
        "0 8px 24px rgba(80, 60, 30, 0.15)",
      ].join(", "),
      userSelect: "none",
      touchAction: "none",
    };

    return (
      <>
        <div ref={ref} style={boardStyle} data-export-root onContextMenu={onContextMenu}>
          {grid.map((colorId, idx) => {
            const color = colorId ? COLOR_MAP[colorId] : null;
            const isHovered = hoveredIdx === idx;
            return (
              <div
                key={idx}
                data-cell-idx={idx}
                data-cell
                onMouseDown={(e) => {
                  if (e.button === 2) return;
                  e.preventDefault();
                  drawing.onCellDown(idx);
                }}
                onMouseEnter={() => {
                  setHoveredIdx(idx);
                  drawing.onCellEnter(idx);
                }}
                onMouseLeave={() => {
                  setHoveredIdx((cur) => (cur === idx ? null : cur));
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  drawing.onCellDown(idx);
                }}
                onTouchMove={drawing.onTouchMove}
                style={{ width: beadSize, height: beadSize, position: "relative" }}
              >
                <Bead color={color} size={beadSize} animEnabled={!exporting} />
                {isHovered && previewColor && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      pointerEvents: "none",
                      opacity: 0.55,
                    }}
                  >
                    <Bead
                      color={previewColor}
                      size={beadSize}
                      animEnabled={false}
                      interactive={false}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

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
