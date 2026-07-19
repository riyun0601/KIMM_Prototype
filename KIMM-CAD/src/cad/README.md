# CAD 기능 기반

이 폴더는 기존 조립 화면(`src/main.js`)과 독립된 CAD 기능 계층입니다. 화면 레이아웃은 공용으로 유지하고, 기능 개발자는 아래 경계 안에서 작업합니다.

```text
UI / Property Panel
        ↕
CAD document (파라미터·피처 이력·선택 상태)
        ↕
Geometry adapter (스케치·회전·배열·Boolean 연산)
        ↕
Three.js viewport (렌더링·면/점 선택·TransformControls)
```

## 현재 포함한 환경

- `viewport/create-three-viewport.js`: 카메라, 렌더러, Orbit/Transform controls, Raycaster 기반 면 선택 계약
- `model/cad-document.js`: Property 패널이 수정할 수 있는 피처 데이터 모델과 변경 함수
- `geometry/geometry-adapter.js`: 실제 형상 커널을 꽂을 인터페이스
- `operations/workflow-registry.js`: 11개 사용자 워크플로우를 명령 단위로 정리한 레지스트리

## 구현 시 역할 분리

| 담당 | 주 수정 위치 | 책임 |
| --- | --- | --- |
| A — Part Design | `operations/part-design/`, `geometry/` | 스케치, 수평/수직 구속, 회전, 원형 배열 |
| B — Part | `operations/part/`, `geometry/` | 원기둥, Boolean Cut, 모델 트리/Property 연계 |
| 공용 | `model/`, `viewport/` | 문서 상태, 선택, Three.js 렌더링 계약 |

## 형상 커널 결정

Three.js는 렌더러이므로 실제 솔리드 Boolean과 파라메트릭 재생성은 하지 않습니다. 사용자 테스트 수준에서 Box/Cylinder/Revolve/Array/Cut을 신뢰성 있게 만들려면 다음 단계에서 형상 커널을 `GeometryAdapter`에 연결해야 합니다. 후보를 결정하기 전에는 워크벤치 파일에서 Three.js mesh를 직접 Boolean 처리하지 않습니다.

`GeometryAdapter`가 갖춰야 할 최소 명령은 `createSketch`, `revolve`, `createCylinder`, `pattern`, `subtract`, `rebuildFeature`입니다.
