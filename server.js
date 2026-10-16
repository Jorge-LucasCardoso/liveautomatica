import http from 'node:http';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {TikTokLiveConnection, WebcastEvent} from 'tiktok-live-connector';
import {HttpProxyAgent, HttpsProxyAgent} from 'hpagent';
import {Game, receiveGift} from './game.js';

const root = fileURLToPath(new URL('.', import.meta.url));
let settings = {username: 'jorgedrummerhead', duration: 300, ids: {lula: '', flavio: ''}};
try { settings = {...settings, ...JSON.parse(await readFile(root + '.local/settings.json', 'utf8'))}; } catch (e) { if (e.code !== 'ENOENT') throw e; }
const game = new Game({duration: settings.duration});
let mode = 'demo', status = 'Simulação • sem conexão com o TikTok', connection, busy = false;
let catalog = [];
const clients = new Set();
const snapshot = () => ({...game.snapshot(), mode, status, settings, catalog, busy, connected: Boolean(connection?.isConnected)});
function broadcast() { const message = `data: ${JSON.stringify(snapshot())}\n\n`; for (const client of clients) client.write(message); }
function createConnection() {
  // No session cookies are requested or forwarded to the signing service.
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  const agent = proxy ? {http: new HttpProxyAgent({proxy}), https: new HttpsProxyAgent({proxy})} : undefined;
  return new TikTokLiveConnection(settings.username, {processInitialData: false, enableExtendedGiftInfo: true,
    webClientOptions: {timeout: {request: 15000}, retry: {limit: 0}, ...(agent ? {agent} : {})},
    ...(agent ? {wsClientOptions: {agent: agent.https}} : {}),
    ...(process.env.EULER_API_KEY ? {signApiKey: process.env.EULER_API_KEY} : {})});
}
function rememberGift(id, name) {
  if (id && !catalog.some(g => g.id === String(id))) catalog.push({id: String(id), name: String(name || id)});
}
async function action(data) {
  switch (data.action) {
    case 'settings': {
      if (mode === 'live' || game.phase !== 'waiting') throw Error('Pare a rodada e desconecte antes de configurar.');
      const duration = Number(data.duration);
      const username = String(data.username || '').replace(/^@/, '');
      const ids = {lula: String(data.lula || '').trim(), flavio: String(data.flavio || '').trim()};
      if (!/^[\w.]{2,32}$/.test(username) || !Number.isInteger(duration) || duration < 10 || duration > 3600) throw Error('Informe um @ válido e duração entre 10 e 3600 segundos.');
      if (Object.values(ids).some(id => id && !/^\d+$/.test(id)) || (ids.lula && ids.lula === ids.flavio)) throw Error('Os IDs dos presentes devem ser numéricos e diferentes.');
      settings = {username, duration, ids};
      game.duration = duration;
      await mkdir(root + '.local', {recursive: true});
      await writeFile(root + '.local/settings.json', JSON.stringify(settings, null, 2));
      break;
    }
    case 'start':
      if (mode === 'live' && (!connection?.isConnected || !settings.ids.lula || !settings.ids.flavio)) throw Error('Conecte à live e configure os dois presentes antes de iniciar.');
      if (game.phase !== 'waiting') throw Error('A rodada já está em andamento.');
      game.start(); break;
    case 'stop': game.stop(); break;
    case 'gift':
      if (mode !== 'demo') throw Error('Simulação desativada na live real.');
      if (!game.gift(data.side, Number(data.count), data.user || 'teste')) throw Error('Inicie uma rodada e informe uma quantidade válida.');
      break;
    case 'demo':
      game.stop();
      mode = 'demo';
      await connection?.disconnect();
      connection = undefined;
      status = 'Simulação • sem conexão com o TikTok'; break;
    case 'catalog': {
      const source = connection || createConnection();
      const gifts = await source.fetchAvailableGifts();
      for (const gift of gifts) rememberGift(gift.id, gift.name);
      status = `Catálogo consultado: ${catalog.length} presentes. Confirme os IDs antes de iniciar.`;
      break;
    }
    case 'connect': {
      if (mode === 'live' && connection?.isConnected) break;
      game.stop(); mode = 'live'; status = 'Conectando ao TikTok…'; broadcast();
      const current = createConnection(); connection = current;
      current.on(WebcastEvent.GIFT, data => {
        if (connection !== current || mode !== 'live') return;
        rememberGift(data.giftId, data.giftDetails?.giftName ?? data.extendedGiftInfo?.name);
        receiveGift(game, data, settings.ids); broadcast();
      });
      current.on('error', () => { status = 'Falha na conexão com o TikTok. Consulte a conexão antes de retomar.'; broadcast(); });
      current.on('disconnected', () => {
        if (connection !== current || mode !== 'live') return;
        game.stop(); status = 'TikTok desconectado • rodada interrompida. Reconecte e inicie uma nova rodada.'; broadcast();
      });
      try {
        await current.connect();
        const gifts = current.availableGifts;
        if (Array.isArray(gifts)) for (const gift of gifts) rememberGift(gift.id, gift.name);
        status = `Conectado a @${settings.username} • aguardando início da rodada`;
      } catch (e) {
        await current.disconnect().catch(() => {});
        connection = undefined;
        status = 'Não foi possível conectar. A conta precisa estar ao vivo; rede e serviço de assinatura também precisam estar disponíveis.';
        console.error('TikTok:', e.name, String(e.message).slice(0, 400));
        throw Error(status);
      }
      break;
    }
    default: throw Error('Ação desconhecida.');
  }
}
const files = {'/': ['index.html','text/html'], '/overlay': ['index.html','text/html'], '/app.js': ['app.js','text/javascript'], '/style.css': ['style.css','text/css'], '/hero.png': ['hero.png','image/png'], '/title.woff2':['title.woff2','font/woff2'], '/body.woff2':['body.woff2','font/woff2']};
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','no-store');
  const path = new URL(req.url, 'http://localhost').pathname;
  if (req.method === 'GET' && path === '/api/state') { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(snapshot())); return; }
  if (req.method === 'GET' && path === '/api/events') {
    res.writeHead(200, {'Content-Type':'text/event-stream','Connection':'keep-alive'});
    clients.add(res); res.write(`data: ${JSON.stringify(snapshot())}\n\n`);
    req.on('close', () => clients.delete(res)); return;
  }
  if (req.method === 'POST' && path === '/api/action') {
    if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) { res.writeHead(403); res.end(); return; }
    if (!req.headers['content-type']?.startsWith('application/json')) { res.writeHead(415); res.end(); return; }
    if (busy) { res.writeHead(409); res.end(JSON.stringify({error:'Aguarde a operação atual.'})); return; }
    try {
      let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 4096) throw Error('Pedido muito grande.'); }
      busy = true; await action(JSON.parse(body));
      res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({ok:true}));
    } catch (e) { res.writeHead(400, {'Content-Type':'application/json'}); res.end(JSON.stringify({error:e.message})); }
    finally { busy = false; broadcast(); }
    return;
  }
  if (req.method === 'GET' && files[path]) {
    try { const [file,type] = files[path]; const body = await readFile(root + 'public/' + file); res.setHeader('Content-Type', type); res.end(body); }
    catch { res.writeHead(404); res.end('Arquivo não encontrado.'); }
    return;
  }
  res.writeHead(404); res.end('Não encontrado.');
});
setInterval(broadcast, 500).unref();
server.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log('Painel local iniciado na porta ' + (process.env.PORT || 3000)));
