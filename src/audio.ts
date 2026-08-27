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
    this.tone(180, 0.06, { wave: "sine", gain: 0.05, slide: -50 });
  }
  bump(): void {
    this.tone(90, 0.07, { wave: "square", gain: 0.035 });
  }
  strike(): void {
    this.hiss(0.1, 0.09, 3200);
    this.tone(320, 0.09, { wave: "square", gain: 0.07, slide: -170 });
  }
  kill(): void {
    this.tone(420, 0.26, { wave: "triangle", gain: 0.09, slide: -320 });
  }
  zap(): void {
    this.tone(880, 0.13, { wave: "sawtooth", gain: 0.06, slide: 420 });
  }
  clang(): void {
    // Two detuned squares: the sound of a blade finding hide it cannot cut.
    this.tone(1180, 0.16, { wave: "square", gain: 0.05 });
    this.tone(1610, 0.13, { wave: "square", gain: 0.035 });
  }
  hurt(): void {
    this.hiss(0.22, 0.09, 700);
    this.tone(150, 0.32, { wave: "sawtooth", gain: 0.1, slide: -90 });
  }
  ward(): void {
    [660, 880, 1320].forEach((f, i) =>
      this.tone(f, 0.4, { wave: "sine", gain: 0.06, delay: i * 0.05 }),
    );
  }
  charge(): void {
    this.hiss(0.34, 0.1, 420);
    this.tone(70, 0.34, { wave: "sawtooth", gain: 0.1, slide: 40 });
  }
  door(): void {
    [523, 659, 784].forEach((f, i) =>
      this.tone(f, 0.3, { wave: "triangle", gain: 0.07, delay: i * 0.07 }),
    );
  }
  gift(): void {
    [392, 523, 659, 784].forEach((f, i) =>
      this.tone(f, 0.7, { wave: "sine", gain: 0.055, delay: i * 0.06 }),
    );
  }
  win(): void {
    [523, 659, 784, 1047].forEach((f, i) =>
      this.tone(f, 0.8, { wave: "triangle", gain: 0.08, delay: i * 0.13 }),
    );
  }
  lose(): void {
    [392, 330, 262, 196].forEach((f, i) =>
      this.tone(f, 0.75, { wave: "sine", gain: 0.08, delay: i * 0.16 }),
    );
  }
}
