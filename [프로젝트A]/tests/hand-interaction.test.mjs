import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandGesture} from '../hand-interaction.js';
import {createRedBox} from '../red-box.js';
function hand(size=.08,open=true){
 const p=Array.from({length:21},()=>({x:.5,y:.6}));p[0]={x:.5,y:.9};p[5]={x:.5-size/2,y:.6};p[17]={x:.5+size/2,y:.6};
 for(const [tip,joint] of [[8,6],[12,10],[16,14],[20,18]]){p[joint]={x:.5,y:.5};p[tip]={x:.5,y:open?.2:.75};}return p;
}
const open=()=>hand(.08,true),fist=()=>hand(.08,false);
test('stationary open palm grows once without moving forward',()=>{
 const h=createHandGesture();h.update([open()],0,['Open_Palm']);assert.equal(h.update([open()],250,['Open_Palm']).action,'grow');assert.equal(h.update([open()],5000,['Open_Palm']).trigger,false);
});
test('open-fist-open transitions each fire once at the same position and size',()=>{
 const h=createHandGesture();h.update([open()],0,['Open_Palm']);h.update([open()],250,['Open_Palm']);h.update([fist()],300,['Closed_Fist']);assert.equal(h.update([fist()],550,['Closed_Fist']).action,'shrink');assert.equal(h.update([fist()],900,['Closed_Fist']).trigger,false);h.update([open()],1000,['Open_Palm']);assert.equal(h.update([open()],1250,['Open_Palm']).action,'grow');
});
test('folded hand compensates for unknown classifier but does not override explicit thumbs-up',()=>{
 const h=createHandGesture();const p=hand(.2,false);h.update([p],0,['None']);assert.equal(h.update([p],250,['None']).action,'shrink');h.reset();h.update([p],0,['Thumb_Up']);assert.equal(h.update([p],250,['Thumb_Up']).trigger,false);
});
test('brief unknown frame tolerates classification loss but real opening changes pose',()=>{
 const h=createHandGesture();h.update([fist()],0,['Closed_Fist']);const partial=fist();partial[8].y=partial[12].y=.2;h.update([partial],100,['None']);assert.equal(h.update([fist()],250,['Closed_Fist']).action,'shrink');h.update([open()],300,['Open_Palm']);assert.equal(h.update([open()],550,['Open_Palm']).action,'grow');
});
test('brief pose change and tiny detections do not trigger',()=>{
 const h=createHandGesture();h.update([open()],0,['Open_Palm']);h.update([fist()],100,['Closed_Fist']);assert.equal(h.update([open()],150,['Open_Palm']).trigger,false);h.reset();h.update([hand(.01)],0,['Open_Palm']);assert.equal(h.update([hand(.01)],1000,['Open_Palm']).trigger,false);
});
test('manual reset requires disappearance before rearming',()=>{
 const h=createHandGesture();h.reset(true);h.update([open()],0,['Open_Palm']);assert.equal(h.update([open()],1000,['Open_Palm']).trigger,false);h.update([],1100);h.update([],1700);h.update([open()],1800,['Open_Palm']);assert.equal(h.update([open()],2050,['Open_Palm']).action,'grow');
});
test('simultaneous open and fist gives fist priority',()=>{
 const h=createHandGesture();h.update([open(),fist()],0,['Open_Palm','Closed_Fist']);assert.equal(h.update([open(),fist()],250,['Open_Palm','Closed_Fist']).action,'shrink');
});
test('red growth shrinks boxes, stays inside screen and keeps four different parts',()=>{
 const r=createRedBox();let size=8;for(let n=2;n<=30;n++){r.add(n*10);const b=r.get(n*10);assert.equal(b.length,n);assert.ok(b[0].size<size);size=b[0].size;assert.equal(new Set(b.slice(0,4).map(x=>x.part)).size,Math.min(n,4));for(const x of b){assert.ok(x.x>=0&&x.x+x.size<=24+1e-9);assert.ok(x.y>=0&&x.y+x.size<=12+1e-9);}}
});
test('random removal reaches zero and another opening can restore a red box',()=>{
 const r=createRedBox(()=>.9);r.add(0);r.add(0);const b=r.get(0);assert.equal(r.remove(1),b[2].id);r.remove(2);r.remove(3);assert.deepEqual(r.get(3),[]);assert.equal(r.remove(4),null);r.add(5);assert.equal(r.get(5).length,1);
});
test('four-second refresh preserves unique parts among four red boxes',()=>{
 const r=createRedBox();r.add(0);r.add(0);r.add(0);const p=r.get(1).map(b=>b.part);assert.deepEqual(r.get(3999).map(b=>b.part),p);assert.equal(new Set(r.get(4000).map(b=>b.part)).size,4);
});
test('thumb down counts two seconds, resets once, then allows opening again',()=>{
 const h=createHandGesture();const down=()=>h.update([fist()],0,['Thumb_Down']);
 assert.equal(down().action,undefined);
 assert.match(h.update([fist()],1000,['Thumb_Down']).message,/1초/);
 assert.equal(h.update([fist()],1999,['Thumb_Down']).action,undefined);
 assert.equal(h.update([fist()],2000,['Thumb_Down']).action,'reset');
 assert.equal(h.update([fist()],5000,['Thumb_Down']).trigger,false);
 h.update([open()],5100,['Open_Palm']);assert.equal(h.update([open()],5350,['Open_Palm']).action,'grow');
});
test('releasing thumb down cancels reset; long detection gap restarts countdown',()=>{
 const h=createHandGesture();h.update([fist()],0,['Thumb_Down']);h.update([],1000);
 h.update([fist()],1500,['Thumb_Down']);assert.equal(h.update([fist()],3000,['Thumb_Down']).action,undefined);
 assert.equal(h.update([fist()],3500,['Thumb_Down']).action,'reset');
});
test('thumb down takes priority over fist and open hand during countdown',()=>{
 const h=createHandGesture();h.update([open(),fist()],0,['Open_Palm','Thumb_Down']);
 assert.equal(h.update([open(),fist()],500,['Open_Palm','Thumb_Down']).trigger,false);
 assert.equal(h.update([fist(),fist()],2000,['Closed_Fist','Thumb_Down']).action,'reset');
});