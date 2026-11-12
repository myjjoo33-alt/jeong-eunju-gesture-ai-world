export function setupMusic(audio, button) {
  let enabled=true, request=0;
  audio.volume=.25;
  function update() {
    const playing=!audio.paused;
    button.textContent=playing?'음악 끄기':'음악 켜기';
    button.setAttribute('aria-pressed',String(playing));
  }
  function pause() { request++;audio.pause();update(); }
  async function start() {
    if(!enabled)return;
    const current=++request;
    try {
      await audio.play();
      if(current!==request)return;
      button.title='배경음악을 켜거나 끕니다';
    } catch {
      if(current!==request)return;
      button.title='음악을 재생하지 못했습니다. 음악 켜기를 눌러 주세요.';
    }
    update();
  }
  button.addEventListener('click',()=>{
    if(!audio.paused){enabled=false;pause();}
    else {enabled=true;start();}
  });
  audio.addEventListener('play',update);
  audio.addEventListener('pause',update);
  update();
  return {start,pause};
}