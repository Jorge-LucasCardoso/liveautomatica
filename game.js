export class Game {
  constructor({duration = 300, resultDuration = 5, galaxySeconds = 300, now = Date.now} = {}) {
    this.now = now;
    this.duration = duration;
    this.resultDuration = resultDuration;
    this.galaxySeconds = galaxySeconds;
    this.round = 0;
    this.phase = 'waiting';
    this.scores = {lula: 0, flavio: 0};
    this.events = [];
    this.eventSequence = 0;
    this.seen = new Set();
    this.presentationQueue = [];
    this.participants = [];
  }
  start() {
    this.round++;
    this.phase = 'voting';
    this.endsAt = this.now() + this.duration * 1000;
    this.scores = {lula: 0, flavio: 0};
    this.events = [];
  }
  stop() { this.phase = 'waiting'; }
  advance() {
    if (this.phase === 'voting' && this.now() >= this.endsAt) {
      this.phase = 'result';
      this.endsAt = this.now() + this.resultDuration * 1000;
    } else if (this.phase === 'result' && this.now() >= this.endsAt) this.start();
  }
  clearPresentations() { this.presentationQueue = []; this.participants = []; }
  advancePresentations() {
    this.participants = this.participants.filter(event => event.visibleUntil > this.now());
    while (this.participants.length < 2 && this.presentationQueue.length) {
      this.participants.push({...this.presentationQueue.shift(), visibleUntil: this.now() + 4000});
    }
  }
  gift(side, count, user, id, avatar = '') {
    this.advance();
    if (this.phase !== 'voting' || !['lula', 'flavio', 'time'].includes(side) || !Number.isSafeInteger(count) || count < 1 || count > 100000) return false;
    if (id && this.seen.has(id)) return false;
    if (id) {
      this.seen.add(id);
      if (this.seen.size > 10000) this.seen.delete(this.seen.values().next().value);
    }
    const seconds = side === 'time' ? count * this.galaxySeconds : 0;
    if (side === 'time') this.endsAt += seconds * 1000;
    else this.scores[side] += count;
    const event = {id: ++this.eventSequence, side, count, seconds, avatar: safeAvatar(avatar), round: this.round, user: String(user || 'Participante').replace(/^@/, '').slice(0, 60), at: this.now()};
    this.events.unshift(event);
    this.events = this.events.slice(0, 4);
    this.presentationQueue.push(event);
    this.advancePresentations();
    return true;
  }
  snapshot() {
    this.advance();
    this.advancePresentations();
    const {lula, flavio} = this.scores;
    const total = lula + flavio;
    const left = total ? Math.round(lula / total * 1000) / 10 : 50;
    return {phase: this.phase, round: this.round, scores: this.scores, total,
      percentages: {lula: left, flavio: 100 - left},
      remaining: this.phase === 'waiting' ? this.duration : Math.max(0, Math.ceil((this.endsAt - this.now()) / 1000)),
      winner: total === 0 ? 'empty' : lula === flavio ? 'tie' : lula > flavio ? 'lula' : 'flavio', events: this.events,
      participants: this.participants, pendingParticipants: this.presentationQueue.length};
  }
}

export function safeAvatar(value) {
  if (typeof value !== 'string' || value.length > 4096) return '';
  try {const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';} catch {return '';}
}

export function receiveGift(game, data, ids) {
  // TikTok repeats cumulative combo counts; count only the completed combo.
  if (Number(data.giftDetails?.giftType ?? data.giftType) === 1 && !data.repeatEnd) return false;
  const giftId = String(data.giftId ?? '');
  const side = ids.lula && giftId === ids.lula ? 'lula' : ids.flavio && giftId === ids.flavio ? 'flavio' : ids.galaxy && giftId === ids.galaxy ? 'time' : null;
  const group = String(data.groupId ?? '0');
  const msg = String(data.common?.msgId ?? data.msgId ?? '');
  const id = group !== '0' ? `${data.user?.userId}:${giftId}:${group}` : msg ? `msg:${msg}` : undefined;
  const user = data.user;
  const avatar = user?.avatarThumb?.urlList?.[0] ?? user?.avatarLarge?.urlList?.[0] ?? user?.profilePicture?.urlList?.[0] ?? data.profilePictureUrl;
  return game.gift(side, Number(data.repeatCount ?? 1), user?.uniqueId ?? user?.nickname, id, avatar);
}
