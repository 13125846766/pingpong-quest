import { describe, expect, it } from "vitest";
import { rackets, stages } from "../src/content";
import {
  dailySetup,
  masterFor,
  techniqueChoices,
  techniqueFor,
} from "../src/content/techniques";
import { Match } from "../src/game/match";
import { Tactics } from "../src/game/tactics";
import {
  advanceBall,
  COURT,
  planShot,
  predictAiContact,
  predictReceive,
  validateShot,
} from "../src/game/physics";
import { MemoryStorage } from "../src/platform/mock";
import {
  freshSave,
  migrate,
  SaveStore,
  type Result,
} from "../src/persistence/save";
import { Economy } from "../src/progression/economy";

const stage = (id: string) => stages.find((s) => s.id === id)!;
const match = (id: string) =>
  new Match({
    stage: stage(id),
    seed: 42,
    racket: "balanced",
    level: 1,
    assist: true,
  });
const setup = () => {
  const storage = new MemoryStorage();
  const store = new SaveStore(storage);
  return { storage, store, economy: new Economy(store) };
};
const result = (stageId: string, patch: Partial<Result> = {}): Result => ({
  id: stageId,
  stageId,
  won: true,
  stars: 2,
  playerScore: 5,
  aiScore: 2,
  hits: 12,
  precise: 3,
  duration: 45,
  expert: false,
  ...patch,
});
function finish(economy: Economy, value: Result) {
  economy.finish(value);
  economy.claim(value.id);
}
function time(m: Match, seconds: number) {
  for (let i = 0; i < seconds * 120 && !m.completed; i++) m.tick(1 / 120);
}

describe("调动与城市赛程", () => {
  it("反复打中路不会积攒失衡机会，连压一侧后变线才有偏移", () => {
    const t = new Tactics();
    for (let i = 0; i < 100; i++)
      t.observe({ x: 0, y: 2.42 }, { x: 0, y: 2.86 }, 0.8, 1.8);
    expect(t.pressure).toBe(0);
    expect(t.bias).toBe(0);
    t.observe({ x: 0.64, y: 2.42 }, { x: 0, y: 2.86 }, 0.6, 1.8);
    t.observe({ x: 0.64, y: 2.42 }, { x: 0.2, y: 2.86 }, 0.6, 1.8);
    expect(t.bias).toBeGreaterThan(0.2);
    t.observe({ x: -0.64, y: 2.42 }, { x: 0.28, y: 2.86 }, 0.6, 1.8);
    expect(t.wrongFooted).toBe(true);
    expect(t.pressure).toBeGreaterThan(0.42);
    t.reset();
    expect(t.pressure).toBe(0);
    expect(t.wrongFooted).toBe(false);
  });
  it("收拍短球第二跳仍在台内，预测要求电脑上前接球", () => {
    const ball = planShot(
      { x: 0, y: 0.3, z: 0.28 },
      "player",
      0.14,
      1.76,
      2.8,
      "normal",
    );
    ball.drop = true;
    expect(validateShot(ball, "player")).toBe(true);
    const contact = predictAiContact(ball);
    expect(contact.depth).toBeLessThan(2.35);
    const bounces: number[] = [];
    for (let i = 0; i < 240 && bounces.length < 2; i++)
      advanceBall(ball, 1 / 120, (e) => {
        if (e === "table") bounces.push(ball.y);
      });
    expect(bounces).toHaveLength(2);
    expect(bounces[0]).toBeCloseTo(1.76, 3);
    expect(bounces[1]).toBeLessThan(COURT.length);
  });
  it("侧旋在落台时偏转，接球预测包含偏转", () => {
    const ball = planShot({ x: 0, y: 2.7, z: 0.4 }, "ai", 0, 0.65, 3, "normal");
    ball.sideKick = 0.68;
    const forecast = predictReceive(ball, "player", 0.1);
    let actual = 0;
    for (let i = 0; i < 240 && ball.active; i++)
      advanceBall(
        ball,
        1 / 120,
        (e) => {
          if (e === "player") {
            actual = ball.x;
            ball.active = false;
          }
        },
        0.1,
      );
    expect(actual).toBeGreaterThan(0.05);
    expect(actual).toBeCloseTo(forecast.x, 2);
    expect(ball.sideKick).toBe(0);
  });
  it("初级拍无球技也能通过调动打赢上海首领，并抓到救球高球", () => {
    const m = match("SH06");
    m.moveDepth(0.35);
    const tells = new Set<string>();
    for (let i = 0; i < 120 * 120 && !m.completed; i++) {
      if (m.ball.active && m.ball.vy < 0) {
        const forecast = predictReceive(m.ball, "player", m.playerDepth);
        m.drag(forecast.x);
        if (forecast.time <= 0.025) m.swipe(m.hits % 3 === 2 ? -0.98 : 0.98, 1);
      }
      m.tick(1 / 120);
      if (m.tellTime > 0) tells.add(m.bossTell);
      m.events.splice(0);
    }
    expect(m.completed).toBe(true);
    expect(m.won).toBe(true);
    expect(m.weakReturns).toBeGreaterThan(0);
    expect(m.smashes).toBeGreaterThan(0);
    expect(tells.has(masterFor("shanghai").tell)).toBe(true);
  });
  it("每站有3分热身、5分对抗、特殊规则、30秒练招和7分决赛", () => {
    for (let i = 0; i < 18; i++) {
      const city = stages.slice(i * 6, i * 6 + 6);
      expect(city.map((s) => s.targetScore)).toEqual([3, 5, 5, 5, 5, 7]);
      expect(city[2]!.rule).toBe(i % 2 === 0 ? "comeback" : "zone");
      expect(city[4]!.practice).toBe(true);
      expect(city[4]!.opponentId).toBe(city[5]!.opponentId);
    }
    expect(match("SH03").aiScore).toBe(3);
    expect(match("TK03").aiScore).toBe(0);
  });
  it("30秒练招零回球也能继续，暂停时间不算练习时间", () => {
    const m = match("SH05");
    time(m, 10);
    m.pause();
    time(m, 40);
    expect(m.elapsed).toBeCloseTo(10, 4);
    expect(m.completed).toBe(false);
    m.resume();
    time(m, 21);
    expect(m.won).toBe(true);
    expect(m.hits).toBe(0);
    expect(m.stars).toBe(1);
  });
  it("练招轮换普通球与本站招牌球", () => {
    for (const id of ["SH05", "TK05", "PA05"]) {
      const m = match(id);
      m.feeds = 1;
      time(m, 1.2);
      expect(m.bossTell).toBe(masterFor(m.options.stage.cityId).tell);
      expect(m.tellTime).toBeGreaterThan(0);
    }
  });
});

describe("球技、奖励和重试", () => {
  it.each(rackets.map((r) => r.id))("%s 两次选择均保留适配球技", (racket) => {
    const first = techniqueChoices("shanghai", 2, racket, [], []);
    expect(first).toHaveLength(3);
    expect(first.some((t) => t.rackets.includes(racket))).toBe(true);
    for (const picked of first) {
      const second = techniqueChoices("shanghai", 4, racket, [], [picked.id]);
      expect(second).toHaveLength(3);
      expect(second.some((t) => t.rackets.includes(racket))).toBe(true);
      expect(second.every((t) => t.kind !== picked.kind)).toBe(true);
    }
  });
  it("第二、第四关各选一次，重载和失败重试保留搭配", () => {
    const { storage, store, economy } = setup();
    expect(economy.pendingChoice("shanghai")).toBeNull();
    finish(economy, result("SH02"));
    const choice = economy.choices("shanghai")[0]!;
    economy.chooseTechnique("shanghai", choice.id);
    expect(() => economy.chooseTechnique("shanghai", choice.id)).toThrow();
    finish(economy, result("SH03", { won: false, stars: 0 }));
    const reloaded = new Economy(new SaveStore(storage));
    expect(reloaded.citySkills("shanghai")).toEqual([choice.id]);
    finish(reloaded, result("SH04"));
    reloaded.chooseTechnique("shanghai", reloaded.choices("shanghai")[0]!.id);
    expect(reloaded.citySkills("shanghai")).toHaveLength(2);
    expect(store.data.learnedTechniques).toHaveLength(0);
  });
  it("城市冠军永久教会绝活，完成本站搭配且不重复发放", () => {
    const { store, economy } = setup();
    finish(economy, result("SH02"));
    economy.chooseTechnique("shanghai", economy.choices("shanghai")[0]!.id);
    finish(economy, result("SH06"));
    const coins = store.data.coins;
    economy.claim("SH06");
    expect(store.data.coins).toBe(coins);
    expect(store.data.learnedTechniques).toEqual(["master_shanghai"]);
    expect(economy.citySkills("shanghai")).toEqual([]);
    expect(techniqueFor(store.data.learnedTechniques[0]!)!.kind).toBe("rush");
  });
  it("旧存档补学已通关城市的绝活，保留原有财产", () => {
    const old = freshSave() as Partial<ReturnType<typeof freshSave>>;
    old.coins = 123;
    old.cityRewardsClaimed = ["shanghai", "tokyo"];
    delete old.learnedTechniques;
    delete old.tourBuilds;
    delete old.records;
    delete old.completedMatches;
    const upgraded = migrate(old)!;
    expect(upgraded.coins).toBe(123);
    expect(upgraded.learnedTechniques).toEqual([
      "master_shanghai",
      "master_tokyo",
    ]);
    expect(upgraded.records).toEqual({
      longestRally: 0,
      comebacks: 0,
      smashes: 0,
    });
  });
  it("练习达标额外30金币，免费练习基础通关奖励保持一致", () => {
    const plain = setup(),
      bonus = setup();
    finish(plain.economy, result("SH05", { hits: 0, practiceBonus: false }));
    finish(bonus.economy, result("SH05", { hits: 6, practiceBonus: true }));
    expect(plain.store.data.stageProgress.SH05?.cleared).toBe(true);
    expect(bonus.store.data.coins - plain.store.data.coins).toBe(30);
  });
  it("每日配置固定，成绩只记本地最佳且不改变主线财产", () => {
    const day = dailySetup(Date.UTC(2026, 9, 6, 3));
    expect(day).toEqual(dailySetup(Date.UTC(2026, 9, 6, 14)));
    expect(dailySetup(Date.UTC(2026, 9, 6, 16)).day).not.toBe(day.day);
    const { store, economy } = setup();
    economy.recordDaily(day.day, 120);
    economy.recordDaily(day.day, 90);
    expect(store.data.dailyBests[day.day]).toBe(120);
    expect(store.data.coins).toBe(200);
    expect(store.data.stageProgress).toEqual({});
    expect(store.data.completedMatches).toBe(0);
  });
});
