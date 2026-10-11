import { describe, expect, it } from "vitest";
import { stages } from "../src/content";
import { courtProject } from "../src/core/court-view";
import { Match } from "../src/game/match";
import { COURT, type Ball } from "../src/game/physics";

const make = () =>
  new Match({
    stage: stages[0]!,
    seed: 13,
    racket: "balanced",
    level: 1,
    assist: true,
  });

function scenario(m: Match, patch: Partial<Ball>, state = {}) {
  Object.assign(m, {
    phase: "RALLY",
    receiver: "ai",
    lastHitter: "player",
    serving: false,
    bounces: 0,
    pointDone: false,
    touchedNet: false,
    ...state,
  });
  m.ball = {
    x: 0.2,
    y: 2,
    z: 0.04,
    vx: 0.4,
    vy: 3,
    vz: -2,
    active: true,
    spin: "normal",
    ...patch,
  };
}

describe("碰撞音效事件", () => {
  it("落台保存反弹前的接触强度与位置，不跟随之后的球移动", () => {
    const m = make();
    scenario(m, {});
    m.tick(0.02);
    const event = m.events.find((e) => e.type === "bounce")!;
    expect(event.impact).toBeDefined();
    expect(event.impact!.speed).toBeGreaterThan(2);
    expect(m.ball.vz).toBeGreaterThan(0);
    expect(event.impact!.x).toBeLessThan(m.ball.x);
    expect(event.impact!.depth).toBeLessThan(m.ball.y);
    const contact = { ...event.impact! };
    m.tick(0.05);
    expect(event.impact).toEqual(contact);
  });

  it("触网保存网前速度，之后裁判减速不会修改声音事件", () => {
    const m = make();
    scenario(m, {
      x: -0.3,
      y: COURT.netY - 0.004,
      z: COURT.netHeight + 0.005,
      vx: 0,
      vy: 4,
      vz: 0,
    });
    m.tick(0.004);
    const event = m.events.find((e) => e.type === "net")!;
    expect(event.impact!.x).toBeCloseTo(-0.3);
    expect(event.impact!.depth).toBeCloseTo(COURT.netY);
    expect(event.impact!.speed).toBeCloseTo(4, 2);
    expect(Math.abs(m.ball.vy)).toBeLessThan(event.impact!.speed);
  });

  it("同一来球轻挡与前挥扣杀产生不同击球强度", () => {
    const contact = (power?: number) => {
      const m = make();
      const point = courtProject(0, 0.15, 0.95);
      m.movePaddle(point.x, point.y);
      for (let i = 0; i < 50; i++) m.tick(1 / 120);
      m.events.splice(0);
      scenario(m, {
        x: 0,
        y: 0.15,
        z: 0.95,
        vx: 0,
        vy: -3,
        vz: 0,
      }, { receiver: "player", lastHitter: "ai", bounces: 1 });
      if (power !== undefined) m.swipe(0, power);
      m.tick(1 / 120);
      return { m, event: m.events.find((e) => e.type === "hit")! };
    };
    const block = contact();
    const smash = contact(1);
    expect(block.m.hits).toBe(1);
    expect(smash.m.smashes).toBe(1);
    expect(smash.event.impact!.speed).toBeGreaterThan(block.event.impact!.speed);
    expect(smash.event.impact!.speed).toBeGreaterThan(5);
    expect(block.event.side).toBe("player");
    expect(block.event.impact!.depth).toBeLessThan(COURT.netY);
  });

  it("对手回球记录自身击球强度和实际接触位置", () => {
    const m = make();
    scenario(m, {
      x: 0,
      y: m.aiDepth - 0.01,
      z: 0.4,
      vx: 0,
      vy: 5.5,
      vz: 0,
    }, { bounces: 1, aiPlanned: true, aiMiss: false, aiRecovery: 0 });
    m.tick(0.01);
    const event = m.events.find((e) => e.type === "hit" && e.side === "ai")!;
    expect(event).toBeDefined();
    expect(event.impact!.depth).toBeGreaterThan(COURT.netY);
    expect(event.impact!.speed).toBeLessThan(4);
    expect(m.ball.vy).toBeLessThan(0);
  });

  it("对手失衡救起高球时，声音强度也按勉强回球记录", () => {
    const m = make();
    m.aiDepth = 2.4;
    m.tactics.pressure = 0.8;
    scenario(m, {
      x: 0,
      y: m.aiDepth - 0.01,
      z: 0.4,
      vx: 0,
      vy: 5.5,
      vz: 0,
    }, { bounces: 1, aiPlanned: true, aiMiss: false, aiRecovery: 0 });
    m.tick(0.01);
    expect(m.ball.weak).toBe(true);
    const event = m.events.find((e) => e.type === "hit" && e.side === "ai")!;
    expect(event.impact!.speed).toBe(2.5);
  });

  it("命中训练落点只发落台与目标事件，不误播一次挥拍声", () => {
    const m = make();
    scenario(m, {
      x: m.targetZone.x,
      y: m.targetZone.y,
      vx: 0,
      vy: 0,
    }, { accuracyPending: true });
    m.tick(0.02);
    expect(m.successes).toBe(1);
    expect(m.events.filter((e) => e.type === "bounce")).toHaveLength(1);
    expect(m.events.filter((e) => e.type === "target")).toHaveLength(1);
    expect(m.events.some((e) => e.type === "hit")).toBe(false);
    expect(m.events.find((e) => e.type === "target")!.impact).toBeUndefined();
  });
});
