/**
 * CAD document의 UI 독립 데이터 모델입니다.
 * GeometryAdapter가 재생성한 Three.js object는 이 데이터에 직접 저장하지 않습니다.
 */
export function createCadDocument() {
  return {
    unit: 'mm',
    features: [],
    selection: null,
    revision: 0,
  };
}

export function addFeature(document, feature) {
  if (document.features.some(({ id }) => id === feature.id)) {
    throw new Error(`Feature id already exists: ${feature.id}`);
  }

  return {
    ...document,
    features: [...document.features, { visible: true, ...feature }],
    revision: document.revision + 1,
  };
}

/** Property 패널의 입력을 피처 데이터에 반영하는 단일 진입점입니다. */
export function updateFeatureParameter(document, featureId, parameter, value) {
  let found = false;
  const features = document.features.map((feature) => {
    if (feature.id !== featureId) return feature;
    found = true;
    return {
      ...feature,
      parameters: { ...feature.parameters, [parameter]: value },
    };
  });

  if (!found) throw new Error(`Unknown feature: ${featureId}`);
  return { ...document, features, revision: document.revision + 1 };
}

export function setSelection(document, selection) {
  return { ...document, selection, revision: document.revision + 1 };
}
