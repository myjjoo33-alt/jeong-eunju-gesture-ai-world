import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandReach } from '../hand-interaction.js';
import { createRedBox } from '../red-box.js';
function hand(size=.2,open=true) {
  const p=Array.from({length:21},()=>({x:.5,y:.6}));
  p[0]={x:.5,y:.9}; p[5]={x:.5-size/2,y:.6}; p[17]={x:.5+size/2,y:.6};
  for(const [tip,joint] of [[8,6],[12,10],[16,14],[20,18]]) {
    p[joint]={x:.5,y:.5}; p[tip]={x:.5,y:open?.2:.75};
  }
  return p;
}
test('open hand triggers once, holding it does not keep multiplying',()=>{
  const h=createHandReach();
  assert.equal(h.update([hand()],0).trigger,false);
  assert.equal(h.update([hand()],200).trigger,true);
  assert.equal(h.update([hand()],5000).trigger,false);
});
test('withdraw then extend triggers again; holding withdrawn hand does not',()=>{
  const h=createHandReach(); h.update([hand()],0); h.update([hand()],200);
  h.update([hand(.12)],300); h.update([hand(.12)],500);
  assert.equal(h.update([hand(.12)],900).trigger,false);
  h.update([hand()],1000);
  assert.equal(h.update([hand()],1200).trigger,true);
});
test('remove hand and return allows another reach',()=>{
  const h=createHandReach(); h.update([hand()],0); h.update([hand()],200);
  h.update([],300); h.update([],750);
  h.update([hand()],800);
  assert.equal(h.update([hand()],1000).trigger,true);
});
test('closed, tiny, or momentary hands do not trigger',()=>{
  const h=createHandReach(); h.update([hand(.2,false)],0);
  assert.equal(h.update([hand(.2,false)],1000).trigger,false);
  h.update([hand(.03)],1100);
  assert.equal(h.update([hand(.03)],1400).trigger,false);
  h.update([hand()],1500); h.update([],1550);
  assert.equal(h.update([hand()],1600).trigger,false);
});
test('red box stays single and changes its part after four seconds',()=>{
  const r=createRedBox(); r.reset(0);
  const before=r.get(0)[0].part;
  assert.equal(r.get(3999)[0].part,before);
  assert.equal(r.get(4000).length,1);
  assert.notEqual(r.get(4000)[0].part,before);
});
test('manual reset waits for hand removal instead of instantly multiplying again',()=>{
  const h=createHandReach();h.reset(true);
  assert.equal(h.update([hand()],0).trigger,false);
  assert.equal(h.update([hand()],1000).trigger,false);
  h.update([],1100);h.update([],1600);h.update([hand()],1700);
  assert.equal(h.update([hand()],1900).trigger,true);
});