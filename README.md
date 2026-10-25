# KIMM Cyber Lab SW 사용성 평가

이 저장소의 5개 프로토타입을 한 Netlify 사이트로 배포합니다. 원본 앱의 소스와 설정은 빌드 과정에서 수정하지 않습니다. 빌드 스크립트가 각 앱을 `.kimm-build/`에 복사한 뒤 경로를 조정하고, 최종 파일을 `dist/`에 모읍니다.

## 배포

저장소 전체를 Git에 올려 Netlify 프로젝트와 연결합니다. 루트의 `netlify.toml`에 빌드 명령 `node scripts/build-all.mjs`와 게시 폴더 `dist`가 설정되어 있습니다. Node 버전은 `.node-version`의 24를 사용합니다. Netlify 빌드 중 각 앱의 잠금 파일에 따라 의존성이 자동 설치됩니다.

완성된 `dist/` 폴더를 Netlify에 직접 업로드하는 임시 배포도 가능합니다.

## 로컬 빌드

```powershell
node scripts/build-all.mjs
```

로컬에서 npm 설치가 제한되어 있고 CAD, FLOW, SYS의 `node_modules`가 이미 있을 때는 아래 검증 모드를 사용할 수 있습니다. CAM과 STRUCTURE는 CAD의 설치본을 임시로 재사용하므로 실제 배포 검증은 Netlify의 기본 빌드로 완료해야 합니다.

```powershell
node scripts/build-all.mjs --local
```

홈은 `/`, 앱은 `/cad/`, `/cam/`, `/flow/`, `/structure/`, `/sys/`에서 열립니다. `dist/`와 `.kimm-build/`는 Git에서 제외됩니다.
