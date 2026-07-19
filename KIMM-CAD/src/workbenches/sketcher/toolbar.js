const toolLabels = {
  2: 'Create polyline',
  5: 'Create circle by center and radius',
};

// Measured from line5.png. The toolbar includes separators and a few wider
// split-button groups, so it must not be treated as an even 36px grid.
const iconBounds = [
  [17, 22], [41, 34], [77, 34], [112, 37], [151, 47],
  [200, 28], [244, 44], [289, 44], [334, 44], [387, 33],
  [433, 45], [487, 32], [519, 30], [563, 32], [595, 31],
  [627, 33], [663, 25], [689, 35], [725, 28], [764, 30],
  [809, 57], [867, 32], [910, 35], [946, 28], [986, 30],
  [1017, 33], [1050, 32], [1082, 32], [1114, 33], [1147, 30],
];

export const sketcherToolbar = {
  image: './refs/icons/line5.png',
  width: 1178,
  items: iconBounds.map(([left, width], index) => {
    const position = index + 1;
    return {
      id: `sketcher-tool-${position}`,
      label: toolLabels[position] || `Sketcher tool ${position}`,
      left,
      width,
      tool: position === 2 ? 'polyline' : position === 5 ? 'circle' : null,
    };
  }),
};

export const sketcherWorkbench = {
  id: 'sketcher',
  label: 'Sketcher',
  documentLabel: 'Sketch',
  toolbarLine: [],
};
