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
    slug: "doraemon",
    name: "哆啦A梦",
    cols: 16,
    rows: 16,
    palette: { B: "cobalt", W: "ivory", K: "onyx", R: "crimson", Y: "butter" },
    pattern: [
      "....BBBBBBBB....",
      "..BBBWWWWWWBBB..",
      "..BWWWWWWWWWWB..",
      ".BWWWWWWWWWWWWB.",
      ".BWWKKWWWWKKWWB.",
      ".BWWKKWWWWKKWWB.",
      ".BWWWWWRRWWWWWB.",
      ".BWWWWWWWWWWWWB.",
      ".BBWWWWWWWWWWBB.",
      "..BBBWWWWWWBBB..",
      ".BBBYYYYYYYBBB..",
      ".BBBBRRYRRBBBBB.",
      "..BBBBBBBBBBBB..",
      "..BBBBBBBBBBBB..",
      "....BBBBBBBB....",
      "................",
    ],
  },
  {
    slug: "hellokitty",
    name: "Hello Kitty",
    cols: 16,
    rows: 16,
    palette: { W: "ivory", R: "crimson", K: "onyx", Y: "butter" },
    pattern: [
      "..W....RR....W..",
      ".WWW..RRRR..WWW.",
      "WWWWWRRRRRRWWWWW",
      "WWWWWWWWWWWWWWWW",
      "WWWWWWWWWWWWWWWW",
      "WWWWWWWWWWWWWWWW",
      "WWWKKWWWWWWKKWWW",
      "WWWKKWWWWWWKKWWW",
      "WWWWWWYYYYWWWWWW",
      "WWWWWWWWWWWWWWWW",
      "KWWWWWWWWWWWWWWK",
      "KKWWWWWWWWWWWWKK",
      ".KWWWWWWWWWWWWK.",
      "..WWWWWWWWWWWW..",
      "....WWWWWWWW....",
      "......WWWW......",
    ],
  },
  {
    slug: "shinchan",
    name: "蜡笔小新",
    cols: 16,
    rows: 16,
    palette: { K: "onyx", P: "sand", R: "crimson", Y: "butter" },
    pattern: [
      ".....KKKKKK.....",
      "...KKPPPPPPKK...",
      "..KPPPPPPPPPPK..",
      ".KPPPPPPPPPPPPK.",
      "KPPPPPPPPPPPPPPK",
      "KKKKKKKKKKKKKKKK",
      "KPPPPPPPPPPPPPPK",
      "KPPKKPPPPPPKKPPK",
      "KPPKKPPPPPPKKPPK",
      "KPPPPPPPPPPPPPPK",
      "KPPPPPRRRRPPPPPK",
      "RRRRRRRRRRRRRRRR",
      "RRRRRRRRRRRRRRRR",
      "RRRRRRRRRRRRRRRR",
      ".YYYYYYYYYYYYYY.",
      ".YYYYYYYYYYYYYY.",
    ],
  },
  {
    slug: "zhubajie",
    name: "猪八戒",
    cols: 16,
    rows: 16,
    palette: { P: "sakura", K: "onyx", S: "sand", R: "crimson" },
    pattern: [
      "P..............P",
      "PP............PP",
      "PPP..........PPP",
      "PPPP........PPPP",
      "PPPPPPPPPPPPPPPP",
      "PPPPPPPPPPPPPPPP",
      "PPPKPPPPPPPPKPPP",
      "PPPPPPPPPPPPPPPP",
      "PPSSSSSSSSSSSSPP",
      "PSSSSSSSSSSSSSSP",
      "PSKSSSSSSSSSSKSP",
      "PSKSSSSSSSSSSKSP",
      "PSSSSSSSSSSSSSSP",
      "PPSSSSSSSSSSSSPP",
      ".PPPPPPPPPPPPPP.",
      "RRRRRRRRRRRRRRRR",
    ],
  },
  {
    slug: "watermelon",
    name: "西瓜",
    cols: 16,
    rows: 16,
    palette: { R: "cherry", W: "ivory", G: "emerald", D: "pine", K: "onyx" },
    pattern: [
      ".....DDDDDD.....",
      "...DDGGGGGGDD...",
      "..DGGGGGGGGGGD..",
      ".DGGGGGGGGGGGGD.",
      "DGGGDDGGGGDDGGGD",
      "DGGGGGGGGGGGGGGD",
      "DGGGGGDDDDGGGGGD",
      "DGGGGGGGGGGGGGGD",
      ".WWWWWWWWWWWWWW.",
      ".WRRRRRRRRRRRRW.",
      ".WRWRWRWRWRWRWW.",
      ".WRRRRRKRRRRRRW.",
      ".WRWRWRWRWRWRWW.",
      ".WRRRRRRRRRRRRW.",
      "..WWWWWWWWWWWW..",
      "................",
    ],
  },
  {
    slug: "strawberry",
    name: "草莓",
    cols: 16,
    rows: 16,
    palette: { R: "cherry", L: "rose", G: "pistachio", D: "forest", W: "cream", K: "lemon" },
    pattern: [
      "......G........G",
      ".....GG......GG.",
      "....GGG....GGG..",
      "...GGGGGGGGGGG..",
      "..GGGGGGGGGGGGG.",
      ".GGGGGGGGGGGGGG.",
      "GGGGGGGGGGGGGGGG",
      "LRRRRRRRRRRRRRRL",
      "RRKRRRRRRRRRKRRR",
      "RRRRRKRRRRRRRRRR",
      "RKRRRRRRRRRKRRRR",
      "RRRRRRKRRRRRRRRR",
      "RRRRRRRRRRRRRKRR",
      "LRRRRRRRRRRRRRRL",
      ".WWWWWWWWWWWWWW.",
      "................",
    ],
  },
  {
    slug: "lucky_cat",
    name: "招财猫",
    cols: 16,
    rows: 16,
    palette: { W: "ivory", O: "tangerine", R: "crimson", K: "onyx", Y: "butter" },
    pattern: [
      "..W..........W..",
      ".WWW........WWW.",
      "WWWWW......WWWWW",
      "WWWWWWWWWWWWWWWW",
      "WWWWWWWWWWWWWWWW",
      "WWKWWWKWWWWWWWWW",
      "WWKWWWKWWWWWWWWW",
      "WWWWWWWWWWKWWWWW",
      "WWWWWWWWWWWWWWWW",
      "WWWWWWYWWYWWWWWW",
      "WWWOOOOOOOOOWWWW",
      "WWOOOOOOOOOOOOWW",
      "WWWWWWWWWWWWWWWW",
      "WWWWWWWWWWWWWWWW",
      "WWWWWWWWWWWWWWWW",
      "WWWWWWWWWWWWWWWW",
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
