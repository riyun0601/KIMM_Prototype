const iconPath = (index) => `./refs/icons/line3/3-${index}.png`;

const partActions = [
  'Create primitive', 'Create cylinder', 'Create sphere', 'Create cone', 'Create torus',
  'Boolean cut', 'Boolean union', 'Boolean intersection', 'Refine shape', 'Create copy',
  'Extrude', 'Revolve', 'Loft', 'Sweep', 'Mirror', 'Array',
];

export const partWorkbench = {
  id: 'part',
  label: 'Part',
  documentLabel: 'Part',
  toolbarLine: Array.from({ length: 39 }, (_, offset) => ({
    id: `part-${offset + 1}`,
    icon: iconPath(offset + 1),
    label: partActions[offset] || `Part command ${offset + 1}`,
    separatorAfter: [5, 10, 16, 22, 29, 35].includes(offset + 1),
  })),
};
