// Small synthesised cues. Every one of them is a second channel for something
// already on screen --- a spark, a flinch, a lit doorway --- so the game reads
// exactly the same muted.

type Wave = OscillatorType;

export class Sound {
  muted = false;
  private ctx: AudioContext | null = null;

  private open(): AudioContext | null {
    if (this.muted) return null;
    // Browsers only grant an AudioContext off a gesture, so the first keypress
    // is what creates it.
    this.ctx ??= new AudioContext();
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private tone(
    freq: number,
    dur: number,
    { wave = "triangle" as Wave, gain = 0.12, slide = 0, delay = 0 } = {},
  ): void {
    const ctx = this.open();
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private hiss(dur: number, gain = 0.07, cutoff = 1800): void {
    const ctx = this.open();
    if (!ctx) return;
    const t = ctx.currentTime;
    const frames = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const amp = ctx.createGain();
    amp.gain.value = gain;
    src.connect(filter).connect(amp).connect(ctx.destination);
    src.start(t);
  }

  step(): void {
    this.tone(150, 0.05, { wave: "sine", gain: 0.05, slide: -30 });
  }

  /** Hermes' second tile: the same footfall, lifted. */
  wing(): void {
    this.tone(320, 0.07, { wave: "sine", gain: 0.05, slide: 240 });
    this.tone(520, 0.09, { wave: "sine", gain: 0.04, slide: 200, delay: 0.05 });
  }

  /** A wall. Dull, short, and clearly not a turn. */
  bump(): void {
    this.tone(88, 0.07, { wave: "square", gain: 0.05, slide: -24 });
  }

  /** Bronze on bone. The one cue the whole opening rests on. */
  strike(): void {
    this.hiss(0.09, 0.11, 5200);
    this.tone(680, 0.09, { wave: "square", gain: 0.09, slide: -420 });
    this.tone(240, 0.16, { wave: "triangle", gain: 0.1, slide: -120 });
  }

  /** A kill. The strike, plus the thing coming apart after it. */
  kill(): void {
    this.strike();
    this.hiss(0.24, 0.09, 2600);
    this.tone(420, 0.2, { wave: "triangle", gain: 0.09, slide: -300, delay: 0.05 });
    this.tone(196, 0.3, { wave: "sine", gain: 0.08, slide: -80, delay: 0.09 });
  }

  /** A blade turned on the Minotaur's hide. Nothing happened, and it sounds it. */
  clang(): void {
    this.tone(1180, 0.16, { wave: "square", gain: 0.06, slide: -160 });
    this.tone(880, 0.22, { wave: "sine", gain: 0.05, slide: -120, delay: 0.02 });
  }

  /** A mark going down: an intake of breath, rising. */
  charge(): void {
    this.tone(210, 0.16, { wave: "sawtooth", gain: 0.045, slide: 190 });
  }

  /** A mark going off, on empty floor or otherwise. */
  swipe(): void {
    this.hiss(0.13, 0.07, 3400);
    this.tone(520, 0.11, { wave: "sawtooth", gain: 0.05, slide: -320 });
  }

  /** The Minotaur crossing the room. */
  stampede(): void {
    this.hiss(0.3, 0.1, 900);
    this.tone(70, 0.3, { wave: "square", gain: 0.09, slide: 40 });
  }

  /** Horns into stone. This is the sound that says "now". */
  crash(): void {
    this.hiss(0.4, 0.13, 1500);
    this.tone(58, 0.42, { wave: "square", gain: 0.11, slide: -18 });
    this.tone(150, 0.24, { wave: "triangle", gain: 0.07, slide: -90, delay: 0.03 });
  }

  /** A heart gone. Low, and longer than anything else. */
  hurt(): void {
    this.tone(180, 0.34, { wave: "sawtooth", gain: 0.11, slide: -110 });
    this.tone(90, 0.42, { wave: "sine", gain: 0.09, slide: -40, delay: 0.03 });
  }

  /** Athena turning a blow, or Ares banking one. Bright and clean. */
  ward(): void {
    this.tone(880, 0.14, { wave: "sine", gain: 0.07, slide: 320 });
    this.tone(1320, 0.2, { wave: "sine", gain: 0.05, slide: 180, delay: 0.06 });
  }

  /** The gate unbarring itself. */
  door(): void {
    this.tone(300, 0.24, { wave: "triangle", gain: 0.08, slide: 220 });
    this.tone(600, 0.3, { wave: "sine", gain: 0.06, slide: 300, delay: 0.08 });
  }

  gift(): void {
    this.tone(523, 0.2, { wave: "sine", gain: 0.07 });
    this.tone(659, 0.22, { wave: "sine", gain: 0.06, delay: 0.09 });
    this.tone(784, 0.3, { wave: "sine", gain: 0.06, delay: 0.18 });
  }

  win(): void {
    [392, 523, 659, 784, 1047].forEach((f, i) =>
      this.tone(f, 0.5, { wave: "triangle", gain: 0.08, delay: i * 0.12 }),
    );
  }

  lose(): void {
    [294, 233, 175, 131].forEach((f, i) =>
      this.tone(f, 0.5, { wave: "sine", gain: 0.09, delay: i * 0.16 }),
    );
  }
}
