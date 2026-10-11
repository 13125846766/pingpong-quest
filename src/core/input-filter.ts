import { clamp } from "./math";
// Original implementation of the speed-adaptive low-pass idea described by
// Géry Casiez et al. (1€ Filter). No source code is copied from a candidate repo.
export class InputFilter {
  private filtered: number | null = null;
  private previousRaw = 0;
  private previousTime = 0;
  private derivative = 0;
  constructor(
    private readonly minCutoff = 8,
    private readonly speedGain = 2.5,
  ) {}
  reset(value: number, time = 0): void {
    this.filtered = value;
    this.previousRaw = value;
    this.previousTime = time;
    this.derivative = 0;
  }
  sample(value: number, timeMs: number): number {
    if (this.filtered === null) {
      this.reset(value, timeMs);
      return value;
    }
    const dt = clamp((timeMs - this.previousTime) / 1000, 1 / 240, 0.1);
    const velocity = (value - this.previousRaw) / dt;
    const alpha = (frequency: number): number =>
      1 / (1 + 1 / (2 * Math.PI * frequency * dt));
    this.derivative += alpha(3) * (velocity - this.derivative);
    this.filtered +=
      alpha(this.minCutoff + this.speedGain * Math.abs(this.derivative)) *
      (value - this.filtered);
    this.previousRaw = value;
    this.previousTime = timeMs;
    return this.filtered;
  }
}
