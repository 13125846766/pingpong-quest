import { describe, expect, it } from "vitest";
import { MUSIC_DURATION, renderMusic } from "../src/audio/music";

describe("original background music", () => {
  const sampleRate = 12_000;
  const music = renderMusic(sampleRate);

  it("renders a finite stereo phrase with room for the game effects", () => {
    expect(MUSIC_DURATION).toBeGreaterThan(40);
    expect(MUSIC_DURATION).toBeLessThan(55);
    expect(music[0].length).toBe(Math.round(MUSIC_DURATION * sampleRate));
    expect(music[1].length).toBe(music[0].length);
    let energy = 0;
    let peak = 0;
    let stereoDifference = 0;
    let finite = true;
    for (let i = 0; i < music[0].length; i++) {
      const left = music[0][i]!;
      const right = music[1][i]!;
      finite &&= Number.isFinite(left) && Number.isFinite(right);
      energy += left * left + right * right;
      peak = Math.max(peak, Math.abs(left), Math.abs(right));
      stereoDifference += Math.abs(left - right);
    }
    expect(finite).toBe(true);
    expect(energy / music[0].length).toBeGreaterThan(0.0005);
    expect(peak).toBeGreaterThan(0.3);
    expect(peak).toBeLessThan(0.5);
    expect(stereoDifference / music[0].length).toBeGreaterThan(0.001);
  });

  it("loops with the same continuity as neighboring samples", () => {
    for (const channel of music) {
      let largestStep = 0;
      for (let i = 1; i < channel.length; i++) {
        largestStep = Math.max(
          largestStep,
          Math.abs(channel[i]! - channel[i - 1]!),
        );
      }
      const seam = Math.abs(channel[0]! - channel[channel.length - 1]!);
      expect(seam).toBeLessThan(0.002);
      expect(seam).toBeLessThan(largestStep);
    }
  });

  it("reuses the rendered phrase for later audio unlocks", () => {
    expect(renderMusic(sampleRate)).toBe(music);
  });

  it.each([0, -1, 7999, 96001, 24000.5, NaN, Infinity])(
    "rejects an invalid sample rate: %s",
    (sampleRate) => {
      expect(() => renderMusic(sampleRate)).toThrow(RangeError);
    },
  );
});
