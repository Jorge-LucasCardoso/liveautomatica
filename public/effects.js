export function portraitState(scores, side) {
  const other = side === 'lula' ? 'flavio' : 'lula';
  const total = scores.lula + scores.flavio;
  const lead = total ? (scores[side] - scores[other]) / total : 0;
  return {scale: 1 + Math.max(0, lead) * 0.14, grayscale: lead < 0 ? 1 : 0};
}

// Only new, accepted gifts produce effects. Periodic state updates and reconnects are silent.
export function planEffects(previous, current) {
  if (!previous) return {gifts: [], cues: []};
  const lastId = Math.max(0, ...previous.events.map(event => event.id));
  const gifts = current.events.filter(event => event.id > lastId).reverse();
  const cues = [];
  if (current.phase === 'result' && previous.phase !== 'result') cues.push(['lula', 'flavio'].includes(current.winner) ? 'win' : 'tie');
  if (current.phase === 'voting') {
    if (previous.phase !== 'voting' || previous.round !== current.round) cues.push('start');
    else if (current.remaining >= 1 && current.remaining <= 3 && current.remaining !== previous.remaining) cues.push('tick');
  }
  return {gifts, cues};
}

export class SoundPlayer {
  constructor() {
    this.context = null;
    this.enabled = true;
    this.localEnabled = true;
    this.volume = 0.35;
    this.nextGiftAt = 0;
    this.voices = new Set();
    this.musicVoices = new Set();
    this.musicEnabled = true;
    this.musicVolume = .18;
    this.playing = false;
    this.musicStep = 0;
  }
  configure({enabled, volume, musicEnabled = this.musicEnabled, musicVolume = this.musicVolume}, localEnabled = this.localEnabled) {
    this.enabled = enabled;
    this.volume = volume;
    this.localEnabled = localEnabled;
    this.musicEnabled = musicEnabled;
    this.musicVolume = musicVolume;
    if (this.master) this.master.gain.setValueAtTime(enabled && localEnabled ? volume : 0, this.context.currentTime);
    if (!enabled || !localEnabled || !volume) {
      for (const voice of this.voices) { try { voice.stop(); } catch {} }
      this.voices.clear();
      this.nextGiftAt = 0;
    }
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(musicEnabled && localEnabled ? musicVolume : 0, this.context.currentTime, .02);
    this.syncMusic();
  }
  async unlock() {
    if (!this.context) {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) return false;
      this.context = new Audio();
      this.master = this.context.createGain();
      this.master.connect(this.context.destination);
      this.musicBus = this.context.createGain();
      this.musicBus.connect(this.context.destination);
      this.configure({enabled:this.enabled,volume:this.volume});
    }
    if (this.context.state === 'suspended') await this.context.resume();
    this.syncMusic();
    return this.context.state === 'running';
  }
  setPlaying(playing) { this.playing = playing; this.syncMusic(); }
  syncMusic() {
    const active = this.context?.state === 'running' && this.playing && this.musicEnabled && this.localEnabled && this.musicVolume > 0;
    if (!active) {
      clearInterval(this.musicTimer); this.musicTimer = null;
      for (const voice of this.musicVoices) {try {voice.stop();} catch {}}
      this.musicVoices.clear();
      return;
    }
    if (this.musicTimer) return;
    this.nextMusicAt = this.context.currentTime + .03;
    this.scheduleMusic();
    this.musicTimer = setInterval(()=>this.scheduleMusic(),80);
  }
  scheduleMusic() {
    const ctx = this.context;
    const stepDuration = 60 / 112 / 2;
    if (this.nextMusicAt < ctx.currentTime - .1) this.nextMusicAt = ctx.currentTime + .02;
    // Original 8-bit melody, bass and arpeggio; no external recording or game soundtrack.
    const melody = [76,0,79,81,79,76,74,72, 72,76,77,0,76,72,69,72, 76,79,84,83,79,76,74,76, 74,0,71,74,79,77,74,71,
      81,79,76,79,84,0,83,79, 77,76,72,76,81,79,76,72, 79,0,76,72,76,79,83,84, 83,79,74,71,74,76,79,0];
    const bass = [45,41,48,43];
    while (this.nextMusicAt < ctx.currentTime + .4) {
      const step = this.musicStep++ % melody.length;
      const time = this.nextMusicAt;
      if (melody[step]) this.musicNote(melody[step],time,stepDuration*.7,'square',.055);
      if (step % 2 === 0) this.musicNote(bass[Math.floor(step/8)%4],time,stepDuration*1.5,'triangle',.13);
      if (step % 2 === 1) this.musicNote(bass[Math.floor(step/8)%4]+24+(step%4===1?7:12),time,stepDuration*.45,'triangle',.06);
      this.nextMusicAt += stepDuration;
    }
  }
  musicNote(midi, start, duration, type, level) {
    const ctx = this.context;
    const voice = ctx.createOscillator(); const envelope = ctx.createGain();
    voice.type = type; voice.frequency.setValueAtTime(440 * 2 ** ((midi-69)/12),start);
    envelope.gain.setValueAtTime(0,start); envelope.gain.linearRampToValueAtTime(level,start+.008);
    envelope.gain.exponentialRampToValueAtTime(.001,start+duration);
    voice.connect(envelope);envelope.connect(this.musicBus);
    this.musicVoices.add(voice);
    voice.onended=()=>{this.musicVoices.delete(voice);voice.disconnect();envelope.disconnect();};
    voice.start(start);voice.stop(start+duration+.01);
  }
  play(kind, side) {
    const ctx = this.context;
    if (!this.enabled || !this.localEnabled || !this.volume || ctx?.state !== 'running') return false;
    const base = side === 'flavio' ? 740 : 620;
    const notes = {gift:[[0,base,.065],[.055,base*1.3,.09]],galaxy:[[0,523,.1],[.08,784,.1],[.16,1046,.2]],start:[[0,440,.09],[.1,660,.12]],tick:[[0,900,.045]],win:[[0,523,.14],[.16,659,.14],[.32,784,.27]],tie:[[0,440,.12],[.15,440,.2]]}[kind];
    if (!notes) return false;
    // Coalesce very dense gift bursts instead of accumulating an audible queue.
    if (kind === 'gift' && this.nextGiftAt > ctx.currentTime + 0.25) return false;
    const start = kind === 'gift' ? Math.max(ctx.currentTime, this.nextGiftAt) : ctx.currentTime;
    if (kind === 'gift') this.nextGiftAt = start + 0.075;
    for (const [offset, frequency, duration] of notes) {
      const oscillator = ctx.createOscillator();
      const envelope = ctx.createGain();
      oscillator.type = kind === 'tick' ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(frequency,start + offset);
      envelope.gain.setValueAtTime(0,start + offset);
      envelope.gain.linearRampToValueAtTime(.16,start + offset + .008);
      envelope.gain.exponentialRampToValueAtTime(.001,start + offset + duration);
      oscillator.connect(envelope); envelope.connect(this.master);
      this.voices.add(oscillator);
      oscillator.onended = () => {this.voices.delete(oscillator); oscillator.disconnect(); envelope.disconnect();};
      oscillator.start(start + offset); oscillator.stop(start + offset + duration + .01);
    }
    return true;
  }
}
