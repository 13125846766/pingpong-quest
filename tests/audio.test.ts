import { describe, expect, it } from "vitest";
import { BrowserAudio } from "../src/audio/browser-audio";

function audioHarness(loadFails = false) {
  const sources: { loop: boolean; started: boolean; rate: number }[] = [];
  const gains: { value: number; targets: number[] }[] = [];
  const pans: number[] = [];
  let state = "suspended";
  const node = { connect() {}, disconnect() {} };
  const ctx = {
    currentTime: 12,
    sampleRate: 44100,
    destination: node,
    get state() {
      return state;
    },
    async resume() {
      state = "running";
    },
    async suspend() {
      state = "suspended";
    },
    createGain() {
      const gain = {
        value: 1,
        targets: [] as number[],
        cancelScheduledValues() {},
        setTargetAtTime(value: number) {
          this.targets.push(value);
        },
      };
      gains.push(gain);
      return { ...node, gain };
    },
    createBuffer(channels: number, length: number) {
      const data = Array.from(
        { length: channels },
        () => new Float32Array(length),
      );
      return {
        getChannelData: (channel: number) => data[channel],
        copyToChannel: (samples: Float32Array, channel: number) =>
          data[channel]!.set(samples),
      };
    },
    async decodeAudioData() {
      return this.createBuffer(1, 100);
    },
    createBufferSource() {
      const playbackRate = { value: 1 };
      const source = {
        ...node,
        loop: false,
        buffer: null,
        playbackRate,
        started: false,
        get rate() {
          return playbackRate.value;
        },
        start() {
          this.started = true;
        },
      };
      sources.push(source);
      return source;
    },
    createStereoPanner() {
      let value = 0;
      return {
        ...node,
        pan: {
          get value() {
            return value;
          },
          set value(next: number) {
            value = next;
            pans.push(next);
          },
        },
      };
    },
  };
  let creations = 0;
  const audio = new BrowserAudio({
    createContext: () => {
      creations++;
      return ctx as unknown as AudioContext;
    },
    load: async () => {
      if (loadFails) throw new Error("missing");
      return new ArrayBuffer(1);
    },
  });
  return { audio, ctx, sources, gains, pans, creations: () => creations };
}

describe("browser audio lifecycle", () => {
  it("keeps one music source through repeated touches, toggles and focus restoration", async () => {
    const h = audioHarness();
    h.audio.music(true);
    await h.audio.unlock();
    for (let i = 0; i < 12; i++) {
      h.audio.music(true);
      await h.audio.unlock();
    }
    expect(h.creations()).toBe(1);
    expect(h.sources.filter((source) => source.loop)).toHaveLength(1);
    h.audio.music(false);
    expect(h.gains[1]!.targets.at(-1)).toBe(0);
    h.audio.music(true);
    const cursor = h.ctx.currentTime;
    h.audio.stop();
    expect(h.ctx.state).toBe("suspended");
    h.audio.play("hit");
    expect(h.sources).toHaveLength(1);
    await h.audio.unlock();
    expect(h.ctx.currentTime).toBe(cursor);
    expect(h.sources.filter((source) => source.loop)).toHaveLength(1);
  });

  it("lowers music during rallies and restores it between points", async () => {
    const h = audioHarness();
    h.audio.music(true);
    await h.audio.unlock();
    const menu = h.gains[1]!.targets.at(-1)!;
    h.audio.rally(true);
    expect(h.gains[1]!.targets.at(-1)).toBeLessThan(menu / 2);
    const changes = h.gains[1]!.targets.length;
    h.audio.rally(true);
    expect(h.gains[1]!.targets).toHaveLength(changes);
    h.audio.rally(false);
    expect(h.gains[1]!.targets.at(-1)).toBe(menu);
  });

  it("preserves stronger, nearer impacts and follows the ball's horizontal position", async () => {
    const h = audioHarness();
    await h.audio.unlock();
    h.audio.play("hit", { speed: 2, x: -0.7, depth: 2.7 });
    const soft = h.gains.at(-1)!.value;
    h.audio.play("hit", { speed: 6, x: 0.7, depth: 0 });
    expect(h.gains.at(-1)!.value).toBeGreaterThan(soft * 1.5);
    expect(h.pans[0]).toBeLessThan(0);
    expect(h.pans[1]).toBeGreaterThan(0);
    expect(h.sources[0]!.rate).not.toBe(h.sources[1]!.rate);
  });

  it("plays a cached fallback if recordings fail, and works without Web Audio", async () => {
    const h = audioHarness(true);
    await h.audio.unlock();
    expect(() => h.audio.play("bounce")).not.toThrow();
    expect(h.sources[0]!.started).toBe(true);
    const unavailable = new BrowserAudio({
      createContext: () => null,
      load: async () => new ArrayBuffer(0),
    });
    unavailable.music(true);
    await unavailable.unlock();
    expect(() => {
      unavailable.play("hit");
      unavailable.rally(true);
      unavailable.stop();
    }).not.toThrow();
  });
});
