import type { BeadColor } from "../types.ts";

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const hn = (((h % 360) + 360) % 360) / 360;
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;
  let r: number;
  let g: number;
  let b: number;
  if (sn === 0) {
    r = g = b = ln;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
    const p = 2 * ln - q;
    r = hue2rgb(p, q, hn + 1 / 3);
    g = hue2rgb(p, q, hn);
    b = hue2rgb(p, q, hn - 1 / 3);
  }
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function derive(base: string): { highlight: string; shadow: string; hue: number } {
  const [r, g, b] = hexToRgb(base);
  const [h, s, l] = rgbToHsl(r, g, b);
  if (l >= 92) {
    return {
      highlight: "#ffffff",
      shadow: hslToHex(h, Math.max(s - 10, 0), Math.max(l - 18, 72)),
      hue: h,
    };
  }
  if (l <= 8) {
    return {
      highlight: hslToHex(h, s, Math.min(l + 18, 28)),
      shadow: "#000000",
      hue: h,
    };
  }
  return {
    highlight: hslToHex(h, s, Math.min(l + 14, 90)),
    shadow: hslToHex(h, s, Math.max(l - 22, 10)),
    hue: h,
  };
}

// 真实拼豆色卡（参考 Perler / Artkal 主流色系，按色系分组）。
// 每个家族里颜色从浅到深排列，便于 UI 渲染时呈现自然渐变。
// ID = hex（小写），所有引用都以 hex 作为唯一 key。
export interface PaletteFamily {
  name: string;
  hexes: string[];
}

export const PALETTE_FAMILIES: PaletteFamily[] = [
  {
    name: "白灰",
    hexes: [
      "#ffffff",
      "#f4ecd8",
      "#e6dfc6",
      "#c8c2b5",
      "#9a9388",
      "#6e6960",
      "#44403a",
      "#26241f",
      "#000000",
    ],
  },
  {
    name: "黄",
    hexes: ["#ffee8a", "#ffd93d", "#f5a623", "#c88e0e", "#8a640c"],
  },
  {
    name: "橙",
    hexes: ["#ffb58a", "#ff8a3d", "#e5621e", "#a04515"],
  },
  {
    name: "红",
    hexes: ["#f7b5b5", "#e84747", "#c22727", "#8e1818", "#5a1010"],
  },
  {
    name: "粉",
    hexes: ["#ffc2d4", "#ff8fb0", "#e85a8a", "#a8336b"],
  },
  {
    name: "紫",
    hexes: ["#c9a0dc", "#9b6bb0", "#6b3a78", "#4a1e5c"],
  },
  {
    name: "蓝",
    hexes: ["#a8c8f0", "#6fa8dc", "#3a6fcf", "#1e45a4", "#18306b", "#0d1f4a"],
  },
  {
    name: "青",
    hexes: ["#7dd3d8", "#1b9aaa", "#0d6b7a"],
  },
  {
    name: "绿",
    hexes: ["#bfe39a", "#7fcb5a", "#3fa535", "#6b8e23", "#1e7a2f", "#124a1c"],
  },
  {
    name: "棕",
    hexes: ["#e5c77e", "#c9a66b", "#9b6b2c", "#6b381c", "#3d2010"],
  },
];

// 扁平化所有家族的 hex，用于量化、查最近色等场景。
export const PALETTE_HEX: string[] = PALETTE_FAMILIES.flatMap((f) => f.hexes);

// 旧 API 兼容（部分代码仍引用这些常量）。
export const PALETTE_BLACK = "#000000";
export const PALETTE_WHITE = "#ffffff";

function defineColor(hex: string): BeadColor {
  const { highlight, shadow, hue } = derive(hex);
  return {
    id: hex,
    slug: hex,
    name: hex,
    base: hex,
    highlight,
    shadow,
    hue,
  };
}

export const COLORS: BeadColor[] = PALETTE_HEX.map(defineColor);

export const COLOR_MAP: Record<string, BeadColor> = Object.fromEntries(
  COLORS.map((c) => [c.id, c])
);

export const COLOR_BY_SLUG: Record<string, BeadColor> = COLOR_MAP;

// 默认色：中等明度的红色（#e84747），适合做初始笔触。
export const DEFAULT_COLOR_ID = "#e84747";

// 用 redmean 距离在 PALETTE_HEX 中找最接近的 hex。用于把任意 hex
// （比如旧模板里的非网格色、或导入图片的原始像素）映射到当前调色板。
const PALETTE_RGB: ReadonlyArray<readonly [number, number, number, string]> =
  PALETTE_HEX.map((hex) => {
    const [r, g, b] = hexToRgb(hex);
    return [r, g, b, hex] as const;
  });

export function findClosestPaletteHex(hex: string): string {
  const [r1, g1, b1] = hexToRgb(hex);
  let best = PALETTE_RGB[0][3];
  let bestDist = Infinity;
  for (const [r2, g2, b2, candidate] of PALETTE_RGB) {
    const rmean = (r1 + r2) / 2;
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    const d =
      ((512 + rmean) * dr * dr) / 256 +
      4 * dg * dg +
      ((767 - rmean) * db * db) / 256;
    if (d < bestDist) {
      bestDist = d;
      best = candidate;
    }
  }
  return best;
}

// 兜底查询：调色板换过之后，localStorage 里可能残留旧 hex ID。
// 直接 COLOR_MAP[id] 查不到就退回到最近色，保证渲染不崩。
export function getColor(id: string): BeadColor {
  return COLOR_MAP[id] ?? COLOR_MAP[findClosestPaletteHex(id)];
}
