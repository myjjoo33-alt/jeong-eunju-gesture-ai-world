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
test('tiny or momentary open hands do not trigger',()=>{
  const h=createHandReach();
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
test('fist shrinks once, holding does not repeat, opening rearms it',()=>{
  const h=createHandReach();
  h.update([hand(.2,false)],0,['Closed_Fist']);
  assert.equal(h.update([hand(.2,false)],300,['Closed_Fist']).action,'shrink');
  assert.equal(h.update([hand(.2,false)],1000,['Closed_Fist']).trigger,false);
  h.update([hand()],1100,['Open_Palm']);h.update([hand()],1400,['Open_Palm']);
  h.update([hand(.2,false)],1500,['Closed_Fist']);
  assert.equal(h.update([hand(.2,false)],1800,['Closed_Fist']).action,'shrink');
});
test('unknown classified hand is not mistaken for a fist',()=>{
  const h=createHandReach();h.update([hand(.2,false)],0,['None']);
  assert.equal(h.update([hand(.2,false)],1000,['None']).trigger,false);
});
test('red clones shrink, stay in bounds, and first four have unique parts',()=>{
  const r=createRedBox();let previous=8;
  for(let count=2;count<=30;count++){
    r.add(count*100);const boxes=r.get(count*100);
    assert.equal(boxes.length,count);assert.ok(boxes[0].size<previous);previous=boxes[0].size;
    assert.equal(new Set(boxes.slice(0,4).map(b=>b.part)).size,Math.min(4,count));
    for(const b of boxes){assert.ok(b.x>=0&&b.x+b.size<=24+1e-9);assert.ok(b.y>=0&&b.y+b.size<=12+1e-9);}
  }
});
test('removal chooses a random box and can reach zero without invalid geometry',()=>{
  const r=createRedBox(()=>.9);r.add(0);r.add(0);
  const before=r.get(0);
  assert.equal(r.remove(10),before[2].id);
  assert.deepEqual(r.get(10).map(b=>b.id),before.slice(0,2).map(b=>b.id));
  r.remove(20);r.remove(30);
  assert.deepEqual(r.get(30),[]);assert.equal(r.remove(40),null);
  r.add(50);assert.equal(r.get(50).length,1);assert.equal(r.get(50)[0].size,8);
});