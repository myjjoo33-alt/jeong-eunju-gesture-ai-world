export function createHandGesture() {
  let pose=null,candidate=null,since=0,lastSeen=-Infinity,absentSince=null,locked=false;
  function reset(waitForRelease=false) { pose=candidate=null;since=0;lastSeen=-Infinity;absentSince=null;locked=waitForRelease; }
  function update(hands,now,categories) {
    const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
    const shapes=hands.map((p,index)=>{
      const size=distance(p[5],p[17]);
      const extended=[[8,6],[12,10],[16,14],[20,18]].filter(([tip,joint])=>distance(p[tip],p[0])>distance(p[joint],p[0])*1.1).length;
      const folded=[[5,6,8],[9,10,12],[13,14,16],[17,18,20]].filter(([base,joint,tip])=>{
        const a={x:p[base].x-p[joint].x,y:p[base].y-p[joint].y};
        const b={x:p[tip].x-p[joint].x,y:p[tip].y-p[joint].y};
        const norm=Math.hypot(a.x,a.y)*Math.hypot(b.x,b.y);
        return distance(p[tip],p[0])<distance(p[joint],p[0])*1.05 || norm>1e-8&&(a.x*b.x+a.y*b.y)/norm>Math.cos(140*Math.PI/180);
      }).length;
      const label=categories?.[index];
      const fallback=(!label||label==='None')&&folded>=3&&extended<=1&&distance(p[4],p[5])<size*1.25;
      return {folded,down:size>=.02&&label==='Thumb_Down',fist:size>=.02&&(label==='Closed_Fist'||fallback),open:size>=.025&&(label==='Open_Palm'||extended>=3)};
    });
    const fist=shapes.some(h=>h.fist),open=shapes.some(h=>h.open);
    const current=shapes.some(h=>h.down)?'reset':fist?'fist':open?'open':null;
    const report=(message,action)=>({message,action,trigger:!!action,fistCandidate:fist,folded:Math.max(0,...shapes.map(h=>h.folded)),pose:current});
    if(!hands.length) {
      absentSince??=now;
      if(now-absentSince>=500){pose=candidate=null;locked=false;}
    } else absentSince=null;
    if(!current) {
      if(now-lastSeen>300)candidate=null;
      return report(hands.length?'손가락을 모두 펴거나 주먹을 확실히 쥐어 주세요':'손을 화면에 보여 주세요');
    }
    lastSeen=now;
    if(locked)return report('손을 잠깐 화면 밖으로 뺐다가 다시 보여 주세요');
    if(current!==candidate){candidate=current;since=now;}
    if(current==='reset') {
      if(pose==='reset')return report('초기화 완료 · 손을 펴서 다시 시작하세요');
      const remaining=2000-(now-since);
      if(remaining>0)return report('처음으로 돌아가기까지 '+Math.ceil(remaining/1000)+'초 · 엄지를 아래로 유지하세요');
      pose='reset';
      return report('처음 상태로 돌아왔습니다','reset');
    }
    if(now-since>=220&&pose!==current) {
      pose=current;
      return report(current==='open'?'손 펴기 감지 · 조각이 늘어났습니다':'주먹 감지 · 조각이 줄어들었습니다',current==='open'?'grow':'shrink');
    }
    if(pose===current)return report(current==='open'?'손바닥 인식됨 · 주먹을 쥐면 줄어듭니다':'주먹 인식됨 · 손을 펴면 늘어납니다');
    return report(current==='open'?'손바닥 확인 중 · 잠깐 유지해 주세요':'주먹 확인 중 · 잠깐 유지해 주세요');
  }
  return {update,reset};
}