const $ = id => document.getElementById(id);
const overlay = location.pathname === '/overlay';
if (overlay) {
  document.body.classList.add('overlay');
  const scale = () => document.documentElement.style.setProperty('--scale', Math.min(innerWidth / 432, innerHeight / 768));
  addEventListener('resize', scale); scale();
}
let initialized = false, eventKey = '';
const format = n => n.toLocaleString('pt-BR', {minimumFractionDigits:1, maximumFractionDigits:1}) + '%';
function render(s) {
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
$('settings').addEventListener('submit',e=>{e.preventDefault();send({action:'settings',...Object.fromEntries(new FormData(e.target))});});
const stream = new EventSource('/api/events');
stream.onmessage=e=>render(JSON.parse(e.data));
stream.onerror=()=>{$('status').textContent='Servidor desconectado. Verifique se o aplicativo está rodando.'; $('mode').textContent='SEM CONEXÃO'; $('waiting').textContent='Conexão com o placar interrompida'; $('waiting').hidden=false;};
