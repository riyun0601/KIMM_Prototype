/**
 * Part Design ownership of the Create sketch attachment-plane sequence.
 * The assembly shell renders this state; it does not own the workflow rules.
 */
export const PART_DESIGN_CREATE_SKETCH = 'partDesign.createSketch';

export const attachmentPlanes = Object.freeze([
  { id: 'XY_Plane', label: 'XY 평면 (기본 평면)' },
  { id: 'XZ_Plane', label: 'XZ 평면 (기본 평면)' },
  { id: 'YZ_Plane', label: 'YZ평면 (기본 평면)' },
]);

export const attachmentPlaneTask = Object.freeze({
  tab: 'tasks',
  title: '작업',
  command: PART_DESIGN_CREATE_SKETCH,
  prompt: '부착 선택',
  planes: attachmentPlanes,
  options: Object.freeze({
    allowUsedFeatures: false,
    allowExternalFeatures: false,
    copyMode: 'independent',
  }),
  actions: Object.freeze([
    { id: 'confirm', label: '확인' },
    { id: 'cancel', label: '취소' },
  ]),
});

export function createPartDesignFlowState() {
  return {
    activeWorkbench: 'part-design',
    comboTab: 'model',
    task: null,
    selectedPlaneId: null,
    viewport: '3d',
    sketchEditing: false,
  };
}

export function partDesignFlowReducer(state, event) {
  switch (event.type) {
    case 'command':
      if (event.command !== PART_DESIGN_CREATE_SKETCH) return state;
      return {
        ...state,
        activeWorkbench: 'part-design',
        comboTab: 'tasks',
        task: 'attachment-plane',
        selectedPlaneId: null,
        viewport: '3d',
        sketchEditing: false,
      };

    case 'plane.select':
      if (state.task !== 'attachment-plane' || !isAttachmentPlane(event.planeId)) return state;
      return { ...state, selectedPlaneId: event.planeId };

    case 'task.confirm':
      if (state.task !== 'attachment-plane' || !state.selectedPlaneId) return state;
      return {
        ...state,
        activeWorkbench: 'sketcher',
        comboTab: 'model',
        task: null,
        selectedPlaneId: null,
        viewport: '2d-sketch',
        sketchEditing: true,
      };

    case 'task.cancel':
      if (state.task !== 'attachment-plane') return state;
      return createPartDesignFlowState();

    default:
      return state;
  }
}

function isAttachmentPlane(planeId) {
  return attachmentPlanes.some((plane) => plane.id === planeId);
}
