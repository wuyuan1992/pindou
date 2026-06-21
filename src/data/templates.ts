import type { Template } from "../types.ts";
import { COLOR_BY_SLUG } from "./colors.ts";
import { deterministicUuid } from "../lib/uuid.ts";

interface BuiltinTemplateDef {
  slug: string;
  name: string;
  cols: number;
  rows: number;
  palette: Record<string, string>;
  pattern: string[];
}

const RAW_TEMPLATES: BuiltinTemplateDef[] = [
  {
    slug: "heart",
    name: "爱心",
    cols: 10,
    rows: 10,
    palette: { R: "cherry" },
    pattern: [
      "..RR..RR..",
      ".RRRRRRRR.",
      "RRRRRRRRRR",
      "RRRRRRRRRR",
      "RRRRRRRRRR",
      ".RRRRRRRR.",
      "..RRRRRR..",
      "...RRRR...",
      "....RR....",
      "..........",
    ],
  },
  {
    slug: "star",
    name: "星星",
    cols: 11,
    rows: 11,
    palette: { Y: "yellow" },
    pattern: [
      ".....Y.....",
      "....YYY....",
      "...YYYYY...",
      "YYYYYYYYYYY",
      "...YYYYY...",
      "....YYY....",
      ".....Y.....",
      "....YYY....",
      "...YYYYY...",
      "....YYY....",
      ".....Y.....",
    ],
  },
  {
    slug: "mushroom",
    name: "蘑菇",
    cols: 12,
    rows: 14,
    palette: { R: "red", W: "white", B: "brown" },
    pattern: [
      "....RRRR....",
      "..RRRRRRRR..",
      ".RRRRRRRRRR.",
      ".RRRWRRWRRR.",
      "RRRRRRRRRRRR",
      "RRRWRRRRWRRR",
      "RRRRRRRRRRRR",
      ".RRRRRRRRRR.",
      "..BBBBBBBB..",
      "...WWWWWW...",
      "...WWWWWW...",
      "...WWWWWW...",
      "...WWWWWW...",
      "............",
    ],
  },
  {
    slug: "flower",
    name: "小花",
    cols: 10,
    rows: 10,
    palette: { P: "pink", Y: "yellow" },
    pattern: [
      ".PP....PP.",
      "PPPP..PPPP",
      "PPPP..PPPP",
      ".PPPPPPPP.",
      "..YYYYYY..",
      "..YYYYYY..",
      ".PPPPPPPP.",
      "PPPP..PPPP",
      "PPPP..PPPP",
      ".PP....PP.",
    ],
  },
  {
    slug: "smiley",
    name: "笑脸",
    cols: 11,
    rows: 11,
    palette: { Y: "yellow", B: "black" },
    pattern: [
      "...YYYYY...",
      ".YYYYYYYYY.",
      "YYYYYYYYYYY",
      "YYBBYYBBYYY",
      "YYBBYYBBYYY",
      "YYYYYYYYYYY",
      "YYBYYYYBYYY",
      "YBBBBBBBBBY",
      ".YBBBBBBBY.",
      ".YYYYYYYYY.",
      "...YYYYY...",
    ],
  },
  {
    slug: "cat",
    name: "小猫",
    cols: 12,
    rows: 12,
    palette: { O: "orange", B: "black", P: "pink", W: "white" },
    pattern: [
      "O..........O",
      "OO........OO",
      ".OOOOOOOOOO.",
      "OOOOOOOOOOOO",
      "OOOOOOOOOOOO",
      "OOOEOOOOEOOO",
      "OOOEOOOOEOOO",
      "OOOOOPPOOOOO",
      "OOOOOWWOOOOO",
      ".OOOOOOOOOO.",
      "..OOOOOOOO..",
      "............",
    ],
  },
];

function compileBuiltin(def: BuiltinTemplateDef): Template {
  const cells: (string | null)[] = new Array(def.cols * def.rows).fill(null);
  for (let y = 0; y < def.rows; y++) {
    const row = def.pattern[y];
    if (!row) continue;
    for (let x = 0; x < def.cols; x++) {
      const ch = row[x];
      if (!ch || ch === ".") continue;
      const slug = def.palette[ch];
      if (!slug) continue;
      const color = COLOR_BY_SLUG[slug];
      if (!color) continue;
      cells[y * def.cols + x] = color.id;
    }
  }
  return {
    id: deterministicUuid("template", def.slug),
    name: def.name,
    cols: def.cols,
    rows: def.rows,
    cells,
    builtin: true,
  };
}

export const BUILTIN_TEMPLATES: Template[] = RAW_TEMPLATES.map(compileBuiltin);
