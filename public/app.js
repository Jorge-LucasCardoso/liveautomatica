import {portraitState, planEffects, SoundPlayer} from './effects.js';
const $ = id => document.getElementById(id);
const overlay = location.pathname === '/overlay';
const sound = new SoundPlayer();
let previous = null;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function audioStatus() {
  const running = sound.context?.state === 'running';
  $('audio-status').textContent = !sound.localEnabled ? 'Áudio silenciado neste navegador.' : !sound.enabled ? 'Sons da transmissão desativados.' : running ? 'Áudio liberado neste navegador.' : 'Clique em “Ativar e testar som” para liberar o áudio.';
  $('unlock-overlay').hidden = !overlay || running || !sound.enabled || !sound.localEnabled || !sound.volume;
}
async function unlockAudio() {
  try { await sound.unlock(); } catch { /* User can retry using the explicit activation button. */ }
  audioStatus();
}
function giftFeedback(event) {
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
  const scale = () => document.documentElement.style.setProperty('--scale', Math.min(innerWidth / 432, innerHeight / 768));
  addEventListener('resize', scale); scale();
}
let initialized = false, eventKey = '';
const format = n => n.toLocaleString('pt-BR', {minimumFractionDigits:1, maximumFractionDigits:1}) + '%';
function render(s) {
  const effects = planEffects(previous,s);
  sound.configure(s.settings.effects || {enabled:true,volume:.35},$('local-audio').checked);
  $('sounds-enabled').checked = sound.enabled;
  if (document.activeElement !== $('sound-volume')) $('sound-volume').value = Math.round(sound.volume * 100);
  $('volume-value').textContent = Math.round(sound.volume * 100) + '%';
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
  const key = JSON.stringify(s.events);
  if (key !== eventKey) {
    eventKey = key; $('events').replaceChildren();
    if (!s.events.length) {const p=document.createElement('p'); p.className='no-events'; p.textContent='Os presentes recebidos aparecem aqui'; $('events').append(p);}
    for (const event of s.events) {
      const row = document.createElement('div'); row.className = 'event ' + event.side;
      for (const [tag,cls,text] of [['span','symbol',event.side === 'lula' ? '🌹' : '🤍'],['b','count','+' + event.count],['span','username','@' + event.user],['span','side',event.side === 'lula' ? 'Lula' : 'Flávio']]) {
        const el = document.createElement(tag); el.className = cls; el.textContent = text; row.append(el);
      }
      $('events').append(row);
    }
  }
  if (!initialized) {
    $('username').value=s.settings.username; $('duration').value=s.settings.duration;
    $('lula-id').value=s.settings.ids.lula; $('flavio-id').value=s.settings.ids.flavio;
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
document.querySelectorAll('[data-side]').forEach(button => button.addEventListener('click',()=>send({action:'gift',side:button.dataset.side,count:$('test-count').value,user:$('test-user').value})));
document.addEventListener('pointerdown',()=>{if(sound.enabled && sound.localEnabled) void unlockAudio();});
document.addEventListener('keydown',()=>{if(sound.enabled && sound.localEnabled) void unlockAudio();});
$('test-sound').addEventListener('click',async()=>{await unlockAudio();sound.play('gift','lula');});
$('unlock-overlay').addEventListener('click',unlockAudio);
$('local-audio').addEventListener('change',async()=>{
  sound.configure({enabled:sound.enabled,volume:sound.volume},$('local-audio').checked);
  if(sound.localEnabled) await unlockAudio();
  audioStatus();
});
const saveAudio=()=>send({action:'effects',enabled:$('sounds-enabled').checked,volume:Number($('sound-volume').value)/100});
$('sounds-enabled').addEventListener('change',saveAudio);
$('sound-volume').addEventListener('input',()=>{
  const volume=Number($('sound-volume').value)/100;
  sound.configure({enabled:$('sounds-enabled').checked,volume});
  $('volume-value').textContent=Math.round(volume*100)+'%';
});
$('sound-volume').addEventListener('change',saveAudio);
$('settings').addEventListener('submit',e=>{e.preventDefault();send({action:'settings',...Object.fromEntries(new FormData(e.target))});});
const stream = new EventSource('/api/events');
stream.onopen=()=>{previous=null;};
stream.onmessage=e=>render(JSON.parse(e.data));
stream.onerror=()=>{previous=null;$('status').textContent='Servidor desconectado. Verifique se o aplicativo está rodando.'; $('mode').textContent='SEM CONEXÃO'; $('waiting').textContent='Conexão com o placar interrompida'; $('waiting').hidden=false;};
// OBS can permit autoplay; a normal browser shows the activation button if blocked.
if (overlay) void unlockAudio();
