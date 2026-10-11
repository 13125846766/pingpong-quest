import type { RacketId } from "./index";

export type TechniqueKind =
  | "counter"
  | "drop"
  | "switch"
  | "smash"
  | "soft"
  | "rush"
  | "read"
  | "feint";
export interface Technique {
  id: string;
  name: string;
  kind: TechniqueKind;
  description: string;
  rackets: RacketId[];
  cityId?: string;
}
const moves: Record<
  TechniqueKind,
  { description: string; rackets: RacketId[] }
> = {
  counter: {
    description: "停拍挡住快球，借来球的速度反击。",
    rackets: ["balanced", "control"],
  },
  drop: {
    description: "接球前轻轻收拍，短球落点更稳。",
    rackets: ["control", "spin"],
  },
  switch: {
    description: "连打同侧后斜挥变线，落点更准。",
    rackets: ["balanced", "attack"],
  },
  smash: {
    description: "调出高球后向前快挥，扣杀更有力。",
    rackets: ["attack", "balanced"],
  },
  soft: {
    description: "低球轻挡时多留一点过网余量。",
    rackets: ["spin", "control"],
  },
  rush: {
    description: "往前迎住上升期来球，回球更快。",
    rackets: ["attack", "balanced"],
  },
  read: {
    description: "来球带侧旋时，显示落台后的偏转方向。",
    rackets: ["control", "spin"],
  },
  feint: {
    description: "长球之后收拍放短，让对手多犹豫一下。",
    rackets: ["spin", "balanced"],
  },
};
export const starterTechniques: Technique[] = [
  ["counter", "借力反击"],
  ["drop", "近网巧手"],
  ["switch", "变线高手"],
  ["smash", "高球重炮"],
  ["soft", "稳手卸力"],
].map(([kind, name]) => ({
  id: kind!,
  name: name!,
  kind: kind as TechniqueKind,
  ...moves[kind as TechniqueKind],
}));

export type BossStyle = "rush" | "body" | "short" | "slice" | "sidespin";
export interface Master {
  cityId: string;
  nickname: string;
  style: BossStyle;
  tell: string;
  weakness: string;
  opening: string;
  technique: Technique;
}
const masterSpecs: [string, string, BossStyle, TechniqueKind, string][] = [
  ["shanghai", "弄堂快攻手", "rush", "rush", "弄堂抢点"],
  ["tokyo", "屋顶反拍手", "sidespin", "read", "看穿侧旋"],
  ["paris", "花园短球客", "short", "feint", "长短藏锋"],
  ["beijing", "胡同削球王", "slice", "soft", "胡同卸力"],
  ["chengdu", "茶馆慢球手", "body", "counter", "茶馆借力"],
  ["hongkong", "海港侧旋手", "sidespin", "read", "海港读球"],
  ["seoul", "夜场快攻手", "rush", "rush", "夜场迎击"],
  ["bangkok", "河畔巧手", "short", "drop", "河畔轻放"],
  ["singapore", "雨棚守台人", "body", "counter", "雨棚反击"],
  ["sydney", "海风重炮手", "rush", "smash", "海风重炮"],
  ["dubai", "沙地变线手", "body", "switch", "沙地变线"],
  ["rome", "广场老球友", "slice", "soft", "广场稳守"],
  ["barcelona", "街角巧攻手", "short", "feint", "街角虚实"],
  ["london", "街区削球手", "slice", "counter", "街区借力"],
  ["berlin", "车库快攻手", "rush", "switch", "车库转线"],
  ["capetown", "山脚守台人", "short", "drop", "山脚短摆"],
  ["rio", "海滩侧旋手", "sidespin", "read", "海滩识旋"],
  ["newyork", "公园反击手", "body", "smash", "公园重扣"],
];
const styleText: Record<BossStyle, [string, string, string]> = {
  rush: [
    "抬拍抢点 · 留意反手",
    "先挡住快攻。连续压一侧，再变线或收拍放短。",
    "先接住，再想怎么赢。",
  ],
  body: [
    "停拍蓄势 · 留出身前空间",
    "慢球之后会突然追身，别一直站在球路上。",
    "别急，下一板可不慢。",
  ],
  short: [
    "拍面放平 · 准备迎短球",
    "往前接短球，再用长球把对手推回底线。",
    "台前这一小块，也得顾着。",
  ],
  slice: [
    "压低拍面 · 轻挡过网",
    "低球别硬扣，先换落点，等勉强救起的高球。",
    "球低的时候，手上轻些。",
  ],
  sidespin: [
    "横向绕拍 · 落台后会侧拐",
    "观察球迹箭头，在球落台前给侧向偏转留位置。",
    "落台以后才是难接的。",
  ],
};
export const masters: Master[] = masterSpecs.map(
  ([cityId, nickname, style, kind, name]) => ({
    cityId,
    nickname,
    style,
    tell: styleText[style][0],
    weakness: styleText[style][1],
    opening: styleText[style][2],
    technique: { id: `master_${cityId}`, name, kind, cityId, ...moves[kind] },
  }),
);
export const techniques = [
  ...starterTechniques,
  ...masters.map((master) => master.technique),
];
export const masterFor = (cityId: string): Master =>
  masters.find((master) => master.cityId === cityId) ?? masters[0]!;
export const techniqueFor = (id: string): Technique | undefined =>
  techniques.find((move) => move.id === id);
export function techniqueChoices(
  cityId: string,
  checkpoint: number,
  racket: RacketId,
  learned: string[],
  selected: string[],
): Technique[] {
  const pool = techniques.filter(
    (move) =>
      (!move.cityId || learned.includes(move.id)) &&
      !selected.some((id) => techniqueFor(id)?.kind === move.kind),
  );
  const compatible = pool.filter((move) => move.rackets.includes(racket));
  const seed = [...cityId].reduce(
    (n, char) => n + char.charCodeAt(0),
    checkpoint,
  );
  const first = compatible[seed % compatible.length] ?? pool[0];
  if (!first) return [];
  const remaining = pool.filter((move) => move.id !== first.id);
  const offered = [
    first,
    ...remaining.slice(seed % Math.max(1, remaining.length)),
    ...remaining.slice(0, seed % Math.max(1, remaining.length)),
  ];
  const seen = new Set<TechniqueKind>();
  return offered
    .filter((move) => {
      if (seen.has(move.kind)) return false;
      seen.add(move.kind);
      return true;
    })
    .slice(0, 3);
}

export function dailySetup(now = Date.now()) {
  const day = new Date(now + 8 * 3600000).toISOString().slice(0, 10);
  const seed = [...day].reduce(
    (n, char) => (Math.imul(n, 31) + char.charCodeAt(0)) >>> 0,
    17,
  );
  return {
    day,
    seed,
    cityId: ["shanghai", "tokyo", "paris"][seed % 3]!,
    skills: ["counter", "switch"],
  };
}
