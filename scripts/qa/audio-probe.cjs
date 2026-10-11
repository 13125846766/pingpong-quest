// Observes the real browser graph without replacing its audio implementation.
function installAudioProbe() {
  window.qaAudio = { contexts: [], decoded: [], starts: [] };
  const NativeAudio = window.AudioContext;
  window.AudioContext = class extends NativeAudio {
    constructor(...args) {
      super(...args);
      this.qaGains = [];
      window.qaAudio.contexts.push(this);
    }
    createGain() {
      const node = super.createGain();
      this.qaGains.push(node);
      return node;
    }
    createBufferSource() {
      const node = super.createBufferSource(),
        start = node.start.bind(node);
      node.start = (...args) => {
        window.qaAudio.starts.push({
          loop: node.loop,
          duration: node.buffer?.duration,
          channels: node.buffer?.numberOfChannels,
          rate: node.playbackRate.value,
          at: this.currentTime,
        });
        return start(...args);
      };
      return node;
    }
    async decodeAudioData(...args) {
      const buffer = await super.decodeAudioData(...args);
      const samples = buffer.getChannelData(0);
      let peak = 0;
      for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
      window.qaAudio.decoded.push({
        duration: buffer.duration,
        peak,
        sampleRate: buffer.sampleRate,
      });
      return buffer;
    }
  };
}
function readAudioProbe() {
  const probe = window.qaAudio;
  return {
    contexts: probe.contexts.map((ctx) => ({
      state: ctx.state,
      currentTime: ctx.currentTime,
      musicLevel: ctx.qaGains[1]?.gain.value,
    })),
    decoded: probe.decoded,
    loops: probe.starts.filter((start) => start.loop),
    recordedHits: probe.starts.filter(
      (start) => !start.loop && Math.abs(start.duration - 0.23) < 0.001,
    ),
    recordedBounces: probe.starts.filter(
      (start) => !start.loop && Math.abs(start.duration - 0.17) < 0.001,
    ),
  };
}
module.exports = { installAudioProbe, readAudioProbe };
