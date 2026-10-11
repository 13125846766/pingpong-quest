const BEAT = 60 / 78;
const BARS = 16;

/** One original sixteen-bar phrase, including its natural looping release. */
export const MUSIC_DURATION = BARS * 4 * BEAT;

type Stereo = [Float32Array, Float32Array];
type Instrument = "keys" | "pluck" | "bass";
type Note = {
  beat: number;
  pitch: number;
  length: number;
  level: number;
  pan: number;
  instrument: Instrument;
};

const cached = new Map<number, Stereo>();

// Warm voicings stay below the melody. The second half changes the harmony
// before the last two bars settle back into the opening D major chord.
const harmony = [
  [50, 57, 61, 64, 66], // Dmaj9
  [49, 57, 59, 64, 69], // Aadd9 / C#
  [47, 54, 57, 62, 66], // Bm7
  [43, 54, 57, 59, 62], // Gmaj9
  [40, 55, 59, 62, 66], // Em9
  [45, 55, 59, 62, 64], // A9sus4
  [42, 57, 61, 64, 66], // Dmaj9 / F#
  [43, 54, 57, 59, 62], // Gmaj9
  [47, 54, 57, 62, 66], // Bm7
  [42, 54, 57, 61, 64], // F#m7
  [43, 54, 57, 59, 62], // Gmaj9
  [45, 55, 59, 61, 64], // A9
  [40, 55, 59, 62, 66], // Em9
  [45, 55, 59, 62, 64], // A9sus4
  [50, 57, 61, 64, 66], // Dmaj9
  [45, 57, 59, 61, 64], // Aadd9
] as const;

// These phrases are intentionally sparse: held notes, answers and rests,
// rather than a new note on every beat.
const melody: readonly (readonly [number, number, number])[] = [
  [5, 64, 1.3],
  [7, 61, 0.8],
  [9.5, 66, 1.6],
  [11.5, 64, 0.7],
  [13, 62, 2.2],
  [17.5, 64, 1.6],
  [19.5, 66, 0.8],
  [21, 64, 2.1],
  [25, 61, 1.1],
  [26.5, 62, 1.0],
  [28.5, 59, 2.3],
  [33, 66, 1.2],
  [34.5, 69, 1.3],
  [37, 68, 2.1],
  [41, 66, 1.4],
  [43, 62, 0.9],
  [45.5, 64, 2.0],
  [49, 62, 1.6],
  [51.5, 59, 0.8],
  [53, 61, 2.2],
  [57, 62, 3.0],
];

function score(): Note[] {
  const notes: Note[] = [];
  for (let bar = 0; bar < BARS; bar++) {
    const chord = harmony[bar]!;
    const beat = bar * 4;
    notes.push({
      beat,
      pitch: chord[0],
      length: 2.7,
      level: 0.24,
      pan: 0,
      instrument: "bass",
    });
    // A slightly spread chord attack feels played instead of quantized.
    for (let voice = 1; voice < chord.length; voice++) {
      notes.push({
        beat: beat + (voice - 1) * 0.028,
        pitch: chord[voice]!,
        length: bar % 4 === 3 ? 3.2 : 2.8,
        level: 0.13 + ((bar + voice) % 3) * 0.008,
        pan: (voice - 2.5) * 0.14,
        instrument: "keys",
      });
    }
    if (bar % 4 !== 3) {
      notes.push({
        beat: beat + 2.65,
        pitch: chord[2],
        length: 1.5,
        level: 0.075,
        pan: -0.28,
        instrument: "pluck",
      });
    }
  }
  melody.forEach(([beat, pitch, length], i) => {
    notes.push({
      beat: beat + [0.014, -0.01, 0.024, 0][i % 4]!,
      pitch,
      length,
      level: 0.23 + (i % 3) * 0.012,
      pan: 0.18,
      instrument: "pluck",
    });
  });
  return notes;
}

function addNote(output: Stereo, sampleRate: number, note: Note): void {
  const size = output[0].length;
  const start = Math.round(note.beat * BEAT * sampleRate);
  const hold = note.length * BEAT;
  const release = note.instrument === "bass" ? 0.18 : 0.32;
  const duration = hold + release * 8;
  const count = Math.ceil(duration * sampleRate);
  const frequency = 440 * 2 ** ((note.pitch - 69) / 12);
  const angle = ((note.pan + 1) * Math.PI) / 4;
  const left = Math.cos(angle) * note.level;
  const right = Math.sin(angle) * note.level;
  const phaseStep = (2 * Math.PI * frequency) / sampleRate;
  const isBass = note.instrument === "bass";
  const isKeys = note.instrument === "keys";
  const fundamental = isBass ? 0.86 : 0.78;
  let harmonic2 = isBass ? 0.11 : isKeys ? 0.16 : 0.14;
  let harmonic3 = isBass ? 0 : isKeys ? 0.055 : 0.07;
  let harmonic4 = isBass ? 0 : isKeys ? 0.018 : 0.025;
  const decay2 = Math.exp(-(isBass ? 2 : isKeys ? 1.4 : 3) / sampleRate);
  const decay3 = Math.exp(-(isKeys ? 3.2 : 5) / sampleRate);
  const decay4 = Math.exp(-(isKeys ? 5 : 8) / sampleRate);
  const onsetDecay = Math.exp(-1 / (sampleRate * (isBass ? 0.018 : 0.008)));
  const sustainDecay = Math.exp(-1 / (sampleRate * (hold * 0.85 + 0.2)));
  const releaseDecay = Math.exp(-1 / (sampleRate * release));
  const holdSamples = Math.round(hold * sampleRate);
  let onset = 1;
  let sustain = 1;
  let tail = 1;
  let sine1 = 0,
    cosine1 = 1;
  let sine2 = 0,
    cosine2 = 1;
  let sine3 = 0,
    cosine3 = 1;
  let sine4 = 0,
    cosine4 = 1;
  const stepSine1 = Math.sin(phaseStep),
    stepCosine1 = Math.cos(phaseStep);
  const stepSine2 = Math.sin(phaseStep * 2),
    stepCosine2 = Math.cos(phaseStep * 2);
  const stepSine3 = Math.sin(phaseStep * 3),
    stepCosine3 = Math.cos(phaseStep * 3);
  const stepSine4 = Math.sin(phaseStep * (isKeys ? 4.005 : 4));
  const stepCosine4 = Math.cos(phaseStep * (isKeys ? 4.005 : 4));
  let index = (start + size) % size;

  // Rotate each oscillator by one sample. This avoids millions of sine and
  // exponential calls while constructing the loop on slower phones.
  for (let i = 0; i < count; i++) {
    const signal =
      (sine1 * fundamental +
        sine2 * harmonic2 +
        sine3 * harmonic3 +
        sine4 * harmonic4) *
      (1 - onset) *
      sustain *
      tail;
    output[0][index] = output[0][index]! + signal * left;
    output[1][index] = output[1][index]! + signal * right;
    if (++index === size) index = 0;
    const nextSine1 = sine1 * stepCosine1 + cosine1 * stepSine1;
    cosine1 = cosine1 * stepCosine1 - sine1 * stepSine1;
    sine1 = nextSine1;
    const nextSine2 = sine2 * stepCosine2 + cosine2 * stepSine2;
    cosine2 = cosine2 * stepCosine2 - sine2 * stepSine2;
    sine2 = nextSine2;
    const nextSine3 = sine3 * stepCosine3 + cosine3 * stepSine3;
    cosine3 = cosine3 * stepCosine3 - sine3 * stepSine3;
    sine3 = nextSine3;
    const nextSine4 = sine4 * stepCosine4 + cosine4 * stepSine4;
    cosine4 = cosine4 * stepCosine4 - sine4 * stepSine4;
    sine4 = nextSine4;
    harmonic2 *= decay2;
    harmonic3 *= decay3;
    harmonic4 *= decay4;
    onset *= onsetDecay;
    sustain *= sustainDecay;
    if (i >= holdSamples) tail *= releaseDecay;
  }
}

/**
 * Creates a reusable stereo buffer. Tails wrap into the opening of the score,
 * so an AudioBufferSourceNode can loop without cutting off the final notes.
 * The mix peaks at 0.4; the playback bus controls the actual listening level.
 */
export function renderMusic(sampleRate: number): Stereo {
  if (
    !Number.isInteger(sampleRate) ||
    sampleRate < 8_000 ||
    sampleRate > 96_000
  ) {
    throw new RangeError(
      "Music sample rate must be an integer from 8000 to 96000.",
    );
  }
  const previous = cached.get(sampleRate);
  if (previous) return previous;
  const size = Math.round(MUSIC_DURATION * sampleRate);
  const output: Stereo = [new Float32Array(size), new Float32Array(size)];
  for (const note of score()) addNote(output, sampleRate, note);

  // Two offset taps add a small room impression without a long wash of reverb.
  // Both delays are circular, so the room also continues through the seam.
  const dry: Stereo = [output[0].slice(), output[1].slice()];
  const early = Math.round(0.063 * sampleRate);
  const late = Math.round(0.117 * sampleRate);
  let peak = 0;
  for (let i = 0; i < size; i++) {
    const earlyIndex = (i - early + size) % size;
    const lateIndex = (i - late + size) % size;
    const left =
      dry[0][i]! + dry[1][earlyIndex]! * 0.085 + dry[0][lateIndex]! * 0.045;
    const right =
      dry[1][i]! + dry[0][earlyIndex]! * 0.085 + dry[1][lateIndex]! * 0.045;
    output[0][i] = left;
    output[1][i] = right;
    peak = Math.max(peak, Math.abs(left), Math.abs(right));
  }
  const level = 0.4 / Math.max(peak, 0.001);
  for (const channel of output) {
    for (let i = 0; i < size; i++) channel[i] = channel[i]! * level;
  }
  cached.set(sampleRate, output);
  return output;
}
