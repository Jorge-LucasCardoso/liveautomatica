export class Game {
  constructor({duration = 300, resultDuration = 5, now = Date.now} = {}) {
    this.now = now;
    this.duration = duration;
    this.resultDuration = resultDuration;
    this.round = 0;
    this.phase = 'waiting';
    this.scores = {lula: 0, flavio: 0};
    this.events = [];
    this.eventSequence = 0;
    this.seen = new Set();
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
  gift(side, count, user, id) {
    this.advance();
    if (this.phase !== 'voting' || !['lula', 'flavio'].includes(side) || !Number.isSafeInteger(count) || count < 1 || count > 100000) return false;
    if (id && this.seen.has(id)) return false;
    if (id) {
      this.seen.add(id);
      if (this.seen.size > 10000) this.seen.delete(this.seen.values().next().value);
    }
    this.scores[side] += count;
    this.events.unshift({id: ++this.eventSequence, side, count, user: String(user || 'Participante').slice(0, 60), at: this.now()});
    this.events = this.events.slice(0, 4);
    return true;
  }
  snapshot() {
    this.advance();
    const {lula, flavio} = this.scores;
    const total = lula + flavio;
    const left = total ? Math.round(lula / total * 1000) / 10 : 50;
    return {phase: this.phase, round: this.round, scores: this.scores, total,
      percentages: {lula: left, flavio: 100 - left},
      remaining: this.phase === 'waiting' ? this.duration : Math.max(0, Math.ceil((this.endsAt - this.now()) / 1000)),
      winner: total === 0 ? 'empty' : lula === flavio ? 'tie' : lula > flavio ? 'lula' : 'flavio', events: this.events};
  }
}

export function receiveGift(game, data, ids) {
  // TikTok repeats cumulative combo counts; count only the completed combo.
  if (Number(data.giftDetails?.giftType ?? data.giftType) === 1 && !data.repeatEnd) return false;
  const giftId = String(data.giftId ?? '');
  const side = ids.lula && giftId === ids.lula ? 'lula' : ids.flavio && giftId === ids.flavio ? 'flavio' : null;
  const group = String(data.groupId ?? '0');
  const msg = String(data.common?.msgId ?? data.msgId ?? '');
  const id = group !== '0' ? `${data.user?.userId}:${giftId}:${group}` : msg ? `msg:${msg}` : undefined;
  return game.gift(side, Number(data.repeatCount ?? 1), data.user?.uniqueId ?? data.user?.nickname, id);
}
