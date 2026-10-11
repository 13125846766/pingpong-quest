import { describe, expect, it } from "vitest";
import { Match } from "../src/game/match";
import { stages } from "../src/content";
import {
  advanceBall,
  COURT,
  planShot,
  predictAiContact,
} from "../src/game/physics";
import { courtProject } from "../src/core/court-view";
import { Gesture } from "../src/game/gesture";

const make = (difficulty = 1) =>
  new Match({
    stage: { ...stages[0]!, difficulty },
    seed: 13,
    racket: "balanced",
    level: 1,
    assist: true,
  });
describe("球台固定与顺滑操作", () => {
  it("只有一次鼠标输入，后续帧也能到达目标并完全停稳", () => {
    const m = make();
    const g = new Gesture(
      () => {},
      () => {},
      () => {},
      () => 0,
      () => {},
      () => 0,
      (x, y, moving) => m.movePaddle(x, y, moving),
      () => ({ x: m.paddleX, y: m.paddleY }),
    );
    g.handle({
      kind: "move",
      id: 1,
      x: 301,
      y: 413,
      time: 10,
      pointerType: "mouse",
    });
    for (let i = 0; i < 60; i++) m.tick(1 / 120);
    expect(m.paddleX).toBe(301);
    expect(m.paddleY).toBe(413);
    expect(m.paddleTilt).toBeCloseTo(-0.12, 3);
  });
  it("连续反向轻滑不越过目标，也不保留上一个方向的漂移", () => {
    const m = make();
    m.movePaddle(360, 260);
    for (let i = 0; i < 8; i++) m.tick(1 / 120);
    const start = m.paddleX;
    m.movePaddle(30, 730);
    m.tick(1 / 120);
    expect(m.paddleX).toBeLessThan(start);
    for (let i = 0; i < 60; i++) m.tick(1 / 120);
    expect(m.paddleX).toBe(30);
    expect(m.paddleY).toBe(730);
  });
  it("玩家跑到任一角落，球台四角的投影保持相同", () => {
    const m = make();
    const corners = () =>
      [-COURT.halfWidth, COURT.halfWidth].flatMap((x) =>
        [0, COURT.length].map((y) => courtProject(x, y)),
      );
    const before = corners();
    m.movePaddle(24, 252);
    for (let i = 0; i < 50; i++) m.tick(1 / 120);
    expect(corners()).toEqual(before);
    m.movePaddle(366, 746);
    for (let i = 0; i < 50; i++) m.tick(1 / 120);
    expect(corners()).toEqual(before);
  });
});

describe("短球迎击回归", () => {
  const short = () =>
    planShot({ x: 0, y: 0.8, z: 0.12 }, "player", 0, 1.8, 3.4, "slice");
  it("原先等在台后的短球会两次落台，预测改为台内接球点", () => {
    const b = short();
    let bounces = 0;
    let baselineContacts = 0;
    for (let i = 0; i < 240 && b.active; i++)
      advanceBall(b, 1 / 120, (e) => {
        if (e === "table" && ++bounces === 2) b.active = false;
        if (e === "ai") baselineContacts++;
      });
    expect(bounces).toBe(2);
    expect(baselineContacts).toBe(0);
    const p = predictAiContact(short());
    expect(p.depth).toBeGreaterThan(COURT.netY);
    expect(p.depth).toBeLessThan(COURT.aiY - 0.2);
    expect(p.z).toBeGreaterThan(0.1);
  });
  it.each([1, 3, 6])("D%d 在速度限制内前迎短球并完成回击", (d) => {
    const m = make(d);
    Object.assign(m, {
      phase: "RALLY",
      receiver: "ai",
      serving: false,
      bounces: 0,
      lastHitter: "player",
      aiDelay: m.aiConfig.delay,
    });
    m.ball = short();
    let minDepth = m.aiDepth;
    let returns = 0;
    for (
      let i = 0;
      i < 160 && m.playerScore + m.aiScore === 0 && returns === 0;
      i++
    ) {
      const old = m.aiDepth;
      m.tick(1 / 120);
      minDepth = Math.min(minDepth, m.aiDepth);
      expect(Math.abs(m.aiDepth - old)).toBeLessThanOrEqual(
        m.aiConfig.speed / 120 + 1e-8,
      );
      returns += m.events
        .splice(0)
        .filter((e) => e.type === "hit" && e.side === "ai").length;
    }
    expect(minDepth).toBeLessThan(COURT.aiY - 0.2);
    expect(returns).toBe(1);
    expect(m.playerScore).toBe(0);
    expect(m.ball.vy).toBeLessThan(0);
  });
});
