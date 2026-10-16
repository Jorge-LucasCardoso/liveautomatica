import test from 'node:test';
import assert from 'node:assert/strict';
import {portraitState, planEffects} from '../public/effects.js';
import {Game} from '../game.js';

test('liderança aumenta proporcionalmente o retrato e deixa apenas o perdedor em preto e branco',()=>{
  assert.deepEqual(portraitState({lula:0,flavio:0},'lula'),{scale:1,grayscale:0});
  assert.deepEqual(portraitState({lula:10,flavio:10},'flavio'),{scale:1,grayscale:0});
  const moderate=portraitState({lula:60,flavio:40},'lula');
  assert.ok(moderate.scale>1 && moderate.scale<1.14);
  assert.deepEqual(portraitState({lula:60,flavio:40},'flavio'),{scale:1,grayscale:1});
  const fullLead=portraitState({lula:0,flavio:5},'flavio');
  assert.ok(Math.abs(fullLead.scale-1.14)<1e-10);
  assert.equal(fullLead.grayscale,0);
  assert.deepEqual(portraitState({lula:0,flavio:5},'lula'),{scale:1,grayscale:1});
});

test('cada presente tem um único efeito, inclusive com usuário, quantidade e horário iguais',()=>{
  const game=new Game({now:()=>1000}); game.start();
  const before=structuredClone(game.snapshot());
  game.gift('lula',1,'ana');game.gift('lula',1,'ana');
  const after=structuredClone(game.snapshot());
  const effects=planEffects(before,after);
  assert.equal(effects.gifts.length,2);
  assert.notEqual(effects.gifts[0].id,effects.gifts[1].id);
  assert.equal(planEffects(after,game.snapshot()).gifts.length,0);
  assert.deepEqual(planEffects(null,after),{gifts:[],cues:[]});
});

test('sons de início, contagem final e resultado disparam uma vez por transição',()=>{
  let now=0;const game=new Game({duration:10,now:()=>now});
  let previous=structuredClone(game.snapshot());game.start();
  let current=structuredClone(game.snapshot());
  assert.deepEqual(planEffects(previous,current).cues,['start']);
  game.gift('flavio',2,'ana');previous=structuredClone(game.snapshot());
  now=7000;current=structuredClone(game.snapshot());
  assert.deepEqual(planEffects(previous,current).cues,['tick']);
  assert.deepEqual(planEffects(current,current).cues,[]);
  previous=current;now=10000;current=structuredClone(game.snapshot());
  assert.deepEqual(planEffects(previous,current).cues,['win']);
  assert.deepEqual(planEffects(current,current).cues,[]);
  previous=current;now=15000;current=structuredClone(game.snapshot());
  assert.deepEqual(planEffects(previous,current).cues,['start']);
  assert.deepEqual(portraitState(current.scores,'flavio'),{scale:1,grayscale:0});
  previous=current;now=25000;current=structuredClone(game.snapshot());
  assert.deepEqual(planEffects(previous,current).cues,['tie']);
});
