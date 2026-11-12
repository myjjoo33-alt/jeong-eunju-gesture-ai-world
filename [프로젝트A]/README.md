# 프로젝트A — 얼굴 조각 인터랙티브 전시

## 현재 상태
프로젝트 폴더 준비 완료. 프로그램 제작과 웹 배포는 아직 진행하지 않았습니다.

## 만들고 싶은 화면
- 웹캠에서 얼굴 한 명을 인식합니다.
- 왼쪽 눈, 오른쪽 눈, 코, 입을 각각 사각형 영상 조각으로 잘라냅니다.
- 네 종류의 조각을 여러 개로 복사하고 크기를 다르게 배치합니다.
- 크고 작은 조각들이 75인치 가로형 TV 화면을 가득 채웁니다.
- 눈 깜빡임과 입 움직임이 복사된 조각에도 실시간으로 반영됩니다.

## 파일 저장 원칙
- 이 프로젝트의 코드, 이미지, 모델, 실행 안내 등은 모두 이 폴더 안에 저장합니다.
- 기존 별요정 트리 등 다른 프로젝트 파일은 이곳으로 옮기지 않습니다.
- 얼굴 영상은 사용자의 PC 안에서 처리하며, 업로드하거나 녹화하지 않습니다.
- 웹캠은 사용자가 켜기 버튼을 누른 뒤 요청하고, 마이크는 사용하지 않습니다.

## 진행 순서
1. 얼굴 한 명의 왼쪽 눈, 오른쪽 눈, 코, 입을 잘라 보여주는 기본 화면 제작 및 확인
2. 크고 작은 복사본으로 전체 화면을 채우는 연출 제작 및 확인
3. 75인치 TV 연결 후 화질, 속도, 전체 화면 표시 확인
4. 웹 배포 및 실제 배포 주소에서 카메라 동작 확인

현재 요청한 단계만 진행하고, 다음 제작 단계는 사용자의 요청 후 시작합니다.

## 배포 방향
- Chrome에서 실행하는 웹페이지로 만듭니다.
- PC 내부 테스트는 localhost 주소를 사용합니다.
- 외부에 배포할 때는 카메라 사용에 필요한 HTTPS 주소를 사용합니다.
- GitHub Pages를 우선 검토합니다. 저장소의 공개 여부와 이용 가능한 Pages 설정은 배포 단계에서 확인합니다.
- 이 폴더만 배포하려면 해당 폴더를 배포 대상으로 지정하는 설정을 준비합니다.
- PC와 웹캠에서의 실제 화질 및 속도, TV 출력, 배포 주소는 아직 확인되지 않았습니다.

참고 자료:
- MediaPipe: https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- 웹캠과 HTTPS: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
