# KIMM-CAD Prototype

FreeCAD를 직접 사용하지 않는 브라켓 제작 사용자 테스트용 웹 프로토타입입니다. 현재는 FreeCAD 스타일 조립 화면, 워크벤치 전환, 그리고 향후 Three.js CAD 기능을 연결할 기반 구조를 제공합니다.

## 실행

Node.js 18 이상에서 실행합니다.

```powershell
cd KIMM-CAD
npm.cmd install
npm.cmd run dev
```

검증 및 프로덕션 빌드:

```powershell
npm.cmd run check
npm.cmd run build
```

## 폴더 구조

```text
src/
  app/                 공용 조립 화면과 스타일
  cad/                 공용 데이터 모델, Three.js 뷰포트, 형상 커널 어댑터
  workbenches/
    common/            공통 1·2줄 툴바
    part/              Part 전용 툴바 및 원기둥/Boolean 명령
    part-design/       Part Design 전용 툴바 및 회전/배열 명령
    sketcher/          Sketcher 전용 스케치/구속 명령
```

Part, Part Design, Sketcher의 기능은 각각 대응하는 `src/workbenches/<name>/`에 구현합니다. 공용 Three.js·Property·선택·형상 커널 계약은 `src/cad/`에만 둡니다.

## 현재 UI 상태

- Start: 공통 1·2줄 툴바
- Part: 공통 1·2줄 + `line3` 아이콘 툴바
- Part Design: 공통 1·2줄 + `line4` 아이콘 툴바
- Sketcher: `line5.png`를 3번째 툴바 줄로 표시하며, 2번 꺾은선과 5번 중심-반지름 원 도구 동작 제공

## 참고 문서

- [AGENTS.md](./AGENTS.md): 다른 Codex/개발자가 따라야 할 작업 규칙과 구현 순서
- [src/cad/README.md](./src/cad/README.md): 공용 CAD 계층의 역할과 데이터 계약
