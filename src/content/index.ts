import { additionalCities, additionalOpponents } from "./additional-cities";

export type StageMode = "match" | "rally" | "rescue" | "accuracy";
export type RacketId = "balanced" | "attack" | "control" | "spin";
export type Spin = "normal" | "topspin" | "slice";
export type Side = "player" | "ai";
export interface Opponent {
  id: string;
  name: string;
  style: "balanced" | "attack" | "control" | "slice";
  weakness: string;
  color: string;
}
export interface City {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  theme: string;
  accent: string;
  stamp: string;
  skin: string;
  skinName: string;
  roster: [string, string, string];
  challenge: Exclude<StageMode, "match">;
  difficulties: [number, number, number, number, number, number];
}
export interface Stage {
  id: string;
  cityId: string;
  order: number;
  mode: StageMode;
  opponentId: string;
  difficulty: number;
  targetScore: 3 | 5 | 7;
  rule?: "comeback" | "zone";
  practice?: boolean;
  title: string;
  hint: string;
  prerequisiteStageId?: string;
}
export const cities: City[] = [
  {
    id: "shanghai",
    code: "SH",
    name: "上海",
    subtitle: "滨江俱乐部",
    theme: "暖色滨江",
    accent: "#ffba78",
    stamp: "沪",
    skin: "shanghai_ink",
    skinName: "滨江水墨",
    roster: ["chen_rookie", "yue", "coach"],
    challenge: "rally",
    difficulties: [1, 1, 2, 2, 1, 2],
  },
  {
    id: "tokyo",
    code: "TK",
    name: "东京",
    subtitle: "屋顶夜场",
    theme: "冷色霓虹",
    accent: "#bc9bff",
    stamp: "東",
    skin: "tokyo_neon",
    skinName: "夜行电路",
    roster: ["hayate", "rin", "sora"],
    challenge: "rescue",
    difficulties: [2, 2, 3, 3, 2, 3],
  },
  {
    id: "paris",
    code: "PA",
    name: "巴黎",
    subtitle: "花园球会",
    theme: "绿金庭院",
    accent: "#e2d69a",
    stamp: "法",
    skin: "paris_garden",
    skinName: "花园印象",
    roster: ["amy", "luca", "noel"],
    challenge: "accuracy",
    difficulties: [3, 3, 3, 4, 2, 4],
  },
  ...additionalCities,
];
export const opponents: Opponent[] = [
  {
    id: "chen_rookie",
    name: "阿晨",
    style: "balanced",
    weakness: "回球比较稳，试着把他调向两边。",
    color: "#77d5bf",
  },
  {
    id: "yue",
    name: "小岳",
    style: "control",
    weakness: "喜欢打空档，接球后别站在边上。",
    color: "#ffc97b",
  },
  {
    id: "coach",
    name: "陈教练",
    style: "balanced",
    weakness: "多换几个落点，遇到高球可以加力。",
    color: "#fa947e",
  },
  {
    id: "hayate",
    name: "隼",
    style: "attack",
    weakness: "球速快，但常重复同一落点。",
    color: "#ae97ff",
  },
  {
    id: "rin",
    name: "凛",
    style: "control",
    weakness: "落点比较开，注意两边的来球。",
    color: "#74c6ff",
  },
  {
    id: "sora",
    name: "空",
    style: "attack",
    weakness: "回球快，提前往前迎会轻松一点。",
    color: "#fa85ba",
  },
  {
    id: "amy",
    name: "艾米",
    style: "control",
    weakness: "回球稳，愿意跟你多打几板。",
    color: "#9adb93",
  },
  {
    id: "luca",
    name: "卢卡",
    style: "slice",
    weakness: "回球偏短，往前迎，别等球走远。",
    color: "#eac493",
  },
  {
    id: "noel",
    name: "诺埃尔",
    style: "balanced",
    weakness: "回球很稳，连续变线更容易得分。",
    color: "#eccd63",
  },
  ...additionalOpponents,
];
export const stages: Stage[] = cities.flatMap((city, cityIndex) =>
  Array.from({ length: 6 }, (_, index) => {
    const order = index + 1;
    const mode: StageMode = order === 5 ? city.challenge : "match";
    const final = order === 6;
    return {
      id: `${city.code}0${order}`,
      cityId: city.id,
      order,
      mode,
      opponentId: city.roster[final || order === 5 ? 2 : index % 2]!,
      difficulty: city.difficulties[index]!,
      targetScore: final ? 7 : order === 1 ? 3 : 5,
      rule:
        order === 3 ? (cityIndex % 2 === 0 ? "comeback" : "zone") : undefined,
      practice: order === 5,
      title: final
        ? "城市决赛"
        : mode === "match"
          ? [
              "3分热身",
              "风格对抗",
              cityIndex % 2 === 0 ? "落后三分" : "半台攻防",
              "强敌挑战",
            ][index]!
          : "30秒练招",
      hint:
        order === 5
          ? "练满30秒即可过关；接住6球，额外得30金币"
          : order === 3
            ? cityIndex % 2 === 0
              ? "从0:3开始，先得5分获胜；4:4后下一分决胜"
              : "回球须落对方金色半台，先得5分；4:4后下一分决胜"
            : `先得${final ? 7 : order === 1 ? 3 : 5}分获胜；${final ? "6:6" : order === 1 ? "2:2" : "4:4"}后下一分决胜，每两分换发球`,
      prerequisiteStageId:
        index > 0
          ? `${city.code}0${index}`
          : cityIndex > 0
            ? `${cities[cityIndex - 1]!.code}06`
            : undefined,
    };
  }),
);
export const difficulty = [
  { delay: 0.18, speed: 1.65, error: 0.028, miss: 0 },
  { delay: 0.16, speed: 1.8, error: 0.024, miss: 0 },
  { delay: 0.14, speed: 1.95, error: 0.021, miss: 0 },
  { delay: 0.12, speed: 2.1, error: 0.018, miss: 0 },
  { delay: 0.1, speed: 2.25, error: 0.015, miss: 0 },
  { delay: 0.085, speed: 2.4, error: 0.012, miss: 0 },
];
export const rackets: {
  id: RacketId;
  name: string;
  description: string;
  main: string;
  speed: number;
  window: number;
  spin: number;
}[] = [
  {
    id: "balanced",
    name: "均衡拍",
    description: "落点稳，适合多打几板",
    main: "落点稳定",
    speed: 1,
    window: 1,
    spin: 1,
  },
  {
    id: "attack",
    name: "快攻拍",
    description: "球速快，接球要更准",
    main: "击球速度",
    speed: 1.08,
    window: 0.92,
    spin: 1,
  },
  {
    id: "control",
    name: "控制拍",
    description: "接球更宽容，回球稍慢",
    main: "接球容错",
    speed: 0.95,
    window: 1.12,
    spin: 1,
  },
  {
    id: "spin",
    name: "弧线拍",
    description: "过网更稳，回球稍慢",
    main: "弧线控制",
    speed: 0.96,
    window: 1,
    spin: 1.12,
  },
];
export const upgradeCosts = [200, 400, 700, 1100];
export const skins = [
  {
    id: "classic",
    name: "经典红黑",
    color: "#ef6673",
    condition: "开始就能用",
  },
  { id: "mint", name: "薄荷绿", color: "#6ee0bf", condition: "300 金币" },
  ...cities.map((city) => ({
    id: city.skin,
    name: city.skinName,
    color: city.accent,
    condition: `赢下${city.name}决赛`,
  })),
  {
    id: "pixel",
    name: "像素电玩",
    color: "#6ed3ff",
    condition: "攒到 20 颗星",
  },
  {
    id: "porcelain",
    name: "青花瓷",
    color: "#79a2f5",
    condition: "12 个皮肤碎片",
  },
  {
    id: "champion_gold",
    name: "冠军金",
    color: "#f6d375",
    condition: "打完全部 18 站",
  },
];
export function rank(xp: number): string {
  return xp >= 3000
    ? "大师"
    : xp >= 1800
      ? "钻石"
      : xp >= 1080
        ? "铂金"
        : xp >= 540
          ? "黄金"
          : xp >= 180
            ? "白银"
            : "青铜";
}
export function rankDifficulty(xp: number): number {
  return xp >= 3000 ? 6 : xp >= 1800 ? 5 : xp >= 1080 ? 4 : xp >= 540 ? 3 : 1;
}
export function racketStats(id: RacketId, level: number) {
  const r = rackets.find((r) => r.id === id)!;
  const l = Math.max(0, Math.min(4, level - 1));
  return {
    speed: Math.min(1.25, r.speed * (id === "attack" ? 1 + 0.03 * l : 1)),
    window: Math.min(
      0.15,
      0.1 * r.window * (id === "control" ? 1 + 0.03 * l : 1),
    ),
    spin: Math.min(1.3, r.spin * (id === "spin" ? 1 + 0.03 * l : 1)),
    stability: 1 + 0.01 * l + (id === "balanced" ? 0.03 * l : 0),
  };
}
export function validateContent(): string[] {
  const errors: string[] = [];
  const ids = new Set(stages.map((stage) => stage.id));
  if (
    cities.length !== 18 ||
    new Set(cities.map((city) => city.id)).size !== 18 ||
    new Set(cities.map((city) => city.code)).size !== 18
  )
    errors.push("城市数量或编号不正确");
  if (stages.length !== 108 || ids.size !== stages.length)
    errors.push("关卡数量或编号不正确");
  if (
    opponents.length !== 54 ||
    new Set(opponents.map((person) => person.id)).size !== opponents.length
  )
    errors.push("对手数量或编号不正确");
  for (const city of cities) {
    const localStages = stages.filter((stage) => stage.cityId === city.id);
    if (
      localStages.length !== 6 ||
      localStages.filter((stage) => stage.mode === "match").length !== 5 ||
      localStages.filter(
        (stage) => stage.order === 6 && stage.targetScore === 7,
      ).length !== 1
    )
      errors.push(`${city.name}的赛程不完整`);
    if (
      city.roster.some((id) => !opponents.some((person) => person.id === id)) ||
      city.difficulties.some(
        (level) => !Number.isInteger(level) || level < 1 || level > 6,
      )
    )
      errors.push(`${city.name}的对手或难度不正确`);
  }
  for (const s of stages) {
    if (
      !cities.some((c) => c.id === s.cityId) ||
      !opponents.some((o) => o.id === s.opponentId)
    )
      errors.push(`${s.id} 引用不存在`);
    const visited = new Set([s.id]);
    let p = s.prerequisiteStageId;
    while (p) {
      if (visited.has(p)) {
        errors.push("循环前置");
        break;
      }
      visited.add(p);
      const next = stages.find((t) => t.id === p);
      if (!next) {
        errors.push("缺失前置");
        break;
      }
      p = next.prerequisiteStageId;
    }
  }
  if (
    stages.filter((s) => !s.prerequisiteStageId).length !== 1 ||
    stages[0]?.id !== "SH01"
  )
    errors.push("起点不正确");
  const matches = stages.filter((s) => s.mode === "match").length;
  const challenge = stages.length - matches;
  if (
    matches * 180 + challenge * 160 + cities.length * 300 + 200 !== 24680 ||
    matches * 60 + challenge * 30 !== 5940 ||
    matches - cities.length + challenge * 2 + cities.length * 3 !== 162
  )
    errors.push("经济总量不正确");
  if (
    upgradeCosts.some((n) => n < 0) ||
    cities.some((c) => !skins.some((s) => s.id === c.skin))
  )
    errors.push("费用/皮肤错误");
  return errors;
}
