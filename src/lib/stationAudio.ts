// Procedural Space Station Audio Engine: Ambient Background Music + Footsteps
class StationAudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isMusicPlaying: boolean = false;
  private lastStepTime: number = 0;
  private stepSide: boolean = false;
  private musicNodes: (AudioNode | number)[] = [];
  private nextChordTimeout: any = null;

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Low volume background music as requested (subtle background bed)
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.02, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      // Footstep SFX gain (boosted so footsteps are clearly audible)
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.55, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  public async resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        // ignore
      }
    }
    if (!this.isMusicPlaying) {
      this.startAmbientMusic();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.isMuted ? 0 : 1.0,
        this.ctx.currentTime,
        0.05
      );
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Ethereal low-volume space station ambient synth drone & chord swells
  public startAmbientMusic() {
    if (!this.ctx || this.isMusicPlaying || this.isMuted) return;
    this.isMusicPlaying = true;

    try {
      const now = this.ctx.currentTime;

      // Master low-pass filter to keep music warm, soft and gentle in the background
      const masterFilter = this.ctx.createBiquadFilter();
      masterFilter.type = 'lowpass';
      masterFilter.frequency.setValueAtTime(450, now);
      masterFilter.connect(this.musicGain!);

      // Sub-bass root drone (D1 ~ 73.4 Hz + D2 ~ 146.8 Hz)
      const droneOsc1 = this.ctx.createOscillator();
      const droneOsc2 = this.ctx.createOscillator();
      const droneGain = this.ctx.createGain();

      droneOsc1.type = 'sine';
      droneOsc1.frequency.setValueAtTime(73.42, now); // D1

      droneOsc2.type = 'triangle';
      droneOsc2.frequency.setValueAtTime(146.83, now); // D2

      droneGain.gain.setValueAtTime(0.12, now);

      droneOsc1.connect(droneGain);
      droneOsc2.connect(droneGain);
      droneGain.connect(masterFilter);

      droneOsc1.start(now);
      droneOsc2.start(now);
      this.musicNodes.push(droneOsc1, droneOsc2);

      // Sci-fi drifting chord progression: Dm9 -> Bbmaj7 -> Fsus2 -> Asus4
      const chords = [
        [220.0, 261.63, 329.63, 440.0],   // A3, C4, E4, A4 (Dm9 flavor)
        [233.08, 293.66, 349.23, 440.0],  // Bb3, D4, F4, A4 (Bbmaj7)
        [174.61, 261.63, 349.23, 392.0],  // F3, C4, F4, G4 (Fsus2)
        [220.0, 293.66, 329.63, 440.0],   // A3, D4, E4, A4 (Asus4)
      ];

      let chordIdx = 0;

      const playChordSwell = () => {
        if (!this.ctx || !this.isMusicPlaying) return;
        const chord = chords[chordIdx % chords.length];
        chordIdx++;
        const startTime = this.ctx.currentTime;
        const duration = 8.5; // slow 8.5s peaceful swell

        chord.forEach((freq) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);
          // Subtle detune for shimmer
          osc.detune.setValueAtTime((Math.random() - 0.5) * 8, startTime);

          // Gentle fade in and long fade out
          gain.gain.setValueAtTime(0.001, startTime);
          gain.gain.linearRampToValueAtTime(0.02, startTime + 3.0);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

          osc.connect(gain);
          gain.connect(masterFilter);

          osc.start(startTime);
          osc.stop(startTime + duration + 0.5);
        });

        this.nextChordTimeout = setTimeout(playChordSwell, 7500);
      };

      playChordSwell();
    } catch (e) {
      console.warn('Error starting ambient music:', e);
    }
  }

  // Realistic space station metallic footstep sound
  public playFootstep(isSprinting: boolean = false) {
    if (!this.ctx || this.isMuted) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const now = this.ctx.currentTime;
    const interval = isSprinting ? 0.24 : 0.36;
    if (now - this.lastStepTime < interval) return;
    this.lastStepTime = now;
    this.stepSide = !this.stepSide;

    try {
      // Alternate subtle stereo panning between left (-0.22) and right (+0.22)
      let dest: AudioNode = this.sfxGain!;
      if (this.ctx.createStereoPanner) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(this.stepSide ? -0.22 : 0.22, now);
        panner.connect(this.sfxGain!);
        dest = panner;
      }

      // 1. Low metallic step thud (heel contact on station grating)
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      const baseFreq = this.stepSide ? 96 : 88;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq + Math.random() * 8, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.08);

      oscGain.gain.setValueAtTime(0.48, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(oscGain);
      oscGain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.09);

      // 2. High-frequency click / friction on metal grating
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.035);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600 + (this.stepSide ? 140 : 0), now);
      filter.Q.setValueAtTime(2.0, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.30, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(dest);
      noise.start(now);
      noise.stop(now + 0.04);
    } catch {
      // ignore
    }
  }

  public stop() {
    if (this.nextChordTimeout) {
      clearTimeout(this.nextChordTimeout);
      this.nextChordTimeout = null;
    }
    this.musicNodes.forEach((node) => {
      try {
        if ('stop' in node && typeof node.stop === 'function') {
          node.stop();
        }
      } catch {
        // ignore
      }
    });
    this.musicNodes = [];
    this.isMusicPlaying = false;
  }
}

export const stationAudio = new StationAudioManager();
export default stationAudio;
