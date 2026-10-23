/**
 * Tiny procedural sound engine on the Web Audio API — every sound is synthesized,
 * so there are no audio files to download.
 */
export type SoundName = 'footstep' | 'door' | 'click' | 'tick' | 'puff' | 'clink' | 'pickup' | 'ui' | 'beep' | 'whoosh' | 'success' | 'pour' | 'fizz' | 'shatter' | 'thud' | 'bubble' | 'throw' | 'moleculeTick' | 'reactionFizz' | 'crystalCrackle' | 'eruption' | 'sizzle' | 'slideOpen' | 'slideClose' | 'hingeOpen' | 'hingeClose' | 'latch';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private volume = 0.7;

  /** Must be called from a user gesture (browser autoplay policy). */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  private env(gain: GainNode, t: number, attack: number, peak: number, decay: number): void {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private noiseBurst(t: number, opts: { type: BiquadFilterType; freq: number; q?: number; peak: number; attack: number; decay: number; sweepTo?: number }): void {
    if (!this.ctx || !this.master || !this.noise) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const filter = this.ctx.createBiquadFilter();
    filter.type = opts.type;
    filter.frequency.setValueAtTime(opts.freq, t);
    if (opts.sweepTo) filter.frequency.exponentialRampToValueAtTime(opts.sweepTo, t + opts.attack + opts.decay);
    filter.Q.value = opts.q ?? 0.8;
    const gain = this.ctx.createGain();
    this.env(gain, t, opts.attack, opts.peak, opts.decay);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + opts.attack + opts.decay + 0.05);
  }

  private tone(t: number, freq: number, opts: { type?: OscillatorType; peak: number; attack: number; decay: number; slideTo?: number }): void {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t + opts.attack + opts.decay);
    const gain = this.ctx.createGain();
    this.env(gain, t, opts.attack, opts.peak, opts.decay);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + opts.attack + opts.decay + 0.05);
  }

  play(name: SoundName, intensity = 1): void {
    if (!this.ctx || this.volume <= 0) return;
    const t = this.ctx.currentTime + 0.005;
    const k = intensity;
    switch (name) {
      case 'moleculeTick':
        this.tone(t, 1600 + Math.random() * 700, { peak: .015 * k, attack: .001, decay: .018 });
        break;
      case 'eruption':
        this.noiseBurst(t, { type: 'lowpass', freq: 900, sweepTo: 2800, peak: .38*k, attack:.12, decay:.9 });
        this.tone(t,110,{peak:.14*k,attack:.08,decay:.6,slideTo:55});
        break;
      case 'sizzle':
        this.noiseBurst(t,{type:'highpass',freq:5000,peak:.09*k,attack:.02,decay:.28});
        break;
      case 'reactionFizz':
        this.noiseBurst(t, { type: 'highpass', freq: 2700, peak: .17 * k, attack: .035, decay: .28 });
        this.noiseBurst(t, { type: 'bandpass', freq: 650, q: .8, peak: .09*k, attack: .025, decay: .22 });
        break;
      case 'crystalCrackle':
        this.noiseBurst(t, { type: 'bandpass', freq: 2700, peak: .035 * k, attack: .002, decay: .045 });
        this.tone(t, 3200, { peak: .012 * k, attack: .002, decay: .06 });
        break;
      case 'footstep':
        this.noiseBurst(t, { type: 'lowpass', freq: 520 + Math.random() * 220, q: 0.7, peak: 0.16 * k, attack: 0.004, decay: 0.09 });
        this.tone(t, 90 + Math.random() * 20, { peak: 0.05 * k, attack: 0.003, decay: 0.06 });
        break;
      case 'door':
        this.noiseBurst(t, { type: 'bandpass', freq: 380, sweepTo: 1100, q: 1.2, peak: 0.12 * k, attack: 0.08, decay: 0.6 });
        this.tone(t + 0.62, 70, { peak: 0.08 * k, attack: 0.005, decay: 0.12 });
        break;
      case 'click':
        this.tone(t, 2200, { type: 'square', peak: 0.05 * k, attack: 0.001, decay: 0.025 });
        this.noiseBurst(t, { type: 'highpass', freq: 2500, peak: 0.12 * k, attack: 0.001, decay: 0.03 });
        break;
      case 'tick':
        this.noiseBurst(t, { type: 'highpass', freq: 3800, peak: 0.07 * k, attack: 0.001, decay: 0.012 });
        break;
      case 'puff':
        this.noiseBurst(t, { type: 'lowpass', freq: 1800, sweepTo: 500, peak: 0.22 * k, attack: 0.02, decay: 0.3 });
        break;
      case 'clink':
        [2350, 3520, 5150].forEach((f, i) => this.tone(t + i * 0.004, f * (0.97 + Math.random() * 0.06), { peak: 0.06 * k / (i + 1), attack: 0.002, decay: 0.45 - i * 0.1 }));
        break;
      case 'pickup':
        this.tone(t, 420, { type: 'triangle', peak: 0.06 * k, attack: 0.005, decay: 0.09, slideTo: 640 });
        break;
      case 'ui':
        this.tone(t, 880, { type: 'sine', peak: 0.05 * k, attack: 0.003, decay: 0.07, slideTo: 1180 });
        break;
      case 'beep':
        this.tone(t, 1560, { type: 'square', peak: 0.035 * k, attack: 0.002, decay: 0.07 });
        break;
      case 'whoosh':
        this.noiseBurst(t, { type: 'bandpass', freq: 600, sweepTo: 2400, q: 0.9, peak: 0.07 * k, attack: 0.06, decay: 0.25 });
        break;
      case 'pour':
        this.noiseBurst(t, { type: 'bandpass', freq: 900, sweepTo: 2200, q: 1.4, peak: 0.1 * k, attack: 0.05, decay: 0.45 });
        [0.12, 0.2, 0.3].forEach((d, i) => this.tone(t + d, 700 + i * 220, { type: 'sine', peak: 0.03 * k, attack: 0.004, decay: 0.07, slideTo: 1100 + i * 260 }));
        break;
      case 'fizz':
        for (let i = 0; i < 6; i++) this.noiseBurst(t + i * 0.07, { type: 'highpass', freq: 4200 + Math.random() * 1500, peak: 0.05 * k, attack: 0.003, decay: 0.05 });
        break;
      case 'shatter':
        // Bright noise burst plus a cluster of high, detuned glass tones.
        this.noiseBurst(t, { type: 'highpass', freq: 2600, peak: 0.28 * k, attack: 0.002, decay: 0.32 });
        for (let i = 0; i < 9; i++) this.tone(t + Math.random() * 0.12, 2400 + Math.random() * 4200, { peak: 0.05 * k, attack: 0.001, decay: 0.12 + Math.random() * 0.3 });
        this.noiseBurst(t + 0.05, { type: 'bandpass', freq: 5200, q: 2, peak: 0.08 * k, attack: 0.004, decay: 0.5 });
        break;
      case 'thud':
        this.tone(t, 110, { type: 'sine', peak: 0.12 * k, attack: 0.002, decay: 0.12, slideTo: 60 });
        this.noiseBurst(t, { type: 'lowpass', freq: 700, peak: 0.12 * k, attack: 0.002, decay: 0.08 });
        break;
      case 'bubble':
        for (let i = 0; i < 4; i++) this.tone(t + i * 0.06 + Math.random() * 0.04, 500 + Math.random() * 500, { type: 'sine', peak: 0.025 * k, attack: 0.004, decay: 0.05, slideTo: 1400 });
        break;
      case 'throw':
        this.noiseBurst(t, { type: 'bandpass', freq: 900, sweepTo: 300, q: 1.1, peak: 0.08 * k, attack: 0.02, decay: 0.22 });
        break;
      case 'slideOpen':
        // Runner rumble rising in pitch, then a soft stop at full extension.
        this.noiseBurst(t, { type: 'bandpass', freq: 260, sweepTo: 620, q: 1.6, peak: 0.09 * k, attack: 0.03, decay: 0.32 });
        this.tone(t + 0.3, 120, { type: 'sine', peak: 0.05 * k, attack: 0.003, decay: 0.08, slideTo: 80 });
        break;
      case 'slideClose':
        // The landing is a separate 'latch', played when the drawer actually arrives.
        this.noiseBurst(t, { type: 'bandpass', freq: 560, sweepTo: 240, q: 1.6, peak: 0.08 * k, attack: 0.02, decay: 0.28 });
        break;
      case 'hingeOpen':
        // Latch click, then a short low hinge sweep.
        this.noiseBurst(t, { type: 'highpass', freq: 2800, peak: 0.08 * k, attack: 0.001, decay: 0.025 });
        this.tone(t + 0.02, 180, { type: 'triangle', peak: 0.025 * k, attack: 0.04, decay: 0.3, slideTo: 260 });
        break;
      case 'hingeClose':
        this.tone(t, 240, { type: 'triangle', peak: 0.02 * k, attack: 0.03, decay: 0.22, slideTo: 170 });
        break;
      case 'latch':
        // Soft-close landing: a muffled thump and the catch clicking.
        this.tone(t, 90, { type: 'sine', peak: 0.1 * k, attack: 0.002, decay: 0.11, slideTo: 55 });
        this.noiseBurst(t, { type: 'lowpass', freq: 900, peak: 0.05 * k, attack: 0.002, decay: 0.05 });
        this.noiseBurst(t + 0.015, { type: 'highpass', freq: 2600, peak: 0.06 * k, attack: 0.001, decay: 0.025 });
        break;
      case 'success':
        [660, 880, 1320].forEach((f, i) => this.tone(t + i * 0.09, f, { type: 'triangle', peak: 0.05 * k, attack: 0.005, decay: 0.22 }));
        break;
    }
  }
}

export const sounds = new SoundEngine();
