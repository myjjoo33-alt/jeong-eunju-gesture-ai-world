const cameraButton = document.querySelector('#camera-button');
const status = document.querySelector('#status');
const openLink = document.querySelector('#open-project-link');
if (location.protocol === 'file:') {
  cameraButton.disabled = true;
  cameraButton.textContent = '실행 주소로 열어 주세요';
  status.dataset.state = 'error';
  status.textContent = '파일을 직접 열면 얼굴 인식이 시작되지 않습니다. 아래 실행 주소로 열어 주세요.';
  openLink.hidden = false;
} else {
  import('./app.js').catch(error => {
    cameraButton.disabled = true;
    cameraButton.textContent = '불러오기 실패';
    status.dataset.state = 'error';
    status.textContent = '실행 파일을 불러오지 못했습니다. 새로고침하거나 아래 배포 주소로 다시 열어 주세요.';
    openLink.hidden = false;
    console.error('실행 파일 불러오기 오류:', error);
  });
}
