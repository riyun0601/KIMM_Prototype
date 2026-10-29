const defaultTools = [
  { id: 1, uid: 'tool-cylindrical', name: 'Cylindrical', shape: 'flat', diameter: 3.0, feedRate: 200, spindleSpeed: 1000 },
  { id: 2, uid: 'tool-toroidal', name: 'Toroidal', shape: 'toroidal', diameter: 2.0, torusDiameter: 0.4, feedRate: 200, spindleSpeed: 1000 },
  { id: 3, uid: 'tool-spherical', name: 'Spherical', shape: 'ball', diameter: 1.0, feedRate: 200, spindleSpeed: 1000 },
];

const defaultProcesses = [
  { id: 1, uid: 'process-remove-material', name: 'Remove material', strategy: 'rough', overlap: 0, materialAllowance: 0.5, maxDepth: 3, offset: 0, pocketing: 'none', gridDirection: 'x', millingStyle: 'ignore' },
  { id: 2, uid: 'process-carve-contour', name: 'Carve contour', strategy: 'semi-follow', overlap: 0, materialAllowance: 0.2, maxDepth: 1.5, offset: 0, pocketing: 'none', gridDirection: 'x', millingStyle: 'up' },
  { id: 3, uid: 'process-cleanup', name: 'Cleanup', strategy: 'finishing', overlap: 60, materialAllowance: 0, maxDepth: 3, offset: 0, pocketing: 'none', gridDirection: 'x', millingStyle: 'ignore' },
  { id: 4, uid: 'process-gravure', name: 'Gravure', strategy: 'engraving', overlap: 0, materialAllowance: 0, maxDepth: 1, offset: 0, pocketing: 'none', gridDirection: 'x', millingStyle: 'up' },
];

function axisValues(xLower = 0, xUpper = 0, yLower = 0, yUpper = 0, zLower = 0, zUpper = 0) {
  return { xLower, xUpper, yLower, yUpper, zLower, zUpper };
}

function boundaryTemplate(id, uid, name, marginValues) {
  return { id, uid, name, marginType: 'relative', marginValues };
}

const defaultBoundaries = [
  boundaryTemplate(1, 'boundary-minimum', 'Minimum', { relative: axisValues(), fixed: axisValues(), custom: axisValues(0, 130, 0, 50, -10, 0) }),
  boundaryTemplate(2, 'boundary-10-margin', '10% margin', { relative: axisValues(10, 10, 10, 10, 0, 0), fixed: axisValues(13, 13, 5, 5, 0, 0), custom: axisValues(-13, 143, -5, 55, -10, 0) }),
];

const defaultTasks = [
  { id: 1, uid: 'task-rough', name: 'Rough', enabled: true, toolId: 'tool-cylindrical', processId: 'process-remove-material', boundaryId: 'boundary-10-margin', generated: false },
  { id: 2, uid: 'task-semi-finish', name: 'Semi-finish', enabled: true, toolId: 'tool-toroidal', processId: 'process-carve-contour', boundaryId: 'boundary-10-margin', generated: false },
  { id: 3, uid: 'task-finish', name: 'Finish', enabled: true, toolId: 'tool-spherical', processId: 'process-cleanup', boundaryId: 'boundary-10-margin', generated: false },
  { id: 4, uid: 'task-gravure', name: 'Gravure', enabled: true, toolId: 'tool-spherical', processId: 'process-gravure', boundaryId: 'boundary-10-margin', generated: false },
];

function cloneBoundary(boundary) {
  return { ...boundary, marginValues: Object.fromEntries(Object.entries(boundary.marginValues).map(([type, values]) => [type, { ...values }])) };
}

function reindexTools(tools) { return tools.map((tool, index) => ({ ...tool, id: index + 1 })); }
function reindexProcesses(processes) { return processes.map((process, index) => ({ ...process, id: index + 1 })); }
function reindexBoundaries(boundaries) { return boundaries.map((boundary, index) => ({ ...boundary, id: index + 1 })); }
function reindexTasks(tasks) { return tasks.map((task, index) => ({ ...task, id: index + 1 })); }

function nextName(items, prefix, from = 1) {
  let number = from;
  while (items.some((item) => item.name === `${prefix} ${number}`)) number += 1;
  return { name: `${prefix} ${number}`, nextNumber: number + 1 };
}

function normalizeProcessDirections(process) {
  const validGridDirections = new Set(['x', 'y', 'all']);
  const validMillingStyles = new Set(['up', 'down', 'ignore']);
  const keepGrid = validGridDirections.has(process.gridDirection) ? process.gridDirection : 'x';
  const keepMilling = validMillingStyles.has(process.millingStyle) ? process.millingStyle : 'up';
  switch (process.strategy) {
    case 'rough': return { ...process, gridDirection: keepGrid, millingStyle: keepMilling };
    case 'semi-shape': return { ...process, gridDirection: process.gridDirection === 'x' ? 'x' : 'x', millingStyle: process.millingStyle === 'ignore' ? 'ignore' : 'ignore' };
    case 'semi-follow': return { ...process, gridDirection: null, millingStyle: ['up', 'down'].includes(process.millingStyle) ? process.millingStyle : 'up' };
    case 'finishing': return { ...process, gridDirection: keepGrid, millingStyle: keepMilling };
    case 'engraving': return { ...process, gridDirection: null, millingStyle: ['up', 'down'].includes(process.millingStyle) ? process.millingStyle : 'up' };
    default: return process;
  }
}
function taskReferences(state, task) {
  if (!task?.enabled) return null;
  const tool = state.tools.find((item) => item.uid === task.toolId) ?? null;
  const process = state.processes.find((item) => item.uid === task.processId) ?? null;
  const boundary = state.boundaries.find((item) => item.uid === task.boundaryId) ?? null;
  return tool && process && boundary ? { tool, process, boundary } : null;
}

function processDuration(processUid) {
  return { 'process-remove-material': '4 hours', 'process-carve-contour': '14 min', 'process-cleanup': '142 min' }[processUid] ?? '—';
}

function buildToolpath(state, task, id, visible) {
  const references = taskReferences(state, task);
  if (!references) return null;
  const { tool, process, boundary } = references;
  return {
    id,
    taskId: task.uid,
    toolId: tool.uid,
    processId: process.uid,
    boundaryId: boundary.uid,
    toolName: tool.name,
    processName: process.name,
    pocketing: process.pocketing,
    duration: processDuration(process.uid),
    visible,
    generatedAt: new Date().toISOString(),
  };
}

export function createInitialControlState() {
  return {
    activeTab: 'model',
    tools: defaultTools.map((tool) => ({ ...tool })),
    selectedToolId: 1,
    nextNewToolNumber: 1,
    processes: defaultProcesses.map((process) => ({ ...process })),
    selectedProcessId: 4,
    nextNewProcessNumber: 1,
    boundaries: defaultBoundaries.map(cloneBoundary),
    selectedBoundaryId: 2,
    nextNewBoundaryNumber: 1,
    tasks: defaultTasks.map((task) => ({ ...task })),
    selectedTaskId: 1,
    nextNewTaskNumber: 1,
    toolpaths: [],
    selectedToolpathId: null,
    nextToolpathId: 1,
    toolpathTabCreated: false,
    helpActive: false,
    modelTab: {
      rotationAxis: 'x', flipPlane: 'xy', swapAxis: 'xy', scalePercent: 100, scaleAxis: 'x', scaleAmount: 130,
      proportional: true, positionX: 0, positionY: 0, positionZ: 0, projection: '2d', extension: 'none', extensionOpen: false, lastAction: null,
    },
  };
}

export function selectedTool(state) { return state.tools.find((tool) => tool.id === state.selectedToolId) ?? null; }
export function selectedProcess(state) { return state.processes.find((process) => process.id === state.selectedProcessId) ?? null; }
export function selectedBoundary(state) { return state.boundaries.find((boundary) => boundary.id === state.selectedBoundaryId) ?? null; }
export function selectedTask(state) { return state.tasks.find((task) => task.id === state.selectedTaskId) ?? null; }
export function selectedToolpath(state) { return state.toolpaths.find((toolpath) => toolpath.id === state.selectedToolpathId) ?? null; }

export function reduceControlState(state, event) {
  switch (event.type) {
    case 'tab.select': return { ...state, activeTab: event.tabId };
    case 'model.update': return { ...state, modelTab: { ...state.modelTab, [event.field]: event.value } };

    case 'tool.select': return state.tools.some((tool) => tool.id === event.toolId) ? { ...state, selectedToolId: event.toolId, helpActive: false } : state;
    case 'tool.new': {
      const { name, nextNumber } = nextName(state.tools, 'New Tool', state.nextNewToolNumber);
      const tool = { id: state.tools.length + 1, uid: `tool-new-${nextNumber}`, name, shape: 'ball', diameter: 1.0, feedRate: 200, spindleSpeed: 1000 };
      return { ...state, tools: reindexTools([...state.tools, tool]), selectedToolId: state.tools.length + 1, nextNewToolNumber: nextNumber, helpActive: false };
    }
    case 'tool.delete': {
      const index = state.tools.findIndex((tool) => tool.id === state.selectedToolId);
      if (index < 0) return state;
      const deletedUid = state.tools[index].uid;
      const tools = reindexTools(state.tools.filter((tool) => tool.id !== state.selectedToolId));
      return { ...state, tools, tasks: state.tasks.map((task) => task.toolId === deletedUid ? { ...task, toolId: null } : task), selectedToolId: tools[index]?.id ?? tools[index - 1]?.id ?? null, helpActive: false };
    }
    case 'tool.move': {
      const index = state.tools.findIndex((tool) => tool.id === state.selectedToolId); const nextIndex = index + event.direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= state.tools.length) return state;
      const tools = [...state.tools]; [tools[index], tools[nextIndex]] = [tools[nextIndex], tools[index]];
      return { ...state, tools: reindexTools(tools), selectedToolId: nextIndex + 1, helpActive: false };
    }
    case 'tool.update': return { ...state, tools: state.tools.map((tool) => {
      if (tool.id !== state.selectedToolId) return tool;
      const nextTool = { ...tool, [event.field]: event.value };
      if (event.field === 'shape' && event.value === 'toroidal' && !Number.isFinite(nextTool.torusDiameter)) nextTool.torusDiameter = 0.4;
      return nextTool;
    }), helpActive: false };

    case 'process.select': return state.processes.some((process) => process.id === event.processId) ? { ...state, selectedProcessId: event.processId, helpActive: false } : state;
    case 'process.new': {
      const { name, nextNumber } = nextName(state.processes, 'New Process', state.nextNewProcessNumber);
      const process = { id: state.processes.length + 1, uid: `process-new-${nextNumber}`, name, strategy: 'rough', overlap: 0, materialAllowance: 0, maxDepth: 0, offset: 0, pocketing: 'none', gridDirection: 'x', millingStyle: 'up' };
      return { ...state, processes: reindexProcesses([...state.processes, process]), selectedProcessId: state.processes.length + 1, nextNewProcessNumber: nextNumber, helpActive: false };
    }
    case 'process.delete': {
      const index = state.processes.findIndex((process) => process.id === state.selectedProcessId);
      if (index < 0) return state;
      const deletedUid = state.processes[index].uid;
      const processes = reindexProcesses(state.processes.filter((process) => process.id !== state.selectedProcessId));
      return { ...state, processes, tasks: state.tasks.map((task) => task.processId === deletedUid ? { ...task, processId: null } : task), selectedProcessId: processes[index]?.id ?? processes[index - 1]?.id ?? null, helpActive: false };
    }
    case 'process.move': {
      const index = state.processes.findIndex((process) => process.id === state.selectedProcessId); const nextIndex = index + event.direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= state.processes.length) return state;
      const processes = [...state.processes]; [processes[index], processes[nextIndex]] = [processes[nextIndex], processes[index]];
      return { ...state, processes: reindexProcesses(processes), selectedProcessId: nextIndex + 1, helpActive: false };
    }
    case 'process.update': return { ...state, processes: state.processes.map((process) => {
      if (process.id !== state.selectedProcessId) return process;
      const updated = { ...process, [event.field]: event.value };
      return event.field === 'strategy' ? normalizeProcessDirections(updated) : updated;
    }), helpActive: false };

    case 'boundary.select': return state.boundaries.some((boundary) => boundary.id === event.boundaryId) ? { ...state, selectedBoundaryId: event.boundaryId, helpActive: false } : state;
    case 'boundary.new': {
      const { name, nextNumber } = nextName(state.boundaries, 'New Boundary', state.nextNewBoundaryNumber);
      const boundary = boundaryTemplate(state.boundaries.length + 1, `boundary-new-${nextNumber}`, name, { relative: axisValues(), fixed: axisValues(), custom: axisValues() });
      return { ...state, boundaries: reindexBoundaries([...state.boundaries, boundary]), selectedBoundaryId: state.boundaries.length + 1, nextNewBoundaryNumber: nextNumber, helpActive: false };
    }
    case 'boundary.delete': {
      const index = state.boundaries.findIndex((boundary) => boundary.id === state.selectedBoundaryId);
      if (index < 0) return state;
      const deletedUid = state.boundaries[index].uid;
      const boundaries = reindexBoundaries(state.boundaries.filter((boundary) => boundary.id !== state.selectedBoundaryId));
      return { ...state, boundaries, tasks: state.tasks.map((task) => task.boundaryId === deletedUid ? { ...task, boundaryId: null } : task), selectedBoundaryId: boundaries[index]?.id ?? boundaries[index - 1]?.id ?? null, helpActive: false };
    }
    case 'boundary.move': {
      const index = state.boundaries.findIndex((boundary) => boundary.id === state.selectedBoundaryId); const nextIndex = index + event.direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= state.boundaries.length) return state;
      const boundaries = [...state.boundaries]; [boundaries[index], boundaries[nextIndex]] = [boundaries[nextIndex], boundaries[index]];
      return { ...state, boundaries: reindexBoundaries(boundaries), selectedBoundaryId: nextIndex + 1, helpActive: false };
    }
    case 'boundary.update': return { ...state, boundaries: state.boundaries.map((boundary) => {
      if (boundary.id !== state.selectedBoundaryId) return boundary;
      if (event.field === 'name' || event.field === 'marginType') return { ...boundary, [event.field]: event.value };
      return { ...boundary, marginValues: { ...boundary.marginValues, [boundary.marginType]: { ...boundary.marginValues[boundary.marginType], [event.field]: event.value } } };
    }), helpActive: false };
    case 'boundary.sign': {
      const axis = event.axis.toLowerCase(); const lowerField = `${axis}Lower`; const upperField = `${axis}Upper`;
      const customReset = { x: { lower: 0, upper: 130 }, y: { lower: 0, upper: 50 }, z: { lower: -10, upper: 0 } };
      return { ...state, boundaries: state.boundaries.map((boundary) => {
        if (boundary.id !== state.selectedBoundaryId) return boundary;
        const type = boundary.marginType; const step = type === 'relative' ? 10 : ({ x: 13, y: 5, z: 1 }[axis]); const values = boundary.marginValues[type];
        let lower = Number(values[lowerField]); let upper = Number(values[upperField]);
        if (event.sign === 'positive') { lower += step; upper += step; } else if (event.sign === 'negative') { lower -= step; upper -= step; } else if (type === 'custom') { lower = customReset[axis].lower; upper = customReset[axis].upper; } else { lower = 0; upper = 0; }
        return { ...boundary, marginValues: { ...boundary.marginValues, [type]: { ...values, [lowerField]: lower, [upperField]: upper } } };
      }), helpActive: false };
    }

    case 'task.select': return state.tasks.some((task) => task.id === event.taskId) ? { ...state, selectedTaskId: event.taskId, helpActive: false } : state;
    case 'task.new': {
      const { name, nextNumber } = nextName(state.tasks, 'New Task', state.nextNewTaskNumber);
      const task = { id: state.tasks.length + 1, uid: `task-new-${nextNumber}`, name, enabled: true, toolId: state.tools[0]?.uid ?? null, processId: state.processes[0]?.uid ?? null, boundaryId: state.boundaries[0]?.uid ?? null, generated: false };
      return { ...state, tasks: reindexTasks([...state.tasks, task]), selectedTaskId: state.tasks.length + 1, nextNewTaskNumber: nextNumber, helpActive: false };
    }
    case 'task.delete': {
      const index = state.tasks.findIndex((task) => task.id === state.selectedTaskId);
      if (index < 0) return state;
      const tasks = reindexTasks(state.tasks.filter((task) => task.id !== state.selectedTaskId));
      return { ...state, tasks, selectedTaskId: tasks[index]?.id ?? tasks[index - 1]?.id ?? null, helpActive: false };
    }
    case 'task.move': {
      const index = state.tasks.findIndex((task) => task.id === state.selectedTaskId); const nextIndex = index + event.direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= state.tasks.length) return state;
      const tasks = [...state.tasks]; [tasks[index], tasks[nextIndex]] = [tasks[nextIndex], tasks[index]];
      return { ...state, tasks: reindexTasks(tasks), selectedTaskId: nextIndex + 1, helpActive: false };
    }
    case 'task.update': return { ...state, tasks: state.tasks.map((task) => task.id === state.selectedTaskId ? { ...task, [event.field]: event.value } : task), helpActive: false };
    case 'task.toggleEnabled': return { ...state, tasks: state.tasks.map((task) => task.id === event.taskId ? { ...task, enabled: !task.enabled } : task), selectedTaskId: event.taskId, helpActive: false };
    case 'task.generate': {
      const task = selectedTask(state); const created = buildToolpath(state, task, state.nextToolpathId, state.toolpaths.length === 0);
      if (!created) return state;
      const existingIndex = state.toolpaths.findIndex((toolpath) => toolpath.taskId === task.uid);
      let toolpaths; let nextToolpathId = state.nextToolpathId;
      if (existingIndex >= 0) {
        toolpaths = state.toolpaths.map((toolpath, index) => index === existingIndex ? { ...created, id: toolpath.id, visible: toolpath.visible } : toolpath);
      } else {
        const taskIndex = state.tasks.findIndex((item) => item.uid === task.uid);
        const insertionIndex = state.toolpaths.findIndex((toolpath) => state.tasks.findIndex((item) => item.uid === toolpath.taskId) > taskIndex);
        toolpaths = [...state.toolpaths]; toolpaths.splice(insertionIndex < 0 ? toolpaths.length : insertionIndex, 0, created); nextToolpathId += 1;
      }
      return { ...state, toolpaths, nextToolpathId, toolpathTabCreated: true, selectedToolpathId: existingIndex >= 0 ? state.toolpaths[existingIndex].id : created.id, activeTab: 'toolpaths', tasks: state.tasks.map((item) => item.uid === task.uid ? { ...item, generated: true } : item), helpActive: false };
    }
    case 'task.generateAll': {
      const validTasks = state.tasks.filter((task) => taskReferences(state, task));
      const toolpaths = validTasks.map((task, index) => buildToolpath(state, task, state.nextToolpathId + index, index === 0));
      return { ...state, toolpaths, selectedToolpathId: toolpaths[0]?.id ?? null, nextToolpathId: state.nextToolpathId + toolpaths.length, toolpathTabCreated: state.toolpathTabCreated || toolpaths.length > 0, activeTab: toolpaths.length ? 'toolpaths' : state.activeTab, tasks: state.tasks.map((task) => ({ ...task, generated: validTasks.some((validTask) => validTask.uid === task.uid) })), helpActive: false };
    }

    case 'toolpath.select': return state.toolpaths.some((toolpath) => toolpath.id === event.toolpathId) ? { ...state, selectedToolpathId: event.toolpathId, helpActive: false } : state;
    case 'toolpath.toggleVisible': return { ...state, toolpaths: state.toolpaths.map((toolpath) => toolpath.id === event.toolpathId ? { ...toolpath, visible: !toolpath.visible } : toolpath), selectedToolpathId: event.toolpathId, helpActive: false };
    case 'toolpath.delete': {
      const index = state.toolpaths.findIndex((toolpath) => toolpath.id === state.selectedToolpathId);
      if (index < 0) return state;
      const toolpaths = state.toolpaths.filter((toolpath) => toolpath.id !== state.selectedToolpathId);
      return { ...state, toolpaths, selectedToolpathId: toolpaths[index]?.id ?? toolpaths[index - 1]?.id ?? null, helpActive: false };
    }
    case 'toolpath.move': {
      const index = state.toolpaths.findIndex((toolpath) => toolpath.id === state.selectedToolpathId); const nextIndex = index + event.direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= state.toolpaths.length) return state;
      const toolpaths = [...state.toolpaths]; [toolpaths[index], toolpaths[nextIndex]] = [toolpaths[nextIndex], toolpaths[index]];
      return { ...state, toolpaths, selectedToolpathId: toolpaths[nextIndex].id, helpActive: false };
    }
    case 'toolpath.demo': return { ...state, helpActive: false };

    case 'process.help':
    case 'boundary.help':
    case 'task.help':
    case 'help.toggle': return { ...state, helpActive: !state.helpActive };
    default: return state;
  }
}
