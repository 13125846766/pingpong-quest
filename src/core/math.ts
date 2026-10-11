export const clamp = (v: number, a: number, b: number): number =>
  Math.max(a, Math.min(b, v));
export const moveToward = (a: number, b: number, step: number): number =>
  a + clamp(b - a, -step, step);
export function smoothFollow(
  current: number,
  target: number,
  dt: number,
  maxSpeed: number,
  response = 45,
): number {
  return (
    current +
    clamp(
      (target - current) * (1 - Math.exp(-response * dt)),
      -maxSpeed * dt,
      maxSpeed * dt,
    )
  );
}
export class Rng {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0 || 1;
  }
  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state / 4294967296;
  }
  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }
  normal(): number {
    return (
      Math.sqrt(-2 * Math.log(Math.max(1e-9, this.next()))) *
      Math.cos(2 * Math.PI * this.next())
    );
  }
}
export class FixedClock {
  private accumulator = 0;
  reset(): void {
    this.accumulator = 0;
  }
  advance(seconds: number, step: (dt: number) => void): number {
    this.accumulator += clamp(seconds, 0, 0.1);
    while (this.accumulator >= 1 / 120) {
      step(1 / 120);
      this.accumulator -= 1 / 120;
    }
    return this.accumulator * 120;
  }
}
