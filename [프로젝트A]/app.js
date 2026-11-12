import { createHandReach } from './hand-interaction.js';
import { createRedBox } from './red-box.js';
import { createFaceSelector } from './face-selection.js';
import { createMosaic } from './mosaic.js';
import { FaceLandmarker, GestureRecognizer, FilesetResolver } from './vendor/mediapipe/vision_bundle.mjs';

const video = document.querySelector('#webcam');
const overlay = document.querySelector('#overlay');
const overlayContext = overlay.getContext('2d');
const cameraButton = document.querySelector('#camera-button');
const status = document.querySelector('#status');
const placeholder = document.querySelector('#camera-placeholder');

const connectionIndices = connections => [...new Set(connections.flatMap(({ start, end }) => [start, end]))];
const parts = [
  { key: 'leftEye', canvas: document.querySelector('#left-eye'), indices: connectionIndices(FaceLandmarker.FACE_LANDMARKS_LEFT_EYE), padding: 1.6 },
  { key: 'rightEye', canvas: document.querySelector('#right-eye'), indices: connectionIndices(FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE), padding: 1.6 },
  { key: 'nose', canvas: document.querySelector('#nose'), indices: [1, 2, 4, 5, 19, 94, 97, 98, 326, 327], padding: 1.35 },
  { key: 'mouth', canvas: document.querySelector('#mouth'), indices: connectionIndices(FaceLandmarker.FACE_LANDMARKS_LIPS), padding: 1.3 },
].map(part => ({ ...part, context: part.canvas.getContext('2d'), card: document.querySelector(`[data-part="${part.key}"]`) }));

const mosaic = createMosaic(document.querySelector('#mosaic'));
const selector = createFaceSelector();
const otherParts = parts.map(part => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 420;
  return { ...part, canvas, context: canvas.getContext('2d'), card: null };
});
const handReach = createHandReach();
const redBoxes = createRedBox();
const controls = document.querySelector('#controls');
const controlsToggle = document.querySelector('#controls-toggle');
function showControls(show) {
  controls.hidden = !show;
  controlsToggle.textContent = show ? '안내 숨기기' : '카메라 · 설정';
  controlsToggle.setAttribute('aria-expanded', String(show));
}
controlsToggle.addEventListener('click', () => showControls(controls.hidden));
let hideOnFirstFace = false;
let landmarker, gestureRecognizer;
let density = 0, lastHandTime = -Infinity;
const handStatus = document.querySelector('#hand-status');
function resetDensity(waitForRelease = false) { redBoxes.reset(performance.now()); density = 0; mosaic.setDensity(0); handReach.reset(waitForRelease); handStatus.textContent = '손을 화면에 보여 주세요'; }
document.querySelector('#reset-fragments').addEventListener('click', () => resetDensity(true));
let stream;
let animationId;
let lastVideoTime = -1;
let session = 0;

function setStatus(message, state = 'ready') {
  if (status.textContent !== message) status.textContent = message;
  status.dataset.state = state;
}

function clearFragments() {
  mosaic.clear();
  overlayContext.clearRect(0, 0, overlay.width, overlay.height);
  for (const part of parts) {
    part.context.clearRect(0, 0, part.canvas.width, part.canvas.height);
    part.card.classList.remove('has-face');
  }
}

// Work in source-video pixels. A square remains inside the frame, including at its edges.
function cropFor(landmarks, part) {
  const points = part.indices.map(index => landmarks[index]);
  const xs = points.map(point => point.x * video.videoWidth);
  const ys = points.map(point => point.y * video.videoHeight);
  const left = Math.min(...xs), right = Math.max(...xs);
  const top = Math.min(...ys), bottom = Math.max(...ys);
  const size = Math.min(video.videoWidth, video.videoHeight, Math.max(right - left, bottom - top, 12) * part.padding);
  return {
    x: Math.max(0, Math.min(video.videoWidth - size, (left + right - size) / 2)),
    y: Math.max(0, Math.min(video.videoHeight - size, (top + bottom - size) / 2)),
    size,
  };
}

function drawPart(landmarks, part) {
  const { x, y, size } = cropFor(landmarks, part);
  const { context, canvas } = part;
  context.setTransform(-1, 0, 0, 1, canvas.width, 0);
  context.drawImage(video, x, y, size, size, 0, 0, canvas.width, canvas.height);
  context.resetTransform();
  part.card?.classList.add('has-face');
  // The source preview is mirrored. Match its positions without swapping anatomical left/right.
  overlayContext.strokeRect(video.videoWidth - x - size, y, size, size);
}

function render() {
  if (!stream) return;
  try {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const result = landmarker.detectForVideo(video, performance.now());
      if (overlay.width !== video.videoWidth || overlay.height !== video.videoHeight) {
        overlay.width = video.videoWidth;
        overlay.height = video.videoHeight;
      }
      clearFragments();
      const now = performance.now();
      const selection = selector.update(result.faceLandmarks, now);
      const landmarks = selection.primary?.landmarks;
      if (landmarks) {
        overlayContext.strokeStyle = '#c3db97';
        overlayContext.lineWidth = Math.max(2, video.videoWidth / 480);
        for (const part of parts) drawPart(landmarks, part);
        if (selection.others.length) {
          for (const part of otherParts) drawPart(selection.others[0].landmarks, part);
        }
        if (selection.changed) {
          handReach.reset();
          redBoxes.reset(now);
        }
        if (now - lastHandTime >= 100) {
          lastHandTime = now;
          const hands = gestureRecognizer.recognizeForVideo(video, now);
          const gesture = handReach.update(hands.landmarks, now, hands.gestures.map(list => list[0]?.score >= 0.55 ? list[0].categoryName : 'None'));
          if (gesture.action === 'grow') {
            density = Math.min(6,density+1); redBoxes.add(now); mosaic.setDensity(density);
          } else if (gesture.action === 'shrink') {
            density = Math.max(-2,density-1); redBoxes.remove(now); mosaic.setDensity(density);
          }
          handStatus.textContent = gesture.message + ' · 일반 ' + mosaic.getTileCount() + '개 · 빨간 ' + redBoxes.get(now).length + '개';
          handStatus.dataset.hands = String(hands.landmarks.length);
          handStatus.dataset.level = String(density);
        }
        const accents = redBoxes.get(now);
        mosaic.draw(parts.map(part => part.canvas), selection.others.length ? otherParts.map(part => part.canvas) : [], accents);
        status.dataset.redBoxes = String(accents.length);
        if (hideOnFirstFace) { showControls(false); hideOnFirstFace = false; }
        setStatus(result.faceLandmarks.length + '명 인식 중 · 손 내밀기: 증식 · 주먹: 감소', 'tracking');
      } else {
        handReach.reset();
        redBoxes.reset(now);
        status.dataset.redBoxes = '1';
        handStatus.textContent = '얼굴이 보이도록 카메라를 바라봐 주세요';
        setStatus('얼굴을 찾는 중입니다. 밝은 곳에서 카메라를 정면으로 바라보세요.', 'searching');
      }
    }
    animationId = requestAnimationFrame(render);
  } catch (error) {
    console.error('얼굴 영상 처리 오류:', error);
    stopCamera();
    setStatus('얼굴 영상을 처리하지 못했습니다. 카메라를 다시 켜 주세요.', 'error');
  }
}

function stopCamera() {
  selector.reset();
  resetDensity();
  lastHandTime = -Infinity;
  handReach.reset();
  redBoxes.reset();
  status.dataset.redBoxes = '1';
  showControls(true);
  session += 1;
  cancelAnimationFrame(animationId);
  const previousStream = stream;
  stream = undefined;
  previousStream?.getTracks().forEach(track => track.stop());
  video.srcObject = null;
  placeholder.hidden = false;
  clearFragments();
  lastVideoTime = -1;
  cameraButton.disabled = !landmarker;
  cameraButton.textContent = '카메라 켜기';
  setStatus('카메라가 꺼져 있습니다. 준비되면 다시 켜 주세요.');
}

async function startCamera() {
  cameraButton.disabled = true;
  cameraButton.textContent = '카메라 연결 중…';
  setStatus('Chrome에서 카메라 사용을 허용해 주세요.', 'loading');
  const currentSession = ++session;
  let requestedStream;
  try {
    requestedStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } },
    });
    if (currentSession !== session) {
      requestedStream.getTracks().forEach(track => track.stop());
      return;
    }
    stream = requestedStream;
    video.srcObject = stream;
    await video.play();
    if (currentSession !== session) return;
    placeholder.hidden = true;
    cameraButton.disabled = false;
    cameraButton.textContent = '카메라 끄기';
    hideOnFirstFace = true;
    stream.getVideoTracks()[0].addEventListener('ended', () => {
      if (currentSession === session) {
        stopCamera();
        setStatus('카메라 연결이 끝났습니다. 다시 켜 주세요.', 'error');
      }
    });
    render();
  } catch (error) {
    requestedStream?.getTracks().forEach(track => track.stop());
    if (currentSession !== session) return;
    stopCamera();
    const messages = {
      NotAllowedError: '카메라 사용이 허용되지 않았습니다. 주소 왼쪽의 사이트 설정에서 카메라를 허용한 뒤 다시 켜 주세요.',
      NotFoundError: '카메라를 찾지 못했습니다. 웹캠을 연결한 뒤 다시 켜 주세요.',
      NotReadableError: '카메라를 열지 못했습니다. 다른 앱에서 사용 중이면 종료한 뒤 다시 켜 주세요.',
    };
    setStatus(messages[error.name] || '카메라를 연결하지 못했습니다. 연결 상태를 확인한 뒤 다시 켜 주세요.', 'error');
    console.error('카메라 연결 오류:', error);
  }
}

cameraButton.addEventListener('click', () => stream ? stopCamera() : startCamera());
document.querySelector('#fullscreen-button').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    setStatus('전체 화면을 열지 못했습니다. Chrome에서 F11 키를 눌러 주세요.', 'error');
  }
});
document.addEventListener('fullscreenchange', () => {
  document.querySelector('#fullscreen-button').innerHTML = document.fullscreenElement
    ? '전체 화면 나가기 <span aria-hidden="true">↙</span>'
    : '전체 화면 <span aria-hidden="true">↗</span>';
});
window.addEventListener('pagehide', stopCamera);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && (stream || cameraButton.disabled && landmarker)) stopCamera();
});

async function prepare() {
  try {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('웹캠을 사용할 수 있는 HTTPS 주소에서 Chrome으로 열어 주세요.');
    }
    const vision = await FilesetResolver.forVisionTasks(new URL('./vendor/mediapipe/wasm', import.meta.url).href);
    landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: new URL('./models/face_landmarker.task', import.meta.url).href, delegate: 'CPU' },
      runningMode: 'VIDEO',
      numFaces: 2,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
      baseOptions: { modelAssetPath: new URL('./models/gesture_recognizer.task', import.meta.url).href, delegate: 'CPU' },
      runningMode: 'VIDEO', numHands: 2,
      minHandDetectionConfidence: 0.4, minHandPresenceConfidence: 0.4, minTrackingConfidence: 0.4,
    });
    handStatus.textContent = '손 인식 준비 완료 · 카메라를 켜 주세요';
    cameraButton.disabled = false;
    cameraButton.textContent = '카메라 켜기';
    setStatus('준비되었습니다. 카메라 켜기를 눌러 시작하세요.');
  } catch (error) {
    cameraButton.disabled = true;
    cameraButton.textContent = '준비 실패';
    setStatus(window.isSecureContext
      ? '얼굴 인식 파일을 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침해 주세요.'
      : '웹캠을 사용하려면 HTTPS 주소에서 Chrome으로 열어 주세요.', 'error');
    console.error('얼굴 인식 준비 오류:', error);
  }
}

prepare();
