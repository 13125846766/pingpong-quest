import { clamp } from "./math";

// 输入和绘制共用 390×844 坐标，拍面接触位置才会一致。
export const PLAYFIELD = { left: 24, right: 366, top: 252, bottom: 746 };
export interface ViewPoint {
  x: number;
  y: number;
  scale: number;
}
export function courtProject(x: number, y: number, z = 0): ViewPoint {
  const distance = Math.max(0.42, y + 2.05);
  return {
    x: 195 + (x * 520) / distance,
    y: 70 + (672 - z * 360) / distance,
    scale: 2.05 / distance,
  };
}
export function paddleWorld(
  x: number,
  y: number,
): { x: number; depth: number } {
  const distance = 564 / (clamp(y, PLAYFIELD.top, PLAYFIELD.bottom) - 70);
  return { x: ((x - 195) * distance) / 520, depth: distance - 2.05 };
}
export function contactDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
  paddleA: { x: number; y: number },
  paddleB: { x: number; y: number },
  rx: number,
  ry: number,
): number {
  const x = (a.x - paddleA.x) / rx,
    y = (a.y - paddleA.y) / ry;
  const dx = (b.x - paddleB.x) / rx - x,
    dy = (b.y - paddleB.y) / ry - y;
  const length = dx * dx + dy * dy;
  const t = length ? clamp(-(x * dx + y * dy) / length, 0, 1) : 0;
  return Math.hypot(x + dx * t, y + dy * t);
}
