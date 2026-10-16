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
  }
  configure({enabled, volume}, localEnabled = this.localEnabled) {
    this.enabled = enabled;
    this.volume = volume;
    this.localEnabled = localEnabled;
    if (this.master) this.master.gain.setValueAtTime(enabled && localEnabled ? volume : 0, this.context.currentTime);
    if (!enabled || !localEnabled || !volume) {
      for (const voice of this.voices) { try { voice.stop(); } catch {} }
      this.voices.clear();
      this.nextGiftAt = 0;
    }
  }
  async unlock() {
    if (!this.context) {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) return false;
      this.context = new Audio();
      this.master = this.context.createGain();
      this.master.connect(this.context.destination);
      this.configure({enabled:this.enabled,volume:this.volume});
    }
    if (this.context.state === 'suspended') await this.context.resume();
    return this.context.state === 'running';
  }
  play(kind, side) {
    const ctx = this.context;
    if (!this.enabled || !this.localEnabled || !this.volume || ctx?.state !== 'running') return false;
    const base = side === 'flavio' ? 740 : 620;
    const notes = {gift:[[0,base,.065],[.055,base*1.3,.09]],start:[[0,440,.09],[.1,660,.12]],tick:[[0,900,.045]],win:[[0,523,.14],[.16,659,.14],[.32,784,.27]],tie:[[0,440,.12],[.15,440,.2]]}[kind];
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
