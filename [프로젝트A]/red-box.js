export function createRedBox() {
  let part = -1, refreshAt = 0;
  function reset(now=0) { part = Math.floor(Math.random()*4); refreshAt = now+4000; }
  function get(now) {
    if (now >= refreshAt) {
      const choices=[0,1,2,3].filter(value => value !== part);
      part=choices[Math.floor(Math.random()*choices.length)];
      refreshAt=now+4000;
    }
    return [{x:8,y:2,size:8,part}];
  }
  reset();
  return {reset,get};
}