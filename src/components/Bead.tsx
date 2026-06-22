import { type CSSProperties, type ReactNode } from "react";
import { motion } from "motion/react";
import type { BeadColor } from "../types.ts";

interface BeadProps {
  color: BeadColor | null;
  size: number;
  animEnabled?: boolean;
  interactive?: boolean;
}

// 2D 渲染按 3D 实际渲染效果对齐（src/three/constants.ts + materials.ts + 相机透视）：
//   - 豆子顶面外缘 = BEAD_OUTER_R + bevelSize = 0.16，cell pitch = 0.32
//     → 视觉直径接近一格，相邻豆子几乎相切
//   - 孔几何 = BEAD_INNER_R = 0.05，但孔四周 bevel 反光把视觉孔收窄
//     → 视觉孔直径约为豆子直径的 0.32
//   - 材质 = MeshPhysicalMaterial(transmission + clearcoat + iridescence)
//     → 主色就是 base，高光来自 clearcoat 反射（不是分段渐变）
//   - 倒角 = bevelSize 0.06，在豆子顶面外缘形成亮环
const BEAD_TO_CELL = 0.92; // 视觉接近相切，留一丝缝隙避免糊在一起
const HOLE_TO_BEAD = 0.22; // 毛玻璃柱子顶面，比真实孔收窄，看起来像小柱子

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
        <div style={rimLightStyle(size)} />
        <div style={highlightStyle(size)} />
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
  const beadSize = size * BEAD_TO_CELL;
  const half = beadSize / 2;
  // 3D 玻璃材质的主色就是 base，highlight/shadow 只是球面光照结果。
  // 这里以 base 为主，只在受光面微微提亮、背光面微微压暗，避免廉价分段渐变。
  return {
    width: beadSize,
    height: beadSize,
    borderRadius: "50%",
    background: `radial-gradient(circle at 38% 32%,
      ${rgba(color.highlight, 0.55)} 0%,
      ${rgba(color.base, 1)} 38%,
      ${rgba(color.base, 1)} 70%,
      ${rgba(color.shadow, 0.85)} 100%)`,
    boxShadow: [
      // 豆子高出板面（BEAD_HEIGHT=0.8）的落地投影
      "0 1.5px 2.5px rgba(0,0,0,0.32)",
      // 顶部倒角受光（clearcoat 在斜面反光）
      "inset 0 1px 1.2px rgba(255,255,255,0.9)",
      // 底部倒角背光
      "inset 0 -1.2px 1.8px rgba(0,0,0,0.35)",
      // 玻璃内透光（attenuationColor 效果）
      `inset 0 0 ${beadSize * 0.25}px ${rgba(color.highlight, 0.22)}`,
    ].join(", "),
    position: "absolute",
    top: `calc(50% - ${half}px)`,
    left: `calc(50% - ${half}px)`,
  };
}

function pegHoleStyle(size: number): CSSProperties {
  const hole = size * BEAD_TO_CELL * HOLE_TO_BEAD;
  return {
    width: hole,
    height: hole,
    borderRadius: "50%",
    // 毛玻璃柱子顶面：磨砂散射的柔和亮面，顶部受光、底部微暗
    background: `radial-gradient(circle at 50% 35%,
      rgba(255,255,255,0.78) 0%,
      rgba(244,244,246,0.52) 45%,
      rgba(198,198,205,0.38) 100%)`,
    boxShadow: [
      // 柱顶细亮边（磨砂面的高光）
      "inset 0 0.5px 0.7px rgba(255,255,255,0.85)",
      // 柱底微阴影，撑出柱体立体感
      "inset 0 -0.5px 0.8px rgba(0,0,0,0.18)",
      // 外缘磨砂散射光晕
      "0 0 1.4px rgba(255,255,255,0.5)",
    ].join(", "),
    backdropFilter: "blur(1.5px)",
    WebkitBackdropFilter: "blur(1.5px)",
    position: "absolute",
    top: `calc(50% - ${hole / 2}px)`,
    left: `calc(50% - ${hole / 2}px)`,
    pointerEvents: "none",
    zIndex: 2,
  };
}

function highlightStyle(size: number): CSSProperties {
  // 镜面高光：3D 里 clearcoat 在最顶处形成小而亮的反光点。
  const beadSize = size * BEAD_TO_CELL;
  const w = beadSize * 0.3;
  const h = beadSize * 0.2;
  return {
    width: w,
    height: h,
    borderRadius: "50%",
    background:
      "radial-gradient(ellipse at center, rgba(255,255,255,0.95), rgba(255,255,255,0) 70%)",
    position: "absolute",
    top: beadSize * 0.16,
    left: beadSize * 0.22,
    pointerEvents: "none",
    zIndex: 1,
  };
}

function rimLightStyle(size: number): CSSProperties {
  // 倒角亮环：3D 的 bevelSize=0.06 在顶面外缘 0.06/0.16 ≈ 37.5% 宽度处形成亮环。
  // 这里从 78% 位置开始起亮，92% 处达到最亮，再快速衰减，模拟外圈细亮环。
  const beadSize = size * BEAD_TO_CELL;
  return {
    width: beadSize,
    height: beadSize,
    borderRadius: "50%",
    background: `radial-gradient(circle at 50% 50%,
      rgba(255,255,255,0) 78%,
      rgba(255,255,255,0.6) 92%,
      rgba(255,255,255,0) 100%)`,
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 1,
  };
}
