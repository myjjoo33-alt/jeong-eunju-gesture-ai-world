export function createHandReach() {
  let armed = true, heldSince = null, absentSince = null, peak = 0, retractSince = null;
  let fistArmed = true, fistSince = null, fistReleasedSince = null;
  function reset(waitForRelease = false) {
    armed = fistArmed = !waitForRelease;
    heldSince = absentSince = retractSince = fistSince = fistReleasedSince = null;
    peak = 0;
  }
  function update(hands, now, categories) {
    const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
    const candidates = hands.map((p,index) => {
      const size = distance(p[5],p[17]);
      const fingers = [[8,6],[12,10],[16,14],[20,18]].filter(([tip,joint]) => distance(p[tip],p[0]) > distance(p[joint],p[0])*1.1).length;
      return {size, open: categories?.[index] === 'Open_Palm' || fingers >= 3,
        fist: categories ? categories[index] === 'Closed_Fist' : fingers <= 1};
    }).sort((a,b)=>b.size-a.size);
    const fist = candidates.find(h=>h.fist && h.size >= .045);
    if (fist) {
      fistReleasedSince = heldSince = retractSince = null;
      absentSince ??= now;
      if (now-absentSince >= 400) { armed = true; peak = 0; }
      if (fistArmed) {
        fistSince ??= now;
        if (now-fistSince >= 250) {
          fistArmed = false; fistSince = null;
          return {trigger:true,action:'shrink',message:'주먹 감지 · 조각이 줄어들었습니다'};
        }
        return {trigger:false,message:'주먹 인식됨 · 잠깐 유지해 주세요'};
      }
      return {trigger:false,message:'주먹 인식됨 · 손을 폈다가 다시 쥐면 또 줄어듭니다'};
    }
    fistSince = null;
    fistReleasedSince ??= now;
    if (now-fistReleasedSince >= 180) fistArmed = true;
    const hand = candidates.find(h=>h.open);
    if (!hand) {
      heldSince = retractSince = null;
      absentSince ??= now;
      if (now-absentSince >= 400) { armed = true; peak = 0; }
      return {trigger:false,message:hands.length ? '손바닥을 펴거나 주먹을 쥐어 주세요' : '손을 화면에 보여 주세요'};
    }
    absentSince = null;
    if (!armed) {
      if (hand.size < peak*.78) {
        retractSince ??= now;
        if (now-retractSince >= 180) { armed = true; heldSince = null; }
      } else retractSince = null;
      return {trigger:false,message:peak ? '손 인식됨 · 당겼다가 다시 내밀면 늘어나고, 주먹을 쥐면 줄어듭니다' : '손을 화면 밖으로 뺀 뒤 다시 보여 주세요'};
    }
    if (hand.size < Math.max(.065,peak*.92)) { heldSince=null; return {trigger:false,message:'손 인식됨 · 카메라 쪽으로 조금 더 내밀어 주세요'}; }
    heldSince ??= now;
    if (now-heldSince >= 180) {
      armed=false;peak=hand.size;heldSince=null;
      return {trigger:true,action:'grow',message:'손 동작 감지 · 일반 조각과 빨간 박스가 늘어났습니다'};
    }
    return {trigger:false,message:'손 인식됨 · 잠깐 유지해 주세요'};
  }
  return {update,reset};
}