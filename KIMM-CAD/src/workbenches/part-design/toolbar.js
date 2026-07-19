// Part Design-only toolbar configuration.
import {
  attachmentPlaneTask,
  createPartDesignFlowState,
  partDesignFlowReducer,
} from './sketch-attachment-flow.js';

const iconPath = (index) => `./refs/icons/line4/4-${index}.png`;

const partDesignActions = [
  'Create body', 'Create sketch', 'Create datum plane', 'Pad', 'Pocket', 'Revolve',
  'Groove', 'Hole', 'Fillet', 'Chamfer', 'Thickness', 'Mirror feature', 'Polar pattern',
  'Linear pattern', 'Multi-transform', 'Boolean feature', 'Subtractive pipe', 'Subtractive loft',
];

const workflowCommands = {
  2: 'partDesign.createSketch',
  13: 'partDesign.revolveBracket',
  19: 'partDesign.pocketCircle',
  27: 'partDesign.polarPattern',
};

const workflowLabels = {
  13: 'Revolve bracket profile',
  19: 'Pocket circle sketch',
  27: 'Polar pattern (4 holes)',
};

export const partDesignWorkbench = {
  id: 'part-design',
  label: 'Part Design',
  documentLabel: 'Body',
  toolbarLine: Array.from({ length: 40 }, (_, offset) => ({
    id: `part-design-${offset + 1}`,
    icon: iconPath(offset + 1),
    label: workflowLabels[offset + 1] || partDesignActions[offset] || `Part Design command ${offset + 1}`,
    command: workflowCommands[offset + 1] || null,
    separatorAfter: [3, 8, 14, 20, 27, 34].includes(offset + 1),
  })),
  sketchAttachmentFlow: Object.freeze({
    task: attachmentPlaneTask,
    createInitialState: createPartDesignFlowState,
    reduce: partDesignFlowReducer,
  }),
};
