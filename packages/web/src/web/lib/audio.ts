import { timing, type Settings } from "./show";
const assets = [
  "hook1",
  "reveal1",
  "hook2",
  "reveal2",
  "hook3",
  "reveal3",
  "outro",
  "music",
];
export class ShowAudio {
  context: AudioContext | null = null;
  buffers: AudioBuffer[] = [];
  analyser: AnalyserNode | null = null;
  destination: MediaStreamAudioDestinationNode | null = null;
  musicGain: GainNode | null = null;
  voiceGain: GainNode | null = null;
  fxGain: GainNode | null = null;
  sources: AudioScheduledSourceNode[] = [];
  ready = false;
  data = new Uint8Array(256);
  async init() {
    if (this.ready) {
      await this.context!.resume();
      return;
    }
    this.context ??= new AudioContext();
    await this.context.resume();
    const ctx = this.context;
    this.musicGain = ctx.createGain();
    this.voiceGain = ctx.createGain();
    this.fxGain = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.data = new Uint8Array(512);
    this.destination = ctx.createMediaStreamDestination();
    const master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(ctx.destination);
    master.connect(this.destination);
    this.musicGain.connect(master);
    this.voiceGain.connect(this.analyser);
    this.analyser.connect(master);
    this.fxGain.connect(master);
    this.buffers = await Promise.all(
      assets.map(async (name) => {
        const r = await fetch(`/audio/${name}_1794344440309.mp3`);
        if (!r.ok) throw new Error("Could not load narration");
        return ctx.decodeAudioData(await r.arrayBuffer());
      }),
    );
    this.ready = true;
  }
  volumes(s: Settings) {
    if (!this.ready) return;
    this.musicGain!.gain.value = (s.music / 100) * 0.5;
    this.voiceGain!.gain.value = s.narration / 100;
    this.fxGain!.gain.value = (s.sfx / 100) * 0.3;
  }
  stop() {
    this.sources.forEach((src) => {
      try {
        src.stop();
      } catch {
        /* ended source */
      }
    });
    this.sources = [];
  }
  play(t: number, s: Settings) {
    if (!this.ready) return;
    this.stop();
    this.volumes(s);
    const ctx = this.context!;
    const now = ctx.currentTime;
    const q = timing(s);
    const rate = s.voice === "Charlie · High energy" ? 1.06 : 1;
    const schedule = (
      buffer: AudioBuffer,
      start: number,
      gain: GainNode,
      loop = false,
    ) => {
      const elapsed = t - start;
      if (!loop && elapsed > buffer.duration / rate) return;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = loop;
      src.playbackRate.value = loop ? 1 : rate;
      src.connect(gain);
      const offset = loop ? t % buffer.duration : Math.max(0, elapsed * rate);
      src.start(now + Math.max(0, start - t), offset);
      this.sources.push(src);
    };
    schedule(this.buffers[7], 0, this.musicGain!, true);
    for (let i = 0; i < 3; i++) {
      schedule(this.buffers[i * 2], i * q.length, this.voiceGain!);
      schedule(
        this.buffers[i * 2 + 1],
        i * q.length + q.intro + q.count,
        this.voiceGain!,
      );
      for (let j = 0; j < s.countdown; j++)
        this.tone(i * q.length + q.intro + j - t, 740, 0.045, false);
      this.tone(i * q.length + q.intro + q.count - t, 523, 0.18, true);
    }
    schedule(this.buffers[6], q.length * 3, this.voiceGain!);
  }
  tone(delay: number, freq: number, duration: number, reveal: boolean) {
    if (delay < 0) return;
    const ctx = this.context!;
    const start = ctx.currentTime + delay;
    const tones = reveal ? [freq, freq * 1.25, freq * 1.5] : [freq];
    tones.forEach((f, i) => {
      const osc = ctx.createOscillator(),
        g = ctx.createGain();
      osc.type = reveal ? "sine" : "triangle";
      osc.frequency.value = f;
      g.gain.setValueAtTime(0, start + i * 0.09);
      g.gain.linearRampToValueAtTime(0.45, start + i * 0.09 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, start + i * 0.09 + duration);
      osc.connect(g);
      g.connect(this.fxGain!);
      osc.start(start + i * 0.09);
      osc.stop(start + i * 0.09 + duration + 0.01);
      this.sources.push(osc);
    });
  }
  amplitude() {
    if (!this.analyser) return 0;
    this.analyser.getByteTimeDomainData(this.data as Uint8Array<ArrayBuffer>);
    let sum = 0;
    for (const n of this.data) sum += ((n - 128) / 128) ** 2;
    const rms = Math.sqrt(sum / this.data.length);
    return rms < 0.009 ? 0 : Math.min(1, rms * 9);
  }
}
