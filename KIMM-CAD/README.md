# KIMM-CAD UI prototype

FreeCAD를 사용하지 않는 사용자 테스트용 UI 프로토타입입니다. 현재는 워크벤치 전환에 따른 상단 툴바 변화와 CAD 작업 화면의 기본 골격만 제공합니다.

## 실행

Node.js 18 이상에서 다음 명령으로 실행합니다. 별도의 패키지 설치는 필요하지 않습니다.

```powershell
cd KIMM-CAD
npm.cmd run dev
```

브라우저에서 `http://localhost:4173`을 엽니다. PowerShell 실행 정책이 설정되지 않은 환경에서는 `npm run dev`도 사용할 수 있으며, 포트는 `PORT` 환경 변수로 바꿀 수 있습니다.

## 협업 경계

공용 조립 화면과 렌더링 로직은 `src/main.js` 및 `src/styles.css`에 있습니다. 워크벤치별 개발은 아래 파일만 수정하면 되도록 분리했습니다.

| 담당 영역 | 파일 | 현재 역할 |
| --- | --- | --- |
| 공통 툴바 | `src/workbenches/base-toolbar.js` | 1·2줄 아이콘 및 공통 설정 |
| Part | `src/workbenches/part.js` | 3줄(아이콘 `3-*`) 및 기능 확장 위치 |
| Part Design | `src/workbenches/part-design.js` | 3줄(아이콘 `4-*`) 및 기능 확장 위치 |

Part와 Part Design 담당자는 서로의 파일과 조립 화면 파일을 수정하지 않아도 됩니다. 새 동작은 각 파일의 `actions` 또는 `toolbarLine` 정의에 추가한 뒤, 공통 이벤트가 처리할 수 없는 복잡한 UI가 필요할 때에만 별도 모듈을 같은 폴더에 추가합니다.

## 현재 구현 범위

- 기본값은 Start이며 1·2줄 툴바만 표시
- 워크벤치 메뉴는 `refs/UI/FreeCAD_Workbench.png` 배열의 텍스트 목록으로 표시
- Part 선택 시 1·2·3줄, Part Design 선택 시 1·2·4줄 아이콘 표시
- 아이콘은 `refs/icons/line1` ~ `line4`를 숫자 순서대로 사용
- 툴바 버튼 클릭 시 상태바에 선택한 도구 이름 표시

## Three.js CAD 환경

Three.js와 Vite가 프로젝트 의존성으로 추가되었습니다. 처음 한 번은 아래 순서로 실행합니다.

```powershell
cd KIMM-CAD
npm.cmd install
npm.cmd run dev
```

Three.js 기반 뷰포트, 선택, Property 편집, 형상 커널 연결의 개발 경계는 [src/cad/README.md](./src/cad/README.md)에 정리했습니다. 현재 단계는 환경 구성만 포함하며, 실제 스케치·회전·Boolean Cut은 이후 `GeometryAdapter` 구현체에서 연결합니다.
