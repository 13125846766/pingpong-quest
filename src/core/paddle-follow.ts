import { smoothFollow } from "./math";
import { INPUT_TUNING } from "../content/tuning";

// 每帧跟随原始指针目标，松手后仍会收敛到停下的位置。
export function followPaddle(
  current: number,
  target: number,
  dt: number,
  speed: number,
): number {
  const distance = Math.abs(target - current);
  if (distance < 0.08) return target;
  const response = INPUT_TUNING.screenResponse + Math.min(90, distance * 1.25);
  return smoothFollow(current, target, dt, speed, response);
}
