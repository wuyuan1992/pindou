import { type CSSProperties, type ReactNode } from "react";
import { motion } from "motion/react";
import type { BeadColor } from "../types.ts";

interface BeadProps {
  color: BeadColor | null;
  size: number;
  animEnabled?: boolean;
  interactive?: boolean;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
      <div style={beadBodyStyle(color, size)}>
        <div style={highlightStyle(size)} />
        <div style={rimLightStyle(size)} />
      </div>
      <div style={pegHoleStyle(size)} />
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

function beadBodyStyle(color: BeadColor, size: number): CSSProperties {
  const beadSize = size * 0.84;
  const half = beadSize / 2;
  return {
    width: beadSize,
    height: beadSize,
    borderRadius: "50%",
    background: `radial-gradient(circle at 50% 42%,
      ${rgba(color.highlight, 0.85)} 0%,
      ${rgba(color.base, 0.78)} 38%,
      ${rgba(color.base, 0.62)} 62%,
      ${rgba(color.shadow, 0.7)} 100%)`,
    boxShadow: [
      "0 2.5px 3.5px rgba(0,0,0,0.28)",
      "inset 0 0 0 1.5px rgba(255,255,255,0.55)",
      "inset 0 1.5px 2px rgba(255,255,255,0.55)",
      "inset 0 -2px 2.5px rgba(0,0,0,0.3)",
      `inset 0 0 ${size * 0.18}px ${rgba(color.highlight, 0.35)}`,
    ].join(", "),
    position: "absolute",
    top: `calc(50% - ${half}px)`,
    left: `calc(50% - ${half}px)`,
  };
}

function pegHoleStyle(size: number): CSSProperties {
  const hole = size * 0.18;
  return {
    width: hole,
    height: hole,
    borderRadius: "50%",
    backgroundColor: "rgba(28, 18, 12, 0.78)",
    boxShadow: [
      "inset 0 1px 2px rgba(0,0,0,0.7)",
      "inset 0 -0.5px 0.5px rgba(255,255,255,0.18)",
      "0 0 0 1px rgba(255,255,255,0.35)",
    ].join(", "),
    position: "absolute",
    top: `calc(50% - ${hole / 2}px)`,
    left: `calc(50% - ${hole / 2}px)`,
    pointerEvents: "none",
    zIndex: 2,
  };
}

function highlightStyle(size: number): CSSProperties {
  return {
    width: size * 0.2,
    height: size * 0.13,
    borderRadius: "50%",
    background:
      "radial-gradient(ellipse at center, rgba(255,255,255,0.9), rgba(255,255,255,0) 70%)",
    position: "absolute",
    top: size * 0.13,
    left: size * 0.21,
    pointerEvents: "none",
    zIndex: 1,
  };
}

function rimLightStyle(size: number): CSSProperties {
  const beadSize = size * 0.84;
  return {
    width: beadSize,
    height: beadSize,
    borderRadius: "50%",
    background:
      "radial-gradient(circle at 50% 50%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.35) 78%, rgba(255,255,255,0) 88%)",
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 1,
  };
}
