import test from 'node:test';
import assert from 'node:assert/strict';
import {Game, receiveGift} from '../game.js';

test('presentes determinam porcentagem, vencedor e reinício após cinco segundos', () => {
  let now = 0;
  const game = new Game({duration: 300, now: () => now});
  game.start();
  game.gift('lula', 30, 'ana', 'a'); game.gift('flavio', 20, 'joao', 'b');
  assert.deepEqual(game.snapshot().percentages, {lula:60, flavio:40});
  now=300000;
  assert.equal(game.snapshot().phase,'result');
  assert.equal(game.snapshot().winner,'lula');
  assert.equal(game.gift('flavio', 100, 'during-result', 'c'),false);
  now=304999; assert.equal(game.snapshot().phase,'result');
  now=305000;
  assert.equal(game.snapshot().phase,'voting');
  assert.equal(game.snapshot().round,2);
  assert.deepEqual(game.snapshot().scores,{lula:0,flavio:0});
  assert.equal(game.snapshot().events.length,0);
  assert.equal(game.snapshot().remaining,300);
});
test('combos só contam a quantidade final e mensagens duplicadas não pontuam novamente',()=>{
  const game=new Game(); game.start();
  const ids={lula:'1',flavio:'2'};
  const event={giftId:1,giftDetails:{giftType:1},user:{userId:'9',uniqueId:'ana'},groupId:'42',repeatCount:5,repeatEnd:false};
  assert.equal(receiveGift(game,event,ids),false);
  assert.equal(receiveGift(game,{...event,repeatCount:10,repeatEnd:true},ids),true);
  assert.equal(receiveGift(game,{...event,repeatCount:10,repeatEnd:true},ids),false);
  assert.equal(game.snapshot().scores.lula,10);
  assert.equal(receiveGift(game,{...event,giftId:2,groupId:'43',repeatCount:3,repeatEnd:true},ids),true);
  assert.equal(game.snapshot().scores.flavio,3);
  assert.equal(receiveGift(game,{...event,giftId:999,repeatEnd:true},ids),false);
});
test('empates, ausência de presentes, quantidades inválidas e fase de espera',()=>{
  let now=0; const game=new Game({duration:10,now:()=>now});
  assert.equal(game.gift('lula',1,'a'),false);
  game.start();
  for (const invalid of [0,-1,1.5,NaN,Infinity,100001]) assert.equal(game.gift('lula',invalid,'a'),false);
  now=10000; assert.equal(game.snapshot().winner,'empty');
  now=15000; game.snapshot();
  game.gift('lula',1,'a');game.gift('flavio',1,'b');
  now=25000;
  assert.equal(game.snapshot().winner,'tie');
  game.stop();now=50000;assert.equal(game.snapshot().phase,'waiting');
});
test('deduplicação continua após mudança de rodada e presentes não combo usam msgId',()=>{
  const game=new Game();game.start();
  const event={giftId:1,repeatCount:1,common:{msgId:'111'},user:{uniqueId:'ana'}};
  const ids={lula:'1',flavio:'2'};
  assert.equal(receiveGift(game,event,ids),true);
  game.stop();game.start();
  assert.equal(receiveGift(game,event,ids),false);
  assert.equal(game.snapshot().total,0);
});
