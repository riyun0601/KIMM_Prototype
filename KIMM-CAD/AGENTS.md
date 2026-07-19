# KIMM-CAD — Codex 작업 안내

## 프로젝트 목적

이 저장소의 `KIMM-CAD`만 수정한다. FreeCAD 소스나 실제 FreeCAD 런타임을 사용하지 않는, 브라켓 제작 사용자 테스트용 웹 프로토타입이다.

현재 최우선 목표는 실제 CAD 제품을 재현하는 것이 아니라 아래 11단계를 사용자가 끝까지 수행할 수 있는 최소 인터랙션을 제공하는 것이다.

1. Part Design 실행
2. 스케치 생성 및 수평/수직 구속
3. 평면에 브라켓 단면 1/2 드로잉
4. 회전으로 브라켓 생성
5. 면 클릭 후 스케치 진입
6. 면에 원을 그리고 정렬
7. 4개 배열
8. Part 실행
9. 원기둥 추가
10. A 객체에서 B 객체를 빼서 구멍 생성
11. 반복하여 최종 브라켓 완성

## 현재 상태

- 정적 CAD 조립 화면과 Start / Part / Part Design 워크벤치 전환 UI가 동작한다.
- Start는 툴바 1·2줄, Part는 1·2·3줄, Part Design은 1·2·4줄을 표시한다.
- 아이콘은 반드시 `refs/icons/line1` ~ `line4`의 번호 순서를 사용한다.
- 워크벤치 드롭다운 항목은 `refs/UI/FreeCAD_Workbench.png`의 텍스트 배열을 따른다.
- `src/cad`는 Three.js·Property·형상 연산을 연결하기 위한 환경만 만든 상태다. 아직 뷰포트에 Three.js를 mount하거나 11단계 형상을 생성하지 않았다.

## 핵심 제약

- 작업 범위는 `KIMM-CAD/` 하위로 한정한다.
- `refs/`는 디자인 참조/원본 아이콘이다. 파일명을 변경하거나 덮어쓰지 않는다.
- UI 외형은 FreeCAD 참고 화면과 유사하게 유지하되, 이번 사용자 테스트에 불필요한 FreeCAD 기능은 구현하지 않는다.
- Three.js는 렌더링, 카메라, 면/점 피킹, TransformControls 용도다. 솔리드 Boolean/회전/배열을 Three.js mesh에 직접 누적 구현하지 않는다.
- 실제 형상 계산은 이후 `GeometryAdapter` 구현체로 넣는다. 모든 피처는 데이터 모델에서 재생성 가능해야 한다.

## 아키텍처와 소유권

```text
src/main.js, src/styles.css     공용 조립 화면과 UI 이벤트
src/workbenches/                워크벤치별 툴바 정의
src/cad/model/                  피처 이력, 파라미터, 선택 상태 (source of truth)
src/cad/operations/             사용자 명령과 11단계 흐름
src/cad/geometry/               스케치/회전/배열/Boolean 형상 커널 어댑터
src/cad/viewport/               Three.js scene, picker, gizmo, renderer
```

2인 병렬 개발 시에는 다음 경계를 지킨다.

| 담당 | 수정 중심 | 담당 기능 |
| --- | --- | --- |
| Part Design | `src/cad/operations/part-design/`, `src/cad/geometry/` | 스케치, 구속, 회전, 면 매핑, 원, 배열 |
| Part | `src/cad/operations/part/`, `src/cad/geometry/` | 원기둥, Cut, 반복 완성 |
| 공용 변경이 필요할 때만 | `src/main.js`, `src/cad/model/`, `src/cad/viewport/` | 화면 연결, 선택 상태, Property 반영 |

서로 다른 담당자는 상대 워크벤치 파일이나 `src/main.js`를 단순 편의상 수정하지 않는다. 공용 계약 변경이 필요하면 먼저 `src/cad/README.md`와 영향을 받는 인터페이스를 함께 갱신한다.

## 데이터/렌더링 규칙

1. `cad-document.js`의 feature 및 parameters가 정본이다.
2. Property 입력은 `updateFeatureParameter()`를 통해 문서 상태를 변경한다.
3. 변경된 feature는 GeometryAdapter로 재생성하고, 결과 `BufferGeometry`/mesh만 Three.js scene에 반영한다.
4. Raycaster 선택 결과는 `featureId`, `faceIndex`, `point`, `normal` 형태로 문서 selection에 기록한다.
5. 선택한 면을 기준으로 스케치를 만들 때, 월드 좌표와 로컬 스케치 평면 변환을 feature parameters에 저장한다.
6. 피처를 삭제하거나 수정하면 그 피처 이후의 종속 피처를 순서대로 rebuild한다.

## 구현 우선순위

1. 현재 SVG 임시 모델 대신 `createThreeViewport()`를 실제 `.viewport` DOM에 mount한다.
2. Box/Cylinder 하나를 `cad-document` 피처로 만들고, 모델 트리와 Property 입력의 단방향 갱신을 먼저 검증한다.
3. 객체 → 면 → 점 선택 상태 및 TransformControls 조작을 추가한다.
4. 스케치 평면·수평/수직 구속·회전 피처를 구현한다.
5. 원형 배열, Cylinder, Boolean Cut을 GeometryAdapter에 추가한다.
6. 마지막에 11단계를 실제 버튼/툴바 액션과 연결하고, 각 단계의 성공 상태를 테스트한다.

## 실행과 검증

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run check
npm.cmd run build
```

- 의존성: `three`, `vite`
- Node.js 18 이상을 사용한다.
- UI 또는 CAD 모듈을 수정했다면 `npm.cmd run check`와 `npm.cmd run build`를 실행한다.
- 선택/Property/형상 작업을 수정했다면 브라우저에서 최소 한 번 클릭·값 입력·형상 갱신을 확인한다.

## 참조 파일

- `refs/UI/KIMM CAD -기본화면.png`: Start 기준 화면
- `refs/UI/KIMM CAD -Part생성.png`: Part 툴바/뷰포트 기준
- `refs/UI/KIMM CAD -Part디자인.png`: Part Design 툴바/뷰포트 기준
- `refs/UI/FreeCAD_Workbench.png`: 워크벤치 드롭다운 목록
- `src/cad/README.md`: CAD 계층 상세와 GeometryAdapter 계약
