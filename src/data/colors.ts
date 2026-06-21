import type { BeadColor } from "../types.ts";
import { deterministicUuid } from "../lib/uuid.ts";

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

function defineColor(slug: string, name: string, base: string): BeadColor {
  const { highlight, shadow, hue } = derive(base);
  return {
    id: deterministicUuid("color", slug),
    slug,
    name,
    base,
    highlight,
    shadow,
    hue,
  };
}

export const COLORS: BeadColor[] = [
  // 红粉 (8): 从浅粉到深酒红
  defineColor("blush", "腮红粉", "#ffd9e0"),
  defineColor("sakura", "樱花粉", "#ffb3c6"),
  defineColor("coral", "珊瑚粉", "#ff8fa3"),
  defineColor("rose", "玫瑰", "#ff5d8f"),
  defineColor("hotpink", "热粉", "#ff2d7a"),
  defineColor("crimson", "绯红", "#e0144d"),
  defineColor("cherry", "樱桃红", "#c8102e"),
  defineColor("wine", "酒红", "#7a1c2f"),

  // 橙黄 (8): 从奶黄到锈橙
  defineColor("cream", "奶油", "#fff1c2"),
  defineColor("butter", "黄油", "#ffe082"),
  defineColor("lemon", "柠檬", "#ffd60a"),
  defineColor("honey", "蜂蜜", "#f6a800"),
  defineColor("amber", "琥珀", "#ed7e00"),
  defineColor("tangerine", "橘红", "#ff6b1c"),
  defineColor("pumpkin", "南瓜", "#d84315"),
  defineColor("terracotta", "陶土", "#a8391a"),

  // 绿青 (8): 从薄荷到深松
  defineColor("mintcream", "薄荷霜", "#d4f5e0"),
  defineColor("mint", "薄荷", "#9be3b8"),
  defineColor("pistachio", "开心果", "#7ed9a3"),
  defineColor("lime", "青柠", "#a3e635"),
  defineColor("emerald", "翡翠", "#10b981"),
  defineColor("forest", "森林", "#0d7a4f"),
  defineColor("teal", "青绿", "#0f9b8e"),
  defineColor("pine", "深松", "#0a4f3f"),

  // 蓝紫 (8): 从天空到深紫
  defineColor("skycream", "天空霜", "#d9efff"),
  defineColor("sky", "天空", "#8ecaff"),
  defineColor("azure", "蔚蓝", "#3da9fc"),
  defineColor("cobalt", "钴蓝", "#1c6dd0"),
  defineColor("sapphire", "宝蓝", "#0c2d8a"),
  defineColor("lavender", "薰衣草", "#c8b6ff"),
  defineColor("violet", "紫罗兰", "#8b5cf6"),
  defineColor("indigo", "靛青", "#3a1f8a"),

  // 中性 (8): 从象牙到炭黑
  defineColor("ivory", "象牙", "#faf6ec"),
  defineColor("sand", "沙色", "#e8d5a8"),
  defineColor("taupe", "灰褐", "#b8a888"),
  defineColor("stone", "石灰", "#8a8a85"),
  defineColor("graphite", "石墨", "#4a4a48"),
  defineColor("espresso", "咖啡", "#3a2a20"),
  defineColor("chocolate", "巧克力", "#241814"),
  defineColor("onyx", "玛瑙黑", "#0e0e10"),
];

export interface ColorGroup {
  name: string;
  slugs: string[];
}

export const COLOR_GROUPS: ColorGroup[] = [
  { name: "红粉", slugs: ["blush", "sakura", "coral", "rose", "hotpink", "crimson", "cherry", "wine"] },
  { name: "橙黄", slugs: ["cream", "butter", "lemon", "honey", "amber", "tangerine", "pumpkin", "terracotta"] },
  { name: "绿青", slugs: ["mintcream", "mint", "pistachio", "lime", "emerald", "forest", "teal", "pine"] },
  { name: "蓝紫", slugs: ["skycream", "sky", "azure", "cobalt", "sapphire", "lavender", "violet", "indigo"] },
  { name: "中性", slugs: ["ivory", "sand", "taupe", "stone", "graphite", "espresso", "chocolate", "onyx"] },
];

export const COLOR_MAP: Record<string, BeadColor> = Object.fromEntries(
  COLORS.map((c) => [c.id, c])
);

export const COLOR_BY_SLUG: Record<string, BeadColor> = Object.fromEntries(
  COLORS.map((c) => [c.slug, c])
);

export const DEFAULT_COLOR_ID = COLOR_BY_SLUG.cherry.id;
