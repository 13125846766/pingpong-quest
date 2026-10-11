import { type City, type Opponent } from "./index";

interface CitySpec {
  id: string;
  code: string;
  name: string;
  venue: string;
  accent: string;
  stamp: string;
  skinName: string;
  names: [string, string, string];
  level: number;
}

const stops: CitySpec[] = [
  {
    id: "beijing",
    code: "BJ",
    name: "北京",
    venue: "胡同球馆",
    accent: "#cda58c",
    stamp: "京",
    skinName: "砖红旧巷",
    names: ["小宁", "老周", "许教练"],
    level: 3,
  },
  {
    id: "chengdu",
    code: "CD",
    name: "成都",
    venue: "竹荫小院",
    accent: "#aebd91",
    stamp: "蓉",
    skinName: "竹叶青",
    names: ["阿川", "小蓉", "何师傅"],
    level: 3,
  },
  {
    id: "hongkong",
    code: "HK",
    name: "香港",
    venue: "维港夜场",
    accent: "#b6bdd0",
    stamp: "港",
    skinName: "海港微光",
    names: ["阿朗", "嘉怡", "陈伯"],
    level: 3,
  },
  {
    id: "seoul",
    code: "SE",
    name: "首尔",
    venue: "山下球会",
    accent: "#b1bfd5",
    stamp: "首",
    skinName: "青瓦晨光",
    names: ["俊浩", "秀妍", "民锡"],
    level: 4,
  },
  {
    id: "bangkok",
    code: "BK",
    name: "曼谷",
    venue: "河岸球馆",
    accent: "#d0b387",
    stamp: "曼",
    skinName: "河岸铜纹",
    names: ["阿南", "莉达", "颂猜"],
    level: 4,
  },
  {
    id: "singapore",
    code: "SG",
    name: "新加坡",
    venue: "海湾俱乐部",
    accent: "#a0c5bd",
    stamp: "新",
    skinName: "雨后海湾",
    names: ["文凯", "慧玲", "林叔"],
    level: 4,
  },
  {
    id: "sydney",
    code: "SY",
    name: "悉尼",
    venue: "港湾球会",
    accent: "#c7be9c",
    stamp: "悉",
    skinName: "海风砂岩",
    names: ["奥利", "梅娅", "杰克"],
    level: 4,
  },
  {
    id: "dubai",
    code: "DB",
    name: "迪拜",
    venue: "暮色露台",
    accent: "#d3af94",
    stamp: "迪",
    skinName: "沙丘暮色",
    names: ["奥马尔", "莱拉", "拉希德"],
    level: 4,
  },
  {
    id: "rome",
    code: "RM",
    name: "罗马",
    venue: "石巷球馆",
    accent: "#c6a37f",
    stamp: "罗",
    skinName: "陶土石纹",
    names: ["马尔科", "朱莉娅", "保罗"],
    level: 4,
  },
  {
    id: "barcelona",
    code: "BC",
    name: "巴塞罗那",
    venue: "街区屋顶",
    accent: "#c3b37b",
    stamp: "巴",
    skinName: "碎瓷海岸",
    names: ["伊克尔", "露西亚", "塞尔吉"],
    level: 5,
  },
  {
    id: "london",
    code: "LD",
    name: "伦敦",
    venue: "河畔球会",
    accent: "#aab6c5",
    stamp: "伦",
    skinName: "雾蓝格纹",
    names: ["哈里", "艾拉", "乔治"],
    level: 5,
  },
  {
    id: "berlin",
    code: "BL",
    name: "柏林",
    venue: "砖厂球馆",
    accent: "#b9bb98",
    stamp: "柏",
    skinName: "灰绿砖墙",
    names: ["菲恩", "莉娜", "卡尔"],
    level: 5,
  },
  {
    id: "capetown",
    code: "CT",
    name: "开普敦",
    venue: "山海球场",
    accent: "#abc2cc",
    stamp: "开",
    skinName: "山海白线",
    names: ["西波", "娜拉", "丹尼尔"],
    level: 5,
  },
  {
    id: "rio",
    code: "RJ",
    name: "里约热内卢",
    venue: "海边小球馆",
    accent: "#b8c08d",
    stamp: "里",
    skinName: "棕榈海风",
    names: ["若昂", "比娅", "米格尔"],
    level: 5,
  },
  {
    id: "newyork",
    code: "NY",
    name: "纽约",
    venue: "街区俱乐部",
    accent: "#b8b7cc",
    stamp: "纽",
    skinName: "屋顶钢蓝",
    names: ["伊森", "玛雅", "弗兰克"],
    level: 5,
  },
];

export const additionalCities: City[] = stops.map((stop, index) => ({
  id: stop.id,
  code: stop.code,
  name: stop.name,
  subtitle: stop.venue,
  theme: stop.venue,
  accent: stop.accent,
  stamp: stop.stamp,
  skin: `${stop.id}_club`,
  skinName: stop.skinName,
  roster: [`${stop.id}_a`, `${stop.id}_b`, `${stop.id}_final`],
  challenge: (["rally", "rescue", "accuracy"] as const)[index % 3]!,
  difficulties: [
    stop.level,
    stop.level,
    Math.min(6, stop.level + 1),
    Math.min(6, stop.level + 1),
    stop.level,
    Math.min(6, stop.level + 1),
  ],
}));

const styles: Opponent["style"][] = ["balanced", "control", "attack", "slice"];
const notes: Record<Opponent["style"], string> = {
  balanced: "回球比较稳，别一直打同一个位置。",
  control: "喜欢打向空档，接球后记得回到中间。",
  attack: "出手快，往前站一点更容易接住。",
  slice: "回球偏短，可以主动往前迎。",
};
export const additionalOpponents: Opponent[] = stops.flatMap(
  (stop, cityIndex) =>
    stop.names.map((name, index) => {
      const style = styles[(cityIndex + index) % styles.length]!;
      const suffix = index === 2 ? "final" : index === 0 ? "a" : "b";
      return {
        id: `${stop.id}_${suffix}`,
        name,
        style,
        weakness: notes[style],
        color: stop.accent,
      };
    }),
);
