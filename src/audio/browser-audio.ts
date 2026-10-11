import type { Sound, SoundImpact } from "../platform/types";
import { renderMusic } from "./music";

interface AudioEnvironment {
  createContext(): AudioContext | null;
  load(path: string): Promise<ArrayBuffer>;
}

const clips = [
  "racket-hit.wav",
  "table-bounce-1.wav",
  "table-bounce-2.wav",
  "table-bounce-3.wav",
] as const;

export function assetUrl(path: string): string {
  const embedded = (
    window as unknown as {
      PINGPONG_ASSETS?: Record<string, string>;
    }
  ).PINGPONG_ASSETS;
  return embedded?.[path] ?? new URL(path, document.baseURI).href;
}

const browserEnvironment: AudioEnvironment = {
  createContext() {
    const Audio =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    return Audio ? new Audio({ latencyHint: "interactive" }) : null;
  },
  async load(path) {
    const response = await fetch(assetUrl(path));
    if (!response.ok) throw new Error(`Audio unavailable: ${path}`);
    return response.arrayBuffer();
  },
};

const limit = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, Number.isFinite(value) ? value : low));

/** One context and one music loop. Touch input never restarts the score. */
export class BrowserAudio {
  private ctx: AudioContext | null = null;
  private musicBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private readonly buffers = new Map<string, AudioBuffer>();
  private musicWanted = false;
  private inRally = false;
  private foreground = true;
  private bounceIndex = 0;
  private hitIndex = 0;

  constructor(private readonly environment = browserEnvironment) {
    // Prepare the score while the home screen opens, outside a touch handler.
    if (environment === browserEnvironment) {
      setTimeout(() => {
        if (this.musicWanted) renderMusic(24000);
      }, 0);
    }
  }

  async unlock(): Promise<void> {
    this.foreground = true;
    if (!this.ctx) {
      try {
        this.ctx = this.environment.createContext();
      } catch {
        return;
      }
      if (!this.ctx) return;
      this.effectsBus = this.ctx.createGain();
      this.effectsBus.gain.value = 0.85;
      this.effectsBus.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(this.ctx.destination);
      void this.loadClips(this.ctx);
    }
    try {
      await this.ctx.resume();
      if (this.foreground && this.musicWanted && !this.musicSource)
        this.startMusic();
    } catch {
      // A browser may require another user gesture after an interruption.
    }
  }

  private async loadClips(ctx: AudioContext): Promise<void> {
    await Promise.all(
      clips.map(async (name) => {
        try {
          const bytes = await this.environment.load(`audio/${name}`);
          this.buffers.set(name, await ctx.decodeAudioData(bytes));
        } catch {
          // A missing recording must not interrupt a match.
        }
      }),
    );
  }

  private startMusic(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || !this.musicBus) return;
    if (!this.musicSource) {
      const channels = renderMusic(24000);
      const buffer = ctx.createBuffer(2, channels[0].length, 24000);
      channels.forEach((samples, channel) =>
        buffer.getChannelData(channel).set(samples),
      );
      this.musicSource = ctx.createBufferSource();
      this.musicSource.buffer = buffer;
      this.musicSource.loop = true;
      this.musicSource.connect(this.musicBus);
      this.musicSource.start();
    }
    this.setMusicLevel();
  }

  private setMusicLevel(): void {
    if (!this.musicBus || !this.ctx) return;
    const gain = this.musicBus.gain;
    gain.cancelScheduledValues(this.ctx.currentTime);
    gain.setTargetAtTime(
      this.musicWanted ? (this.inRally ? 0.045 : 0.17) : 0,
      this.ctx.currentTime,
      0.12,
    );
  }

  music(enabled: boolean): void {
    if (this.musicWanted === enabled) return;
    this.musicWanted = enabled;
    if (enabled) this.startMusic();
    else this.setMusicLevel();
  }

  rally(active: boolean): void {
    if (this.inRally === active) return;
    this.inRally = active;
    this.setMusicLevel();
  }

  stop(): void {
    this.foreground = false;
    void this.ctx?.suspend().catch(() => {});
  }

  resume(): void {
    if (!this.ctx) return;
    void this.unlock();
  }

  play(sound: Sound, impact?: SoundImpact): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || !this.effectsBus || !this.foreground)
      return;
    const strength = limit((impact?.speed ?? 3) / 6, 0.18, 1);
    const distance = limit((impact?.depth ?? 0) / 2.74, 0, 1);
    const pan = limit((impact?.x ?? 0) / 0.7625, -1, 1) * 0.55;
    if (sound === "hit" || sound === "bounce") {
      const buffer =
        sound === "hit"
          ? this.buffers.get(clips[0])
          : this.buffers.get(clips[1 + (this.bounceIndex++ % 3)]!);
      const gain =
        (sound === "hit" ? 0.38 + strength * 0.32 : 0.22 + strength * 0.2) *
        (1 - distance * 0.28);
      if (buffer) {
        const variation = [-0.016, 0.009, -0.005, 0.018, 0][
          this.hitIndex++ % 5
        ]!;
        this.sample(buffer, gain, pan, 0.98 + strength * 0.045 + variation);
      } else {
        this.sample(this.fallback(sound), gain * 0.65, pan);
      }
      return;
    }
    if (sound === "net") {
      this.sample(this.fallback("net"), 0.2 + strength * 0.13, pan);
    } else if (sound === "button") {
      this.sample(this.fallback("button"), 0.075);
    } else {
      this.chime(
        sound === "win" ? [62, 66, 69, 74] : [69, 74],
        sound === "win" ? 0.07 : 0.035,
      );
    }
  }

  private sample(buffer: AudioBuffer, volume: number, pan = 0, rate = 1): void {
    const ctx = this.ctx!,
      source = ctx.createBufferSource(),
      gain = ctx.createGain();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    gain.gain.value = volume;
    const stereo = ctx.createStereoPanner();
    stereo.pan.value = pan;
    source.connect(gain);
    gain.connect(stereo);
    stereo.connect(this.effectsBus!);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      stereo.disconnect();
    };
    source.start();
  }

  private fallback(kind: "hit" | "bounce" | "net" | "button"): AudioBuffer {
    const key = `fallback:${kind}`,
      cached = this.buffers.get(key);
    if (cached) return cached;
    const ctx = this.ctx!,
      length = kind === "net" ? 0.11 : 0.055;
    const buffer = ctx.createBuffer(
      1,
      Math.ceil(ctx.sampleRate * length),
      ctx.sampleRate,
    );
    const samples = buffer.getChannelData(0);
    let filtered = 0;
    for (let i = 0; i < samples.length; i++) {
      const time = i / ctx.sampleRate;
      filtered = filtered * 0.62 + (Math.random() * 2 - 1) * 0.38;
      const noise = kind === "net" ? filtered : Math.random() * 2 - 1;
      const resonance =
        kind === "net" || kind === "button"
          ? 0
          : 0.25 *
            Math.sin(2 * Math.PI * (kind === "hit" ? 1250 : 1850) * time);
      const attack = Math.min(1, time / 0.0006);
      samples[i] =
        (noise * 0.65 + resonance) *
        attack *
        Math.exp(-time * (kind === "net" ? 65 : 170));
    }
    this.buffers.set(key, buffer);
    return buffer;
  }

  private chime(notes: number[], volume: number): void {
    const ctx = this.ctx!;
    notes.forEach((note, index) => {
      const start = ctx.currentTime + index * 0.075;
      const gain = ctx.createGain(),
        osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = 440 * 2 ** ((note - 69) / 12);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      osc.connect(gain);
      gain.connect(this.effectsBus!);
      osc.start(start);
      osc.stop(start + 0.23);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    });
  }
}
