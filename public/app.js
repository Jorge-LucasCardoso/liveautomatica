import {portraitState, planEffects, SoundPlayer} from './effects.js';
const $ = id => document.getElementById(id);
const overlay = location.pathname === '/overlay';
const sound = new SoundPlayer();
let previous = null;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const bonusLabel = seconds => seconds % 60 === 0 ? `+${seconds / 60} min` : `+${seconds} s`;
function audioStatus() {
  const running = sound.context?.state === 'running';
  const audible = sound.localEnabled && ((sound.enabled && sound.volume > 0) || (sound.musicEnabled && sound.musicVolume > 0));
  $('audio-status').textContent = !sound.localEnabled ? 'Áudio silenciado neste navegador.' : !audible ? 'Música e efeitos silenciados.' : running ? 'Áudio liberado neste navegador.' : 'Clique em “Ativar e testar som” para liberar o áudio.';
  $('unlock-overlay').hidden = !overlay || running || !audible;
}
async function unlockAudio() {
  try { await sound.unlock(); } catch { /* User can retry using the explicit activation button. */ }
  audioStatus();
}
function giftFeedback(event) {
  if (event.side === 'time') {
    sound.play('galaxy');
    const bonus = $('time-bonus');
    bonus.textContent = '🌌 ' + bonusLabel(event.seconds);
    bonus.getAnimations().forEach(animation=>animation.cancel());
    bonus.animate([{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)',offset:.15},{opacity:1,offset:.7},{opacity:0,transform:reducedMotion.matches?'none':'translateY(-10px)'}],{duration:1800});
    return;
  }
  sound.play('gift',event.side);
  const portrait = $('portrait-' + event.side);
  const pulse = portrait.querySelector('.portrait-pulse');
  const burst = portrait.querySelector('.gift-burst');
  burst.textContent = '+' + event.count;
  if (!reducedMotion.matches) {
    pulse.getAnimations().forEach(animation=>animation.cancel());
    pulse.animate([{transform:'scale(1)'},{transform:'scale(1.13)',offset:.25},{transform:'scale(1)'}],{duration:420,easing:'ease-out'});
  }
  burst.getAnimations().forEach(animation=>animation.cancel());
  burst.animate([{opacity:0,transform:'translateY(8px) scale(.8)'},{opacity:1,transform:'translateY(0) scale(1)',offset:.2},{opacity:0,transform:reducedMotion.matches?'none':'translateY(-30px) scale(1.05)'}],{duration:850,easing:'ease-out'});
}
if (overlay) {
  document.body.classList.add('overlay');
  // Capture the vertical scene sideways at full landscape-window resolution.
  const vertical = new URLSearchParams(location.search).get('vertical') === '1';
  document.body.classList.toggle('overlay-sideways', !vertical);
  const scale = () => {
    document.documentElement.style.setProperty('--scale', Math.min(innerWidth / (vertical ? 432 : 768), innerHeight / (vertical ? 768 : 432)));
    document.documentElement.style.setProperty('--rotation', vertical ? '0deg' : '90deg');
  };
  addEventListener('resize', scale); scale();
}
let initialized = false, eventKey = '';
const format = n => n.toLocaleString('pt-BR', {minimumFractionDigits:1, maximumFractionDigits:1}) + '%';
function render(s) {
  const effects = planEffects(previous,s);
  const audio = {...s.settings.effects};
  if (document.activeElement === $('sound-volume')) audio.volume = Number($('sound-volume').value)/100;
  if (document.activeElement === $('music-volume')) audio.musicVolume = Number($('music-volume').value)/100;
  sound.configure(audio,$('local-audio').checked);
  sound.setPlaying(s.phase !== 'waiting');
  $('sounds-enabled').checked = sound.enabled;
  if (document.activeElement !== $('sound-volume')) $('sound-volume').value = Math.round(sound.volume * 100);
  $('volume-value').textContent = Math.round(sound.volume * 100) + '%';
  $('music-enabled').checked = sound.musicEnabled;
  if (document.activeElement !== $('music-volume')) $('music-volume').value = Math.round(sound.musicVolume * 100);
  $('music-volume-value').textContent = Math.round(sound.musicVolume * 100) + '%';
  for (const side of ['lula','flavio']) {
    const state = portraitState(s.scores,side);
    const portrait = $('portrait-' + side);
    portrait.style.setProperty('--portrait-scale',state.scale);
    portrait.style.setProperty('--gray',state.grayscale);
    portrait.classList.toggle('leading',state.scale > 1);
  }
  for (const event of effects.gifts) giftFeedback(event);
  for (const cue of effects.cues) sound.play(cue);
  previous = s;
  audioStatus();
  $('mode').textContent = s.mode === 'demo' ? 'SIMULAÇÃO' : s.connected ? 'PRESENTES TIKTOK' : 'TIKTOK DESCONECTADO';
  $('status').textContent = s.status;
  $('account').textContent = '@' + s.settings.username;
  $('round').textContent = String(s.round || 1).padStart(2,'0');
  $('phase').textContent = s.phase === 'waiting' ? 'AGUARDANDO INÍCIO' : s.phase === 'result' ? 'RODADA ENCERRADA' : 'TEMPO RESTANTE';
  $('timer').textContent = `${String(Math.floor(s.remaining/60)).padStart(2,'0')}:${String(s.remaining%60).padStart(2,'0')}`;
  for (const side of ['lula','flavio']) {
    $(side + '-score').textContent = s.scores[side].toLocaleString('pt-BR');
    $(side + '-percent').textContent = format(s.percentages[side]);
  }
  $('lula-bar').style.width = s.percentages.lula + '%';
  $('empty').textContent = s.total ? `${s.total.toLocaleString('pt-BR')} presentes nesta rodada` : 'Sem presentes • barra inicial em 50% para cada lado';
  $('waiting').hidden = s.phase !== 'waiting';
  $('waiting').textContent = s.mode === 'live' && !s.connected ? 'TikTok desconectado • votação parada' : 'Inicie uma rodada no painel';
  $('result').hidden = s.phase !== 'result';
  if (s.phase === 'result') {
    $('winner').textContent = {lula:'LULA VENCEU!',flavio:'FLÁVIO VENCEU!',tie:'EMPATE!',empty:'SEM PRESENTES'}[s.winner];
    $('winner').style.color = s.winner === 'lula' ? '#ff456e' : s.winner === 'flavio' ? '#48f6a1' : '#fff1b7';
    $('winner-icon').textContent = ['lula','flavio'].includes(s.winner) ? '🏆' : '🤝';
    $('winner-percent').textContent = ['lula','flavio'].includes(s.winner) ? format(s.percentages[s.winner]) : '';
    $('restart').textContent = s.remaining;
  }
  $('queue-status').textContent = s.pendingParticipants ? `${s.pendingParticipants} NA FILA` : '✦';
  $('galaxy-rule').textContent = `🌌 GALÁXIA = ${bonusLabel(s.settings.galaxySeconds).toUpperCase()}`;
  document.querySelector('[data-side="time"]').textContent = `🌌 Galáxia · ${bonusLabel(s.settings.galaxySeconds)}`;
  const participants = s.participants || [];
  const key = JSON.stringify(participants.map(event=>event.id));
  if (key !== eventKey) {
    eventKey = key; $('events').replaceChildren();
    if (!participants.length) {const p=document.createElement('p'); p.className='no-events'; p.textContent='Sua foto e @ aparecem aqui ao participar'; $('events').append(p);}
    for (const event of participants) {
      const row = document.createElement('div'); row.className = 'event ' + event.side;
      const avatar = document.createElement('div'); avatar.className='avatar'; avatar.textContent=event.user.charAt(0).toUpperCase();
      if (event.avatar) {
        const img=document.createElement('img');img.alt='Foto de @'+event.user;img.referrerPolicy='no-referrer';img.src=event.avatar;img.addEventListener('error',()=>img.remove());avatar.append(img);
      }
      row.append(avatar);
      const info=document.createElement('div');info.className='participant-info';
      const name=document.createElement('strong');name.className='username';name.textContent='@'+event.user;
      const detail=document.createElement('span');detail.className='participation-detail';
      detail.textContent=event.side==='time'?`🌌 ${event.count} Galáxia · rodada ${event.round}`:`${event.side==='lula'?'🌹 Lula':'🤍 Flávio'} · rodada ${event.round}`;
      info.append(name,detail);row.append(info);
      const count=document.createElement('b');count.className='count';count.textContent=event.side==='time'?bonusLabel(event.seconds):'+'+event.count;row.append(count);
      $('events').append(row);
    }
  }
  if (!initialized) {
    $('username').value=s.settings.username; $('duration').value=s.settings.duration;
    $('lula-id').value=s.settings.ids.lula; $('flavio-id').value=s.settings.ids.flavio;
    $('galaxy-id').value=s.settings.ids.galaxy; $('galaxy-seconds').value=s.settings.galaxySeconds;
    initialized=true;
  }
  $('catalog').textContent = s.catalog.length ? s.catalog.map(g => `${g.id} · ${g.name}`).join('\n') : 'Nenhum presente consultado.';
  const options = s.catalog.map(g => `${g.id}:${g.name}`).join('|');
  if ($('gift-options').dataset.key !== options) {
    $('gift-options').dataset.key = options; $('gift-options').replaceChildren();
    for (const gift of s.catalog) {const option=document.createElement('option'); option.value=gift.id; option.label=gift.name; $('gift-options').append(option);}
  }
  document.querySelectorAll('button').forEach(button => {button.disabled=s.busy || (button.dataset.side && s.mode !== 'demo');});
}
async function send(data) {
  $('error').textContent='';
  try { const response=await fetch('/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); const result=await response.json(); if (!response.ok) throw Error(result.error || 'Falha na operação.'); }
  catch(e) { $('error').textContent=e.message; }
}
document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click',()=>send({action:button.dataset.action})));
document.querySelectorAll('[data-side]').forEach(button => button.addEventListener('click',()=>send({action:'gift',side:button.dataset.side,count:$('test-count').value,user:$('test-user').value,avatar:$('test-avatar').value})));
document.addEventListener('pointerdown',()=>{if(sound.localEnabled) void unlockAudio();});
document.addEventListener('keydown',()=>{if(sound.localEnabled) void unlockAudio();});
$('test-sound').addEventListener('click',async()=>{await unlockAudio();sound.play('gift','lula');});
$('unlock-overlay').addEventListener('click',unlockAudio);
$('local-audio').addEventListener('change',async()=>{
  sound.configure({enabled:sound.enabled,volume:sound.volume,musicEnabled:sound.musicEnabled,musicVolume:sound.musicVolume},$('local-audio').checked);
  if(sound.localEnabled) await unlockAudio();
  audioStatus();
});
const readAudio=()=>({enabled:$('sounds-enabled').checked,volume:Number($('sound-volume').value)/100,musicEnabled:$('music-enabled').checked,musicVolume:Number($('music-volume').value)/100});
let savingAudio=false, pendingAudio=null;
const saveAudio=async()=>{
  pendingAudio=readAudio();
  if(savingAudio) return;
  savingAudio=true;
  while(pendingAudio) {const value=pendingAudio;pendingAudio=null;await send({action:'effects',...value});}
  savingAudio=false;
};
$('sounds-enabled').addEventListener('change',saveAudio);
$('music-enabled').addEventListener('change',saveAudio);
for (const id of ['sound-volume','music-volume']) {
  $(id).addEventListener('input',()=>{
    const audio=readAudio(); sound.configure(audio);
    $('volume-value').textContent=Math.round(audio.volume*100)+'%';
    $('music-volume-value').textContent=Math.round(audio.musicVolume*100)+'%';
  });
  $(id).addEventListener('change',saveAudio);
}
$('settings').addEventListener('submit',e=>{e.preventDefault();send({action:'settings',...Object.fromEntries(new FormData(e.target))});});
const stream = new EventSource('/api/events');
stream.onopen=()=>{previous=null;};
stream.onmessage=e=>render(JSON.parse(e.data));
stream.onerror=()=>{previous=null;$('status').textContent='Servidor desconectado. Verifique se o aplicativo está rodando.'; $('mode').textContent='SEM CONEXÃO'; $('waiting').textContent='Conexão com o placar interrompida'; $('waiting').hidden=false;};
// OBS can permit autoplay; a normal browser shows the activation button if blocked.
if (overlay) void unlockAudio();
