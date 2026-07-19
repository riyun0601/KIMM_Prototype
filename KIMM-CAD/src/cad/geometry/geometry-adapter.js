/**
 * 실제 CAD 형상 커널의 경계입니다.
 * 구현체는 feature parameter만 입력받고, 그 결과를 Three.js용 BufferGeometry로 반환합니다.
 */
export class GeometryAdapter {
  createSketch() { throw new Error('GeometryAdapter.createSketch is not connected'); }
  constrainHorizontal() { throw new Error('GeometryAdapter.constrainHorizontal is not connected'); }
  constrainVertical() { throw new Error('GeometryAdapter.constrainVertical is not connected'); }
  revolve() { throw new Error('GeometryAdapter.revolve is not connected'); }
  createCylinder() { throw new Error('GeometryAdapter.createCylinder is not connected'); }
  pattern() { throw new Error('GeometryAdapter.pattern is not connected'); }
  subtract() { throw new Error('GeometryAdapter.subtract is not connected'); }
  rebuildFeature() { throw new Error('GeometryAdapter.rebuildFeature is not connected'); }
}
