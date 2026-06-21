import { type CSSProperties, forwardRef } from "react";
import { useBeadStore } from "../store/useBeadStore.ts";
import { COLOR_MAP } from "../data/colors.ts";
import { Bead } from "./Bead.tsx";
import { useDrawing } from "../hooks/useDrawing.ts";

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
    const drawing = useDrawing({ onPainted });

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
      <div ref={ref} style={boardStyle} data-export-root>
        {grid.map((colorId, idx) => {
          const color = colorId ? COLOR_MAP[colorId] : null;
          return (
            <div
              key={idx}
              data-cell-idx={idx}
              data-cell
              onMouseDown={(e) => {
                e.preventDefault();
                drawing.onCellDown(idx);
              }}
              onMouseEnter={() => drawing.onCellEnter(idx)}
              onTouchStart={(e) => {
                e.preventDefault();
                drawing.onCellDown(idx);
              }}
              onTouchMove={drawing.onTouchMove}
              style={{ width: beadSize, height: beadSize, position: "relative" }}
            >
              <Bead color={color} size={beadSize} animEnabled={!exporting} />
            </div>
          );
        })}
      </div>
    );
  }
);
