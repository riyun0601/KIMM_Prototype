const iconBounds = [
  [17, 22], [41, 34], [77, 34], [112, 37], [151, 47],
  [200, 28], [244, 44], [289, 44], [334, 44], [387, 33],
  [433, 45], [487, 32], [519, 30], [563, 32], [595, 31],
  [627, 33], [663, 25], [689, 35], [725, 28], [764, 30],
  [809, 57], [867, 32], [910, 35], [946, 28], [986, 30],
  [1017, 33], [1050, 32], [1082, 32], [1114, 33], [1147, 30],
];

export const sketcherWorkbench = {
  id: 'sketcher',
  label: 'Sketcher',
  documentLabel: 'Sketch',
  toolbarLine: [],
  sketchToolbar: {
    image: './refs/icons/line5.png',
    width: 1178,
    items: iconBounds.map(([left, width], index) => ({
      id: `sketcher-tool-${index + 1}`,
      position: index + 1,
      left,
      width,
      label: index + 1 === 2 ? 'Create polyline' : index + 1 === 5 ? 'Create circle by center and radius' : `Sketcher tool ${index + 1}`,
      tool: index + 1 === 2 ? 'polyline' : index + 1 === 5 ? 'circle' : null,
    })),
  },
};
