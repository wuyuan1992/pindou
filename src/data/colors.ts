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
  const hn = ((h % 360) + 360) % 360 / 360;
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
  defineColor("cherry", "樱桃红", "#c8102e"),
  defineColor("red", "正红", "#d9261a"),
  defineColor("rose", "玫瑰红", "#d63071"),
  defineColor("rust", "铁锈红", "#9b1f1f"),

  defineColor("pink", "粉色", "#ff8db1"),
  defineColor("hotpink", "热粉", "#ff2d8c"),
  defineColor("magenta", "紫红", "#bd1d78"),
  defineColor("plum", "梅红", "#7c2b5c"),

  defineColor("orange", "橙色", "#ff7b1c"),
  defineColor("pumpkin", "南瓜橙", "#e85d04"),
  defineColor("peach", "桃色", "#ffc4a3"),
  defineColor("sand", "沙色", "#e8c39e"),

  defineColor("yellow", "黄色", "#ffd60a"),
  defineColor("gold", "金黄", "#f6a800"),
  defineColor("cream", "奶油色", "#fdf2cf"),
  defineColor("lemon", "柠檬", "#ffec70"),

  defineColor("lightgreen", "浅绿", "#7ad980"),
  defineColor("green", "翠绿", "#2d9e3b"),
  defineColor("darkgreen", "深绿", "#0d5c2c"),
  defineColor("mint", "薄荷", "#a8e6cf"),
  defineColor("lime", "酸橙", "#c6ec2c"),
  defineColor("teal", "青绿", "#17a398"),

  defineColor("lightblue", "浅蓝", "#7fd4f1"),
  defineColor("skyblue", "天蓝", "#3da9fc"),
  defineColor("blue", "蓝色", "#1c6dd0"),
  defineColor("darkblue", "深蓝", "#0c2d6b"),

  defineColor("lavender", "薰衣草", "#bda8e3"),
  defineColor("purple", "紫色", "#6a3eaa"),
  defineColor("darkpurple", "深紫", "#3a1f70"),

  defineColor("white", "白色", "#fdfaf2"),
  defineColor("beige", "米色", "#e8dab2"),
  defineColor("lightgray", "浅灰", "#c4c4c4"),
  defineColor("gray", "灰色", "#7d7d7d"),
  defineColor("darkgray", "深灰", "#404040"),
  defineColor("brown", "棕色", "#7c4a1e"),
  defineColor("lightbrown", "浅棕", "#a36c3a"),
  defineColor("darkbrown", "深棕", "#3a2210"),
  defineColor("black", "黑色", "#1a1a1a"),
];

export interface ColorGroup {
  name: string;
  slugs: string[];
}

export const COLOR_GROUPS: ColorGroup[] = [
  { name: "红粉", slugs: ["cherry", "red", "rose", "rust", "pink", "hotpink", "magenta", "plum"] },
  { name: "橙黄", slugs: ["orange", "pumpkin", "peach", "sand", "yellow", "gold", "cream", "lemon"] },
  { name: "绿青", slugs: ["lightgreen", "green", "darkgreen", "mint", "lime", "teal"] },
  { name: "蓝紫", slugs: ["lightblue", "skyblue", "blue", "darkblue", "lavender", "purple", "darkpurple"] },
  { name: "中性", slugs: ["white", "beige", "lightgray", "gray", "darkgray", "brown", "lightbrown", "darkbrown", "black"] },
];

export const COLOR_MAP: Record<string, BeadColor> = Object.fromEntries(
  COLORS.map((c) => [c.id, c])
);

export const COLOR_BY_SLUG: Record<string, BeadColor> = Object.fromEntries(
  COLORS.map((c) => [c.slug, c])
);

export const DEFAULT_COLOR_ID = COLOR_BY_SLUG.cherry.id;
