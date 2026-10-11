import { clamp } from "../core/math";

export interface Placement {
  x: number;
  y: number;
}
export class Tactics {
  private recent: Placement[] = [];
  bias = 0;
  wrongFooted = false;
  longToShort = false;
  pressure = 0;
  observe(
    shot: Placement,
    position: Placement,
    availableTime: number,
    speed: number,
    feint = false,
  ): void {
    const [a, b] = this.recent.slice(-2);
    this.wrongFooted =
      !!a &&
      !!b &&
      Math.abs(a.x) > 0.22 &&
      Math.abs(b.x) > 0.22 &&
      a.x * b.x > 0 &&
      shot.x * b.x < -0.06;
    const last = this.recent[this.recent.length - 1];
    this.longToShort = !!last && last.y > 2.1 && shot.y < 1.9;
    const distance = Math.hypot(shot.x - position.x, shot.y - position.y);
    this.pressure = clamp(
      distance / Math.max(0.3, availableTime * speed) -
        0.72 +
        (this.wrongFooted ? 0.48 : 0) +
        (this.longToShort ? 0.4 : 0) +
        (feint && this.longToShort ? 0.08 : 0),
      0,
      1,
    );
    this.recent.push(shot);
    if (this.recent.length > 3) this.recent.shift();
    this.bias =
      this.recent.length >= 2 &&
      this.recent.slice(-2).every((hit) => hit.x * shot.x > 0.06)
        ? clamp(shot.x * 0.48, -0.28, 0.28)
        : 0;
  }
  reset(): void {
    this.recent = [];
    this.bias = 0;
    this.pressure = 0;
    this.wrongFooted = false;
    this.longToShort = false;
  }
}
