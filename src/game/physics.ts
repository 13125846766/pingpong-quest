import { clamp } from "../core/math";
import type { Side, Spin } from "../content";
export const COURT = {
  halfWidth: 0.7625,
  length: 2.74,
  netY: 1.37,
  netHeight: 0.1525,
  radius: 0.02,
  gravity: 9.81,
  horizontalDrag: 0.06,
  playerY: -0.12,
  aiY: 2.86,
};
export interface Ball {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  active: boolean;
  spin: Spin;
  sideKick?: number;
  weak?: boolean;
  drop?: boolean;
}
export type Collision = "table" | "net" | "player" | "ai" | "out";
export const other = (side: Side): Side =>
  side === "player" ? "ai" : "player";
export function rebound(b: Ball): void {
  b.z = COURT.radius + 1e-7;
  b.vz = Math.abs(b.vz) * (b.drop ? 0.65 : 0.88);
  const factor = b.drop
    ? 0.48
    : b.spin === "topspin"
      ? 1.08
      : b.spin === "slice"
        ? 0.86
        : 1;
  b.vy *= factor;
  b.vx = b.vx * factor + (b.sideKick ?? 0);
  b.sideKick = 0;
}
export function integrate(b: Ball, t: number): void {
  const decay = Math.exp(-COURT.horizontalDrag * t),
    travel = (1 - decay) / COURT.horizontalDrag;
  b.x += b.vx * travel;
  b.y += b.vy * travel;
  b.vx *= decay;
  b.vy *= decay;
  b.z += b.vz * t - 0.5 * COURT.gravity * t * t;
  b.vz -= COURT.gravity * t;
}
export function surfaceTime(b: Ball): number {
  const d = b.vz * b.vz + 2 * COURT.gravity * (b.z - COURT.radius);
  return d < 0 ? Infinity : (b.vz + Math.sqrt(d)) / COURT.gravity;
}
function planeTime(value: number, speed: number, plane: number): number {
  if (speed === 0) return Infinity;
  const ratio = 1 - (COURT.horizontalDrag * (plane - value)) / speed;
  if (ratio <= 0) return Infinity;
  const t = -Math.log(ratio) / COURT.horizontalDrag;
  return t > 1e-8 ? t : Infinity;
}
export function advanceBall(
  b: Ball,
  dt: number,
  onCollision: (event: Collision, b: Ball) => void,
  playerPlane: number = COURT.playerY,
  playerOut: number = -0.48,
  aiPlane: number = COURT.aiY,
): void {
  let remaining = dt;
  for (let count = 0; count < 8 && remaining > 1e-8 && b.active; count++) {
    let time = remaining + 1;
    let event: Collision | null = null;
    const offer = (t: number, e: Collision): void => {
      if (t > 1e-8 && t <= remaining + 1e-9 && t < time) {
        time = t;
        event = e;
      }
    };
    offer(surfaceTime(b), "table");
    offer(planeTime(b.y, b.vy, COURT.netY), "net");
    if (b.vy < 0) {
      offer(planeTime(b.y, b.vy, playerPlane), "player");
      offer(planeTime(b.y, b.vy, playerOut), "out");
    } else {
      offer(planeTime(b.y, b.vy, aiPlane), "ai");
      offer(planeTime(b.y, b.vy, 3.22), "out");
    }
    if (b.z < COURT.radius - 1e-6) offer(1e-7, "out");
    if (!event) {
      integrate(b, remaining);
      break;
    }
    integrate(b, time);
    remaining -= time;
    onCollision(event, b);
    if (event === "table" && b.active) {
      rebound(b);
    }
  }
}
export function planShot(
  origin: Pick<Ball, "x" | "y" | "z">,
  side: Side,
  targetX: number,
  targetY: number,
  speed: number,
  spin: Spin,
  flightTime?: number,
): Ball {
  const distance = Math.abs(targetY - origin.y);
  const duration =
    flightTime ?? clamp(distance / clamp(speed, 2.4, 6), 0.44, 0.9);
  const travel =
    (1 - Math.exp(-COURT.horizontalDrag * duration)) / COURT.horizontalDrag;
  return {
    x: origin.x,
    y: origin.y,
    z: Math.max(0.12, origin.z),
    vx: (targetX - origin.x) / travel,
    vy: (targetY - origin.y) / travel,
    vz:
      (COURT.radius -
        Math.max(0.12, origin.z) +
        0.5 * COURT.gravity * duration * duration) /
      duration,
    active: true,
    spin,
  };
}
export function serve(side: Side, x = 0): Ball {
  return {
    x,
    y: side === "player" ? 0.15 : 2.59,
    z: 0.35,
    vx: 0,
    vy: side === "player" ? 2.65 : -2.65,
    vz: -0.18,
    active: true,
    spin: "normal",
  };
}
export function predictReceive(
  ball: Ball,
  side: Side,
  contactPlane?: number,
): { x: number; z: number; time: number } {
  const b = { ...ball };
  const line = contactPlane ?? (side === "player" ? COURT.playerY : COURT.aiY);
  let time = 0;
  for (let i = 0; i < 400; i++) {
    const previous = b.y;
    integrate(b, 0.005);
    time += 0.005;
    if (
      b.z < COURT.radius &&
      Math.abs(b.x) <= COURT.halfWidth &&
      b.y >= 0 &&
      b.y <= COURT.length
    ) {
      rebound(b);
    }
    if ((previous - line) * (b.y - line) <= 0) return { x: b.x, z: b.z, time };
    if (b.z < -0.4) break;
  }
  return { x: b.x, z: b.z, time };
}
export function predictAiContact(ball: Ball): {
  x: number;
  depth: number;
  z: number;
  time: number;
} {
  const b = { ...ball };
  let bounced = false;
  let best = { ...predictReceive(ball, "ai"), depth: COURT.aiY };
  for (let i = 1; i <= 400; i++) {
    integrate(b, 0.005);
    if (b.z < COURT.radius) {
      if (
        bounced ||
        b.y < COURT.netY ||
        b.y > COURT.length ||
        Math.abs(b.x) > COURT.halfWidth
      )
        break;
      bounced = true;
      rebound(b);
    }
    if (
      bounced &&
      b.y >= COURT.netY + 0.14 &&
      b.y <= COURT.aiY &&
      b.z >= 0.14 &&
      b.z <= 1.05
    )
      best = { x: b.x, depth: b.y, z: b.z, time: i * 0.005 };
    if (b.y >= COURT.aiY) break;
  }
  return best;
}
export function validateShot(ball: Ball, side: Side): boolean {
  const b = { ...ball };
  let valid = true,
    landed = false;
  for (let i = 0; i < 150 && b.active && !landed; i++)
    advanceBall(b, 1 / 120, (event) => {
      if (event === "net" && b.z - COURT.radius < COURT.netHeight) {
        valid = false;
        b.active = false;
      }
      if (event === "table") {
        landed = true;
        const receiver =
          side === "player" ? b.y > COURT.netY : b.y < COURT.netY;
        valid =
          valid &&
          receiver &&
          b.y >= 0 &&
          b.y <= COURT.length &&
          Math.abs(b.x) <= COURT.halfWidth;
        b.active = false;
      }
      if (event === "out") {
        valid = false;
        b.active = false;
      }
    });
  return valid && landed;
}
