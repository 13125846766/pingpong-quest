import { describe, expect, it } from "vitest";
import {
  stages,
  racketStats,
  validateContent,
  type Side,
} from "../src/content";
import { FixedClock, Rng } from "../src/core/math";
import { INPUT_TUNING } from "../src/content/tuning";
import { InputFilter } from "../src/core/input-filter";
import { Gesture } from "../src/game/gesture";
import { Match } from "../src/game/match";
import {
  advanceBall,
  COURT,
  planShot,
  predictReceive,
  serve,
  type Ball,
} from "../src/game/physics";
const make = (id = "SH01", seed = 42) =>
  new Match({
    stage: stages.find((s) => s.id === id)!,
    seed,
    racket: "balanced",
    level: 1,
    assist: true,
  });
interface Fixture {
  lastHitter: Side;
  receiver: Side;
  bounces: number;
  serving: boolean;
  serveBounces: number;
  pointDone: boolean;
  touchedNet: boolean;
  aiMiss: boolean;
}
function scenario(
  m: Match,
  patch: Partial<Ball>,
  state: Partial<Fixture> = {},
): void {
  m.phase = "RALLY";
  Object.assign(
    m as unknown as Fixture,
    {
      lastHitter: "player",
      receiver: "ai",
      bounces: 0,
      serving: false,
      serveBounces: 0,
      pointDone: false,
      touchedNet: false,
      aiMiss: false,
    },
    state,
  );
  m.ball = {
    x: 0,
    y: 1.9,
    z: 0.3,
    vx: 0,
    vy: 3,
    vz: -1,
    active: true,
    spin: "normal",
    ...patch,
  };
}
function ticks(m: Match, count: number): void {
  for (let i = 0; i < count; i++) m.tick(1 / 120);
}
export function playBot(m: Match, max = 180): void {
  // Skilled play uses the newly available forecourt position against fast corners.
  if (m.options.stage.mode === "match" && m.options.stage.difficulty >= 3)
    m.moveDepth(0.35);
  for (let i = 0; i < max * 120 && !m.completed; i++) {
    if (m.ball.active && m.ball.vy < 0) {
      if (m.ball.drop) m.moveDepth(0.68);
      const forecast = predictReceive(m.ball, "player", m.playerDepth);
      m.drag(forecast.x);
      if (m.options.stage.rule === "zone" && forecast.time > 0.16)
        m.moveDepth(0.35);
      if (forecast.time <= 0.025) {
        const aim =
          m.options.stage.mode === "accuracy" || m.options.stage.rule === "zone"
            ? (m.hits % 3 === 2 ? 0.14 : 0.6) / 0.67
            : m.options.stage.mode === "rally"
              ? 0
              : m.hits % 3 === 2
                ? -0.98
                : 0.98;
        if (m.options.stage.rule === "zone" && m.hits % 3 === 2)
          m.moveDepth(m.playerDepth - 0.045);
        m.swipe(aim, 1);
      }
    }
    m.tick(1 / 120);
    m.events.splice(0);
  }
}
describe("物理与裁判", () => {
  it.each(["player", "ai"] as const)("固定发球先本方再对方落台：%s", (side) => {
    const ball = serve(side);
    const bounces: number[] = [];
    for (let i = 0; i < 200 && bounces.length < 2; i++)
      advanceBall(ball, 1 / 120, (e) => {
        if (e === "table") bounces.push(ball.y);
      });
    expect(bounces).toHaveLength(2);
    expect(bounces[0]! < COURT.netY).toBe(side === "player");
    expect(bounces[1]! < COURT.netY).toBe(side === "ai");
  });
  it("规划球路过网后合法落对方台面", () => {
    const ball = planShot(
      { x: 0, y: -0.12, z: 0.4 },
      "player",
      0.4,
      2.1,
      3.6,
      "normal",
    );
    const events: { e: string; y: number; z: number }[] = [];
    for (let i = 0; i < 120; i++)
      advanceBall(ball, 1 / 120, (e) =>
        events.push({ e, y: ball.y, z: ball.z }),
      );
    const net = events.find((e) => e.e === "net")!;
    expect(net.z).toBeGreaterThan(0.1725);
    const bounce = events.find((e) => e.e === "table")!;
    expect(bounce.y).toBeCloseTo(2.1, 3);
  });
  it("高速球不会穿网，且只记一次失分", () => {
    const m = make();
    scenario(m, { y: 1.3, z: 0.05, vy: 40, vz: 0 });
    m.tick(0.01);
    expect(m.aiScore).toBe(1);
    ticks(m, 30);
    expect(m.aiScore).toBe(1);
    expect(m.events.some((e) => e.type === "net")).toBe(true);
  });
  it("擦网回球仍可合法落台", () => {
    const m = make();
    scenario(m, { y: 1.3, z: 0.15, vy: 3, vz: 0 });
    ticks(m, 70);
    expect(m.events.some((e) => e.type === "net")).toBe(true);
    expect(m.aiScore).toBe(0);
    expect(m.events.some((e) => e.type === "bounce")).toBe(true);
  });
  it("合法擦网发球重发，不计分", () => {
    const m = make();
    scenario(
      m,
      { y: 1.3, z: 0.15, vy: 3, vz: 0 },
      { serving: true, serveBounces: 1 },
    );
    ticks(m, 65);
    expect(m.events.some((e) => e.type === "let")).toBe(true);
    expect(m.playerScore + m.aiScore).toBe(0);
  });
  it("发球先落对方台面判失误", () => {
    const m = make();
    scenario(
      m,
      { y: 2, z: 0.021, vz: -1, vy: 0 },
      { serving: true, serveBounces: 0 },
    );
    m.tick(0.01);
    expect(m.aiScore).toBe(1);
  });
  it("未落对方台面就出界，击球者失分", () => {
    const m = make();
    scenario(m, { x: 1.1, y: 2, z: 0.021, vz: -1 });
    m.tick(0.01);
    expect(m.aiScore).toBe(1);
  });
  it("回球落自己半台，击球者失分", () => {
    const m = make();
    scenario(m, { y: 0.8, z: 0.021, vz: -1 });
    m.tick(0.01);
    expect(m.aiScore).toBe(1);
  });
  it("接球方第二次落台未回球，接球方失分", () => {
    const m = make();
    scenario(m, { y: 2, z: 0.021, vz: -1 }, { bounces: 1 });
    m.tick(0.01);
    expect(m.playerScore).toBe(1);
  });
  it("漏接合法来球由接球者失分", () => {
    const m = make();
    scenario(
      m,
      { x: 0.6, y: -0.45, z: 0.25, vy: -8 },
      { lastHitter: "ai", receiver: "player", bounces: 1 },
    );
    m.tick(0.01);
    expect(m.aiScore).toBe(1);
  });
  it("没有合法落台不能空中截击", () => {
    const m = make();
    scenario(m, { y: 2.85, z: 0.3, vy: 20 }, { bounces: 0 });
    m.aiX = 0;
    m.tick(0.02);
    expect(m.events.some((e) => e.type === "hit")).toBe(false);
    expect(m.aiScore).toBe(1);
  });
  it("高速合法来球能在世界球拍平面被接住", () => {
    const m = make();
    scenario(
      m,
      { y: -0.05, z: 0.4, vy: -30, vz: 0 },
      { lastHitter: "ai", receiver: "player", bounces: 1 },
    );
    m.playerX = 0;
    m.drag(0);
    m.swipe(0.5, 0.8);
    m.tick(0.01);
    expect(m.hits).toBe(1);
    expect(m.ball.vy).toBeGreaterThan(0);
    expect(m.ball.x).toBeCloseTo(0);
  });
  it("停止操作不自动代打", () => {
    const m = make();
    scenario(
      m,
      { y: -0.05, z: 0.4, vy: -30 },
      { lastHitter: "ai", receiver: "player", bounces: 1 },
    );
    m.tick(0.025);
    expect(m.hits).toBe(0);
    expect(m.aiScore).toBe(1);
  });
  it("同一来球只能击打一次", () => {
    const m = make();
    scenario(
      m,
      { y: -0.05, z: 0.4, vy: -30 },
      { lastHitter: "ai", receiver: "player", bounces: 1 },
    );
    m.drag(0);
    m.swipe(0.5, 0.8);
    m.tick(0.01);
    m.swipe(0.5, 0.8);
    m.tick(0.01);
    expect(m.hits).toBe(1);
  });
  it.each([
    ["SH01", 5],
    ["SH06", 7],
  ] as const)("%s 娱乐平分下一球决胜", (id, target) => {
    const m = make(id);
    m.playerScore = target - 1;
    m.aiScore = target - 1;
    scenario(m, { y: 2, z: 0.021, vz: -1 }, { bounces: 1 });
    m.tick(0.01);
    expect(m.completed).toBe(true);
    expect(m.playerScore).toBe(target);
    expect(m.won).toBe(true);
  });
  it("每两分换发球", () => {
    const m = make();
    expect(m.server).toBe("player");
    m.playerScore = 1;
    expect(m.server).toBe("player");
    m.aiScore = 1;
    expect(m.server).toBe("ai");
    m.playerScore = 3;
    expect(m.server).toBe("player");
  });
  it("暂停恢复不补算、不中断重复计分、不重放输入", () => {
    const m = make();
    ticks(m, 150);
    const before = { ...m.ball };
    const elapsed = m.elapsed;
    m.drag(0.5);
    m.swipe(1, 1);
    m.pause();
    m.tick(20);
    expect(m.ball).toEqual(before);
    expect(m.elapsed).toBe(elapsed);
    m.resume();
    expect(m.input.shotAge).toBe(99);
    expect(m.input.dragging).toBe(false);
    m.tick(1 / 120);
    expect(Math.abs(m.ball.y - before.y)).toBeLessThan(0.1);
  });
  it("长帧只补算上限100ms，reset清空积累", () => {
    const c = new FixedClock();
    let seconds = 0;
    c.advance(30, (dt) => (seconds += dt));
    expect(seconds).toBeLessThanOrEqual(0.100001);
    c.reset();
    c.advance(0.001, (dt) => (seconds += dt));
    expect(seconds).toBeLessThanOrEqual(0.100001);
  });
  it("固定seed可重现，电脑与玩家移动均有上限", () => {
    const a = make(),
      b = make();
    for (let i = 0; i < 1000; i++) {
      a.drag(0.7);
      b.drag(0.7);
      const x = a.aiX,
        p = a.playerX;
      a.tick(1 / 120);
      b.tick(1 / 120);
      expect(Math.abs(a.aiX - x)).toBeLessThanOrEqual(
        a.aiConfig.speed / 120 + 1e-9,
      );
      expect(Math.abs(a.playerX - p)).toBeLessThanOrEqual(
        INPUT_TUNING.playerMoveSpeed / 120 + 1e-9,
      );
    }
    expect(a.ball).toEqual(b.ball);
    expect(a.aiScore).toBe(b.aiScore);
  });
  it("电脑反应延迟内不会追踪新来球", () => {
    const m = make();
    scenario(
      m,
      { x: 0, y: -0.05, z: 0.4, vy: -30 },
      { lastHitter: "ai", receiver: "player", bounces: 1 },
    );
    m.drag(0);
    m.swipe(0.8, 0.5);
    m.tick(0.01);
    const x = m.aiX;
    ticks(m, 20);
    expect(m.aiX).toBe(x);
  });
  it("随机数同seed可重现", () => {
    const a = new Rng(42),
      b = new Rng(42);
    for (let i = 0; i < 30; i++) expect(a.next()).toBe(b.next());
  });
  it("零输入也能完成一场，有明确输赢", () => {
    const m = make();
    ticks(m, 60 * 120);
    expect(m.completed).toBe(true);
    expect(m.aiScore).toBe(3);
    expect(m.won).toBe(false);
  });
  it.each(stages.map((s) => s.id))("实际物理模拟可通关 %s", (id) => {
    const m = make(id, 777);
    playBot(m);
    expect(
      m.completed,
      `phase=${m.phase} misses=${m.misses} successes=${m.successes} rally=${m.bestRally}`,
    ).toBe(true);
    expect(
      m.won,
      `score=${m.playerScore}:${m.aiScore} misses=${m.misses} successes=${m.successes} rally=${m.bestRally}`,
    ).toBe(true);
  });
  it("装备有取舍且不超过属性上限", () => {
    expect(racketStats("attack", 1).window).toBeLessThan(
      racketStats("balanced", 1).window,
    );
    expect(racketStats("control", 5).window).toBeLessThanOrEqual(0.15);
    expect(racketStats("spin", 5).spin).toBeLessThanOrEqual(1.3);
    expect(racketStats("attack", 5).speed).toBeLessThanOrEqual(1.25);
  });
  it("内容ID、前置、引用与经济总量有效", () =>
    expect(validateContent()).toEqual([]));
});
describe("单指输入", () => {
  it("触点落下不瞬移，相对轻滑控制方向，多指不会抢控制", () => {
    const strokes: number[] = [];
    let x = 0;
    const g = new Gesture(
      (v) => (x = v),
      (aim) => strokes.push(aim),
      () => {},
    );
    g.handle({ kind: "down", id: 1, x: 100, y: 630, time: 0 });
    expect(x).toBe(0);
    g.handle({ kind: "down", id: 2, x: 300, y: 630, time: 20 });
    g.handle({ kind: "move", id: 1, x: 180, y: 630, time: 100 });
    expect(strokes).toEqual([]);
    expect(x).toBeGreaterThan(0);
  });
  it("鼠标只移动无需按键也能控制球拍", () => {
    let x = 0;
    const g = new Gesture(
      (v) => (x = v),
      () => {},
      () => {},
    );
    g.handle({
      kind: "move",
      id: 1,
      x: 295,
      y: 630,
      time: 100,
      pointerType: "mouse",
    });
    expect(x).toBeGreaterThan(0.4);
  });
  it("松手后已站好的球拍能接球，未操作则不代打", () => {
    const m = make();
    scenario(
      m,
      { y: -0.05, z: 0.4, vy: -10 },
      { lastHitter: "ai", receiver: "player", bounces: 1 },
    );
    m.drag(0);
    m.release();
    m.tick(0.01);
    expect(m.hits).toBe(1);
    const n = make();
    scenario(
      n,
      { y: -0.05, z: 0.4, vy: -10 },
      { lastHitter: "ai", receiver: "player", bounces: 1 },
    );
    n.input.movementAge = 0.36;
    n.tick(0.01);
    expect(n.hits).toBe(0);
  });
  it("滤波减小低速抖动，快滑响应保持在100ms内", () => {
    const f = new InputFilter();
    f.reset(0);
    const values: number[] = [];
    for (let i = 1; i <= 60; i++)
      values.push(f.sample(i % 2 ? 0.004 : -0.004, (i * 1000) / 60));
    expect(
      Math.max(...values.slice(10)) - Math.min(...values.slice(10)),
    ).toBeLessThan(0.004);
    f.reset(0);
    let last = 0;
    for (let i = 1; i <= 6; i++) last = f.sample(0.5, (i * 1000) / 60);
    expect(last).toBeGreaterThan(0.46);
  });
  it("球拍小位移100ms内跟随九成，停止不越过目标", () => {
    const m = make();
    m.drag(0.1);
    ticks(m, 12);
    expect(m.playerX).toBeGreaterThan(0.09);
    ticks(m, 120);
    expect(m.playerX).toBeLessThanOrEqual(0.1);
  });
  it("有效前划仅发一次意图，cancel后旧触点无效", () => {
    let strokes = 0;
    const g = new Gesture(
      () => {},
      () => strokes++,
      () => {},
    );
    g.handle({ kind: "down", id: 1, x: 195, y: 735, time: 0 });
    g.handle({ kind: "move", id: 1, x: 200, y: 700, time: 90 });
    g.handle({ kind: "move", id: 1, x: 200, y: 680, time: 120 });
    expect(strokes).toBe(1);
    g.handle({ kind: "cancel", id: 1, x: 200, y: 680, time: 130 });
    g.handle({ kind: "move", id: 1, x: 200, y: 650, time: 160 });
    expect(strokes).toBe(1);
  });
});

describe("二维自由挥拍与对打", () => {
  it("一次定位后停住，超过旧350ms窗口仍可接住合法来球", () => {
    const m = make();
    m.drag(0);
    m.release();
    ticks(m, 80);
    scenario(
      m,
      { y: -0.05, z: 0.4, vy: -10 },
      { lastHitter: "ai", receiver: "player", bounces: 1 },
    );
    m.tick(0.02);
    expect(m.hits).toBe(1);
  });
  it("前后移动改变真正的接球平面，能向前迎球", () => {
    const m = make();
    m.moveDepth(0.5);
    m.drag(0);
    ticks(m, 40);
    scenario(
      m,
      { y: 0.54, z: 0.38, vy: -8 },
      { lastHitter: "ai", receiver: "player", bounces: 1 },
    );
    m.tick(0.02);
    expect(m.playerDepth).toBeGreaterThan(0.45);
    expect(m.hits).toBe(1);
    expect(m.ball.vy).toBeGreaterThan(0);
  });
  it("相对触摸同时跟随两轴，首次落指不改变深度", () => {
    let x = 0.2,
      depth = 0.1;
    const g = new Gesture(
      (v) => (x = v),
      () => {},
      () => {},
      () => x,
      (v) => (depth = v),
      () => depth,
    );
    g.handle({
      kind: "down",
      id: 1,
      x: 100,
      y: 670,
      time: 0,
      pointerType: "touch",
    });
    expect(x).toBe(0.2);
    expect(depth).toBe(0.1);
    g.handle({
      kind: "move",
      id: 1,
      x: 155,
      y: 635,
      time: 80,
      pointerType: "touch",
    });
    expect(x).toBeGreaterThan(0.35);
    expect(depth).toBeGreaterThan(0.28);
  });
  it("手指不离屏也能连续挥两拍，不要求重新抓住球拍", () => {
    let strokes = 0;
    const g = new Gesture(
      () => {},
      () => strokes++,
      () => {},
    );
    g.handle({ kind: "down", id: 1, x: 195, y: 700, time: 0 });
    g.handle({ kind: "move", id: 1, x: 215, y: 660, time: 80 });
    g.handle({ kind: "move", id: 1, x: 195, y: 700, time: 240 });
    g.handle({ kind: "move", id: 1, x: 215, y: 650, time: 320 });
    expect(strokes).toBe(2);
  });
  it("入门对手主动接住多拍，不靠随机漏球结束首轮", () => {
    const m = make("SH01", 7);
    m.drag(0);
    let returns = 0;
    for (let i = 0; i < 15 * 120 && m.playerScore + m.aiScore === 0; i++) {
      m.tick(1 / 120);
      for (const e of m.events.splice(0))
        if (e.type === "hit" && e.side === "ai") returns++;
    }
    expect(returns).toBeGreaterThanOrEqual(3);
  });
});
