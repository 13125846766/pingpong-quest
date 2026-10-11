import { clamp } from "../core/math";
import { INPUT_TUNING as T } from "../content/tuning";
import { InputFilter } from "../core/input-filter";
import { PLAYFIELD } from "../core/court-view";
export interface Pointer {
  kind: "down" | "move" | "up" | "cancel";
  id: number;
  x: number;
  y: number;
  time: number;
  pointerType?: string;
}
export class Gesture {
  private id: number | null = null;
  private start = { x: 0, y: 0, time: 0 };
  private lastX = 195;
  private origin = 0;
  private originDepth = -0.12;
  private lastStroke = -Infinity;
  private samples: { x: number; y: number; time: number }[] = [];
  private readonly filter = new InputFilter();
  private readonly depthFilter = new InputFilter();
  private freeOrigin = { x: 195, y: 560 };
  constructor(
    private drag: (x: number, moving: boolean) => void,
    private swipe: (aim: number, power: number) => void,
    private release: () => void,
    private getTarget: () => number = () => 0,
    private moveDepth: (depth: number) => void = () => {},
    private getDepth: () => number = () => -0.12,
    private freeMove?: (x: number, y: number, moving: boolean) => void,
    private getPaddle: () => { x: number; y: number } = () => ({
      x: 195,
      y: 560,
    }),
  ) {}
  clear(): void {
    this.id = null;
    this.samples = [];
    this.release();
  }
  private stroke(p: Pointer): void {
    this.samples.push({ x: p.x, y: p.y, time: p.time });
    this.samples = this.samples.filter((v) => p.time - v.time <= 150);
    const first = this.samples[0]!;
    const dx = p.x - first.x,
      dy = first.y - p.y,
      elapsed = p.time - first.time;
    if (
      dy >= T.swipeDistance &&
      elapsed >= 30 &&
      p.time - this.lastStroke >= 180
    ) {
      this.swipe(
        clamp((dx / Math.max(36, Math.abs(dy))) * 1.1, -1, 1),
        clamp(dy / 70 + (dy / Math.max(1, elapsed)) * 0.25, 0.2, 1),
      );
      this.lastStroke = p.time;
    }
  }
  handle(p: Pointer): void {
    if (this.freeMove) {
      this.handleFree(p);
      return;
    }
    if (
      p.kind === "move" &&
      this.id === null &&
      p.pointerType === "mouse" &&
      p.y >= 240 &&
      p.y < 750
    ) {
      const moved =
        Math.abs(p.x - this.lastX) > 0.25 ||
        Math.abs(this.getDepth() - clamp((687 - p.y) / 122 - 0.2, -0.2, 0.72)) >
          0.01;
      this.lastX = p.x;
      if (moved)
        this.drag(
          this.filter.sample(clamp((p.x - 195) / 215, -0.72, 0.72), p.time),
          true,
        );
      this.moveDepth(
        this.depthFilter.sample(
          clamp((687 - p.y) / 122 - 0.2, -0.2, 0.72),
          p.time,
        ),
      );
      this.stroke(p);
      return;
    }
    if (p.kind === "down") {
      if (this.id !== null || p.y < 240 || p.y > 760) return;
      this.id = p.id;
      this.start = { x: p.x, y: p.y, time: p.time };
      this.lastX = p.x;
      this.origin = this.getTarget();
      this.originDepth = this.getDepth();
      this.filter.reset(this.origin, p.time);
      this.depthFilter.reset(this.originDepth, p.time);
      this.samples = [{ x: p.x, y: p.y, time: p.time }];
      this.drag(this.origin, true);
      return;
    }
    if (p.id !== this.id) return;
    if (p.kind === "cancel") {
      this.clear();
      return;
    }
    const dx = p.x - this.start.x,
      dy = this.start.y - p.y;
    const moved = Math.abs(p.x - this.lastX) > 0.25 || dy > 1;
    this.drag(
      this.filter.sample(clamp(this.origin + dx / 215, -0.72, 0.72), p.time),
      moved,
    );
    this.moveDepth(
      this.depthFilter.sample(
        clamp(this.originDepth + dy / 122, -0.2, 0.72),
        p.time,
      ),
    );
    this.lastX = p.x;
    this.stroke(p);
    if (p.kind === "up") this.clear();
  }
  private handleFree(p: Pointer): void {
    const eligible = p.y >= 180 && p.y <= 780;
    if (
      p.kind === "move" &&
      this.id === null &&
      p.pointerType === "mouse" &&
      eligible
    ) {
      this.freeMove!(
        clamp(p.x, PLAYFIELD.left, PLAYFIELD.right),
        clamp(p.y, PLAYFIELD.top, PLAYFIELD.bottom),
        true,
      );
      this.stroke(p);
      return;
    }
    if (p.kind === "down") {
      if (this.id !== null || !eligible) return;
      this.id = p.id;
      this.start = { x: p.x, y: p.y, time: p.time };
      this.freeOrigin = this.getPaddle();
      this.samples = [{ x: p.x, y: p.y, time: p.time }];
      this.freeMove!(this.freeOrigin.x, this.freeOrigin.y, true);
      return;
    }
    if (p.id !== this.id) return;
    if (p.kind === "cancel") {
      this.clear();
      return;
    }
    this.freeMove!(
      clamp(
        this.freeOrigin.x + p.x - this.start.x,
        PLAYFIELD.left,
        PLAYFIELD.right,
      ),
      clamp(
        this.freeOrigin.y + p.y - this.start.y,
        PLAYFIELD.top,
        PLAYFIELD.bottom,
      ),
      true,
    );
    this.stroke(p);
    if (p.kind === "up") this.clear();
  }
}
