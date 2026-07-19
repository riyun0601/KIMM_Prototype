import {
  attachmentPlaneTask,
  createPartDesignFlowState,
  partDesignFlowReducer,
} from './sketch-attachment-flow.js';

export const partDesignCommands = [
  { id: 'partDesign.activate', label: 'Part Design 실행' },
  { id: 'partDesign.createSketch', label: '스케치 생성' },
  { id: 'feature.revolveBracket', label: '회전으로 브라켓 생성' },
  { id: 'feature.arrayFour', label: '4개 배열' },
];

export {
  attachmentPlaneTask,
  createPartDesignFlowState,
  partDesignFlowReducer,
};
