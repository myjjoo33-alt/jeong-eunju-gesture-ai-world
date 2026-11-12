export function createHandReach() {
  let armed = true, heldSince = null, absentSince = null, peak = 0, retractSince = null;
  function reset(waitForRelease = false) { armed = !waitForRelease; heldSince = absentSince = retractSince = null; peak = 0; }
  function update(hands, now) {
    const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
    const candidates = hands.map(p => {
      const size = distance(p[5],p[17]);
      const fingers = [[8,6],[12,10],[16,14],[20,18]].filter(([tip,joint]) => distance(p[tip],p[0]) > distance(p[joint],p[0])*1.1).length;
      return { size, open: fingers >= 3 };
    }).filter(h => h.open).sort((a,b) => b.size-a.size);
    const hand = candidates[0];
    if (!hand) {
      heldSince = retractSince = null;
      absentSince ??= now;
      if (now-absentSince >= 400) { armed = true; peak = 0; }
      return { trigger:false, message:hands.length ? '손바닥을 펴 주세요' : '손을 화면에 보여 주세요' };
    }
    absentSince = null;
    if (!armed) {
      if (hand.size < peak*.78) {
        retractSince ??= now;
        if (now-retractSince >= 180) { armed = true; heldSince = null; }
      } else retractSince = null;
      return { trigger:false, message:peak ? '손 인식됨 · 손을 뒤로 당겼다가 다시 내밀어 주세요' : '손을 화면 밖으로 뺀 뒤 다시 보여 주세요' };
    }
    if (hand.size < Math.max(.065, peak*.92)) { heldSince = null; return {trigger:false,message:'손 인식됨 · 카메라 쪽으로 조금 더 내밀어 주세요'}; }
    heldSince ??= now;
    if (now-heldSince >= 180) {
      armed = false; peak = hand.size; heldSince = null;
      return {trigger:true,message:'손 동작 감지 · 조각이 늘어났습니다'};
    }
    return {trigger:false,message:'손 인식됨 · 잠깐 유지해 주세요'};
  }
  return { update, reset };
}