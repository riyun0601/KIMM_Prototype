const iconPath = (line, index) => `./refs/icons/line${line}/${line}-${index}.png`;

const nameByIndex = {
  1: ['New document', 'Open file', 'Save', 'Print', 'Cut', 'Copy', 'Paste', 'Undo', 'Redo', 'Refresh', 'Help'],
  2: ['Fit all', 'Fit selection', 'Toggle projection', 'Standard view', 'Back', 'Forward', 'Select object', 'Zoom', 'Isometric view'],
};

export const baseToolbar = {
  line1: Array.from({ length: 15 }, (_, offset) => ({
    id: `line1-${offset + 1}`,
    icon: iconPath(1, offset + 1),
    label: nameByIndex[1][offset] || `Common command ${offset + 1}`,
    separatorAfter: [3, 7, 10, 11, 13].includes(offset + 1),
  })),
  line2: Array.from({ length: 29 }, (_, offset) => ({
    id: `line2-${offset + 1}`,
    icon: iconPath(2, offset + 1),
    label: nameByIndex[2][offset] || `View command ${offset + 1}`,
    separatorAfter: [4, 6, 9, 16, 20, 23, 26].includes(offset + 1),
  })),
};

export const workbenchMenu = [
  'Assembly',
  'BIM',
  'CAM',
  'Curves',
  'Draft',
  'FEM',
  'Inspection',
  'Material',
  'Mesh',
  'OpenSCAD',
  'Part Design',
  'Part',
  'Points',
  'Reverse Engineering',
  'Robot',
  'Sketcher',
  'Spreadsheet',
  'Surface',
  'TechDraw',
  'Test Framework',
];
