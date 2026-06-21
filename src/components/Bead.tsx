import { type CSSProperties, type ReactNode } from "react";
import { motion } from "motion/react";
import type { BeadColor } from "../types.ts";

interface BeadProps {
  color: BeadColor | null;
  size: number;
  animEnabled?: boolean;
  interactive?: boolean;
}

export function Bead({
  color,
  size,
  animEnabled = true,
  interactive = true,
}: BeadProps) {
  const cellStyle: CSSProperties = {
    width: size,
    height: size,
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  if (!color) {
    return (
      <div style={cellStyle}>
        <div style={pegHoleStyle(size)} />
      </div>
    );
  }

  const inner: ReactNode = (
    <>
      <div style={pegHoleStyle(size)} />
      <div style={beadBodyStyle(color, size)}>
        <div style={highlightStyle(size)} />
      </div>
    </>
  );

  if (animEnabled && interactive) {
    return (
      <div style={cellStyle}>
        <motion.div
          style={wrapperStyle}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.93 }}
          transition={{ duration: 0.08 }}
        >
          {inner}
        </motion.div>
      </div>
    );
  }

  return (
    <div style={cellStyle}>
      <div style={wrapperStyle}>{inner}</div>
    </div>
  );
}

const wrapperStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

function pegHoleStyle(size: number): CSSProperties {
  return {
    width: size * 0.18,
    height: size * 0.18,
    borderRadius: "50%",
    backgroundColor: "rgba(60, 40, 20, 0.35)",
    boxShadow: "inset 0 1px 1.5px rgba(0,0,0,0.4)",
    position: "absolute",
  };
}

function beadBodyStyle(color: BeadColor, size: number): CSSProperties {
  const beadSize = size * 0.84;
  return {
    width: beadSize,
    height: beadSize,
    borderRadius: "50%",
    background: `radial-gradient(circle at 32% 28%, ${color.highlight} 0%, ${color.base} 45%, ${color.shadow} 100%)`,
    boxShadow: [
      "0 1.5px 2.5px rgba(0,0,0,0.3)",
      "inset 0 -2px 3px rgba(0,0,0,0.22)",
      "inset 0 1px 1.5px rgba(255,255,255,0.4)",
    ].join(", "),
    position: "absolute",
  };
}

function highlightStyle(size: number): CSSProperties {
  return {
    width: size * 0.22,
    height: size * 0.15,
    borderRadius: "50%",
    background:
      "radial-gradient(ellipse at center, rgba(255,255,255,0.65), rgba(255,255,255,0) 70%)",
    position: "absolute",
    top: size * 0.14,
    left: size * 0.2,
    pointerEvents: "none",
  };
}
