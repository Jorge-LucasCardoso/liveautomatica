import test from 'node:test';
import assert from 'node:assert/strict';
import {Game, receiveGift, safeAvatar} from '../game.js';

test('fila mostra dois por vez durante quatro segundos, preservando todos e a ordem',()=>{
  let now=0;const game=new Game({now:()=>now});game.start();
  for(let i=1;i<=7;i++) game.gift(i%2?'lula':'flavio',1,'user'+i);
  assert.equal(game.snapshot().total,7,'pontuação não aguarda a fila');
  const shown=[];
  for(const expected of [[1,2],[3,4],[5,6],[7]]) {
    const state=game.snapshot();assert.deepEqual(state.participants.map(p=>p.id),expected);
    assert.ok(state.participants.length<=2);shown.push(...state.participants.map(p=>p.user));
    now+=3999;assert.deepEqual(game.snapshot().participants.map(p=>p.id),expected);
    now+=1;
  }
  assert.deepEqual(shown,['user1','user2','user3','user4','user5','user6','user7']);
  assert.deepEqual(game.snapshot().participants,[]);
  assert.equal(game.snapshot().pendingParticipants,0);
});

test('fila persiste no resultado e na virada de rodada, com a rodada original identificada',()=>{
  let now=0;const game=new Game({duration:10,now:()=>now});game.start();
  for(let i=0;i<10;i++)game.gift('lula',1,'user'+i);
  now=10000;assert.equal(game.snapshot().phase,'result');
  assert.equal(game.snapshot().participants[0].round,1);
  now=15000;const second=game.snapshot();assert.equal(second.round,2);
  assert.equal(second.total,0);assert.ok(second.participants.length>0);
  assert.equal(second.participants[0].round,1);
  game.clearPresentations();assert.equal(game.snapshot().participants.length,0);
  assert.equal(game.snapshot().pendingParticipants,0);
});

test('Galáxia soma cinco minutos por unidade, não vota e deduplica o combo',()=>{
  let now=0;const game=new Game({duration:10,now:()=>now});game.start();
  now=9000;
  const event={giftId:3,giftDetails:{giftType:1},repeatCount:2,groupId:'10',repeatEnd:false,user:{userId:'1',uniqueId:'ana',avatarThumb:{urlList:['https://example.com/ana.jpg']}}};
  const ids={lula:'1',flavio:'2',galaxy:'3'};
  assert.equal(receiveGift(game,event,ids),false);
  assert.equal(receiveGift(game,{...event,repeatEnd:true},ids),true);
  assert.equal(game.snapshot().remaining,601);
  assert.equal(game.snapshot().total,0);
  assert.equal(game.snapshot().events[0].seconds,600);
  assert.equal(game.snapshot().participants[0].avatar,'https://example.com/ana.jpg');
  assert.equal(receiveGift(game,{...event,repeatEnd:true},ids),false);
  assert.equal(game.snapshot().remaining,601);
  now=610000;assert.equal(game.snapshot().phase,'result');
  assert.equal(game.gift('time',1,'late'),false);
});

test('apenas fotos HTTPS sem credenciais são aceitas e o @ é normalizado',()=>{
  for(const url of ['javascript:alert(1)','http://example.com/a.png','https://user:password@example.com/a','data:image/svg+xml,test',null]) assert.equal(safeAvatar(url),'');
  const game=new Game();game.start();
  game.gift('flavio',1,'@ana',undefined,'https://example.com/avatar.png');
  assert.equal(game.snapshot().participants[0].user,'ana');
  assert.equal(game.snapshot().participants[0].avatar,'https://example.com/avatar.png');
});
