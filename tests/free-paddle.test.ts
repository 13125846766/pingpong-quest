import { describe, expect, it } from "vitest";
import { Match } from "../src/game/match";
import { stages } from "../src/content";
import { courtProject } from "../src/core/court-view";
import { Gesture } from "../src/game/gesture";
const make = () =>
  new Match({
    stage: stages[0]!,
    seed: 13,
    racket: "balanced",
    level: 1,
    assist: true,
  });
function incoming(m: Match, y = 0.15, z = 0.4, bounces = 1) {
  Object.assign(m, {
    phase: "RALLY",
    receiver: "player",
    serving: false,
    bounces,
    lastHitter: "ai",
  });
  Object.assign(m.ball, { x: 0, y, z, vx: 0, vy: -3, vz: 0, active: true });
}
function position(m: Match, x: number, y: number) {
  m.movePaddle(x, y);
  for (let i = 0; i < 50; i++) m.tick(1 / 120);
}
describe("视频参考的自由球拍", () => {
  it("停好的拍面接住合法来球，并在实际接触位置产生反馈", () => {
    const m = make(),
      p = courtProject(0, 0.15, 0.4);
    position(m, p.x, p.y);
    incoming(m);
    m.tick(1 / 120);
    expect(m.hits).toBe(1);
    expect(m.ball.vy).toBeGreaterThan(0);
    expect(m.contactFlash).toBe(1);
    expect(Math.abs(m.contactY - p.y)).toBeLessThan(5);
  });
  it("左右对准但上下错开时不能隔空接球", () => {
    const m = make();
    position(m, 195, 690);
    incoming(m, -0.1, 0.4);
    m.tick(0.02);
    expect(m.hits).toBe(0);
  });
  it("球落台前不能截击，不会把自动辅助变成代打", () => {
    const m = make(),
      p = courtProject(0, 0.15, 0.4);
    position(m, p.x, p.y);
    incoming(m, 0.15, 0.4, 0);
    m.tick(1 / 120);
    expect(m.hits).toBe(0);
    m.input.positioned = false;
    incoming(m);
    m.tick(1 / 120);
    expect(m.hits).toBe(0);
  });
  it("快速横挥扫过来球不会穿透，松手不重复击球", () => {
    const m = make(),
      p = courtProject(0, 0.15, 0.4);
    position(m, 150, p.y);
    incoming(m);
    m.movePaddle(300, p.y);
    m.tick(0.04);
    expect(m.hits).toBe(1);
    m.release();
    m.tick(0.01);
    expect(m.hits).toBe(1);
  });
  it("能前伸到网前、回收到近端，不再困在窄条中", () => {
    const m = make();
    position(m, 195, 260);
    expect(m.playerDepth).toBeGreaterThan(0.8);
    position(m, 195, 730);
    expect(m.playerDepth).toBeLessThan(-1.1);
  });
  it("跨半个挥拍区域的动作100ms内跟上，停下不会越过目标", () => {
    const m = make();
    m.movePaddle(360, 260);
    for (let i = 0; i < 12; i++) m.tick(1 / 120);
    expect(m.paddleX).toBeGreaterThan(350);
    expect(m.paddleY).toBeLessThan(275);
    for (let i = 0; i < 60; i++) m.tick(1 / 120);
    expect(m.paddleX).toBeLessThanOrEqual(360);
    expect(m.paddleY).toBeGreaterThanOrEqual(260);
  });
  it("触摸首次落指不跳拍，持续滑动能覆盖大范围，第二根手指不抢控制", () => {
    let point = { x: 195, y: 560 };
    const g = new Gesture(
      () => {},
      () => {},
      () => {},
      () => 0,
      () => {},
      () => 0,
      (x, y) => {
        point = { x, y };
      },
      () => point,
    );
    g.handle({
      kind: "down",
      id: 1,
      x: 220,
      y: 700,
      time: 0,
      pointerType: "touch",
    });
    expect(point).toEqual({ x: 195, y: 560 });
    g.handle({
      kind: "down",
      id: 2,
      x: 20,
      y: 350,
      time: 10,
      pointerType: "touch",
    });
    g.handle({
      kind: "move",
      id: 2,
      x: 350,
      y: 260,
      time: 20,
      pointerType: "touch",
    });
    expect(point).toEqual({ x: 195, y: 560 });
    g.handle({
      kind: "move",
      id: 1,
      x: 300,
      y: 400,
      time: 100,
      pointerType: "touch",
    });
    expect(point.x).toBeGreaterThan(260);
    expect(point.y).toBeLessThan(290);
    g.handle({
      kind: "move",
      id: 1,
      x: 120,
      y: 820,
      time: 200,
      pointerType: "touch",
    });
    expect(point.x).toBeLessThan(130);
    expect(point.y).toBeGreaterThan(650);
  });
});
