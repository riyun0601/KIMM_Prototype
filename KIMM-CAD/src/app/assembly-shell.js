import { baseToolbar, workbenchMenu } from '../workbenches/common/base-toolbar.js';
import { partWorkbench } from '../workbenches/part/toolbar.js';
import { partDesignWorkbench } from '../workbenches/part-design/toolbar.js';
import { createBracketWorkflow, modelStageFor, reduceBracketWorkflow } from '../workbenches/part-design/bracket-workflow.js';
import { sketcherWorkbench } from '../workbenches/sketcher/toolbar.js';
import { createThreeViewport } from '../cad/viewport/create-three-viewport.js';

const workbenches = {
  Start: { id: 'start', label: 'Start', documentLabel: null, toolbarLine: [] },
  Part: partWorkbench,
  'Part Design': partDesignWorkbench,
  Sketcher: sketcherWorkbench,
};

const app = document.querySelector('#app');
let selectedWorkbench = workbenches['Part Design'];
let documentCreated = false;
let menuOpen = false;
let statusMessage = 'Ready';
let partDesignFlowState = partDesignWorkbench.sketchAttachmentFlow.createInitialState();
let bracketWorkflow = createBracketWorkflow();
let threeViewport = null;
let sketchMode = null;

function setStatus(message) {
  statusMessage = message;
  const target = document.querySelector('#status-message');
  if (target) target.textContent = message;
}

function toolbarButton(item) {
  const command = item.command ? ` data-command="${item.command}"` : '';
  return `<span class="tool-slot${item.separatorAfter ? ' has-separator' : ''}">
    <button class="tool-button" type="button" data-action="${item.label}"${command} aria-label="${item.label}" title="${item.label}">
      <img src="${item.icon}" alt="" draggable="false" />
    </button>
  </span>`;
}

function toolbarRow(items, className = '') {
  return `<div class="toolbar-row ${className}">${items.map(toolbarButton).join('')}</div>`;
}

function sketcherToolbarRow() {
  const { image, width, items } = sketcherWorkbench.sketchToolbar;
  return `<div class="toolbar-row sketcher-toolbar-row"><div class="sketcher-toolbar-strip" style="width:${width}px">
    <img src="${image}" alt="Sketcher toolbar" draggable="false" />
    <div class="sketcher-toolbar-hitboxes">${items.map((item) => `<button class="sketcher-toolbar-hitbox" type="button" style="left:${item.left}px;width:${item.width}px" data-sketcher-tool="${item.tool || ''}" aria-label="${item.label}" title="${item.label}"></button>`).join('')}</div>
  </div></div>`;
}

function workbenchOptions() {
  return workbenchMenu.map((name) => `<button class="workbench-option${name === selectedWorkbench.label ? ' is-selected' : ''}" type="button" data-workbench="${name}">${name}</button>`).join('');
}

function featureTree() {
  const labels = {
    'profile-ready': 'Sketch (Bracket profile)', revolved: 'Revolution', 'circle-ready': 'Sketch001 (Circle)', pocket: 'Pocket', pattern: 'PolarPattern (4)',
  };
  const feature = labels[bracketWorkflow.phase];
  return `<div class="tree-section-label">Application</div>
    <div class="tree-row"><span class="tree-toggle">−</span><span class="tree-cube"></span><strong>Unnamed</strong></div>
    <div class="tree-row nested"><span class="tree-toggle">−</span><span class="tree-cube"></span><strong>Body</strong></div>
    <div class="tree-row doubly-nested"><span class="tree-toggle">+</span><span class="tree-origin"></span>Origin</div>
    ${feature ? `<div class="tree-row doubly-nested feature-row${bracketWorkflow.selectedFace ? ' is-selected' : ''}"><span class="tree-cube"></span>${feature}</div>` : ''}`;
}

function selectionProperties() {
  if (!bracketWorkflow.selectedFace) return `<div class="property-group">Display Options</div><dl><dt>Display Model</dt><dd>Flat Lines</dd><dt>Visibility</dt><dd>true</dd></dl><div class="property-group">Selection</div><dl><dt>Selection</dt><dd>Shape</dd></dl>`;
  return `<div class="property-group">Base</div><dl><dt>Label</dt><dd>Revolution</dd><dt>Suppressed</dt><dd>false</dd></dl>
    <div class="property-group">Part Design</div><dl><dt>Refine</dt><dd>true</dd></dl>
    <div class="property-group">Revolution</div><dl><dt>Type</dt><dd>Angle</dd><dt>Axis</dt><dd>[1.00 0.00 0.00]</dd><dt>Angle</dt><dd>360.00 °</dd><dt>Reference Axis</dt><dd>Sketch [H_Axis]</dd></dl>
    <div class="property-group">Selected Face</div><dl><dt>Feature</dt><dd>${bracketWorkflow.selectedFace.label}</dd><dt>Face</dt><dd>${bracketWorkflow.selectedFace.faceIndex + 1}</dd></dl>`;
}

function attachmentTaskContent() {
  const task = partDesignWorkbench.sketchAttachmentFlow.task;
  const hasSelection = Boolean(partDesignFlowState.selectedPlaneId);
  return `<div class="attachment-task"><h2>${task.prompt}</h2><div class="attachment-plane-list" role="radiogroup">
    ${task.planes.map((plane) => `<button type="button" class="attachment-plane${partDesignFlowState.selectedPlaneId === plane.id ? ' is-selected' : ''}" data-plane-id="${plane.id}" role="radio" aria-checked="${partDesignFlowState.selectedPlaneId === plane.id}">${plane.label}</button>`).join('')}
  </div><div class="task-actions"><button type="button" data-task-action="confirm"${hasSelection ? '' : ' disabled'}>확인</button><button type="button" data-task-action="cancel">취소</button></div></div>`;
}

function patternTaskContent() {
  return `<div class="attachment-task pattern-task"><h2>Polar pattern parameters</h2><label>Mode<select disabled><option>전체 각도</option></select></label><label>Angle<input value="360°" disabled /></label><label>Occurrences<input type="number" min="1" max="12" value="${bracketWorkflow.patternCount}" data-pattern-count /></label><div class="task-actions"><button type="button" data-pattern-action="confirm">확인</button><button type="button" data-pattern-action="cancel">취소</button></div></div>`;
}

function sidebarContent() {
  if (!documentCreated) return '';
  if (partDesignFlowState.task === 'attachment-plane') return attachmentTaskContent();
  if (bracketWorkflow.task === 'polar-pattern') return patternTaskContent();
  return `<div class="property-mode"><span>Labels &amp; Attributes</span><span>Description</span></div><div class="model-tree">${featureTree()}</div><div class="properties"><div class="property-head"><span>Property</span><span>Value</span></div>${selectionProperties()}</div><div class="view-tabs"><button class="is-active">View</button><button>Data</button></div>`;
}

function viewportContent() {
  if (!documentCreated) return `<section class="new-file-page" aria-label="New file start page"><h1>새 파일</h1><div class="new-file-actions"><button type="button" class="new-file-card" data-new-file><span class="new-file-icon">＋</span><span><strong>빈 파일</strong><small>새로운 빈 CAD 문서를 생성합니다</small></span></button></div></section>`;
  return `<div class="three-host" data-three-host></div>`;
}

function render() {
  threeViewport?.dispose();
  threeViewport = null;
  const selectedLine = selectedWorkbench.id === 'sketcher' ? sketcherToolbarRow() : (selectedWorkbench.toolbarLine.length ? toolbarRow(selectedWorkbench.toolbarLine, 'workbench-toolbar') : '');
  const taskMode = partDesignFlowState.task === 'attachment-plane' || bracketWorkflow.task === 'polar-pattern';
  app.innerHTML = `<main class="cad-window${documentCreated ? '' : ' is-no-document'}">
    <header class="title-bar"><div class="brand-mark">◆</div><span>KIMM-CAD V22</span><div class="window-controls" aria-hidden="true"><span>—</span><span>□</span><span>×</span></div></header>
    <nav class="menu-bar" aria-label="Application menu">${['File', 'Edit', 'View', 'Tools', 'Macro', 'Sketch', 'Part Design', 'Measure', 'Windows', 'Help'].map((name) => `<button type="button" data-action="${name} menu">${name}</button>`).join('')}</nav>
    <section class="toolbar-area"><div class="toolbar-row primary-toolbar">${baseToolbar.line1.map(toolbarButton).join('')}<span class="toolbar-divider"></span><div class="workbench-picker"><button class="workbench-trigger" type="button" data-toggle-workbenches aria-expanded="${menuOpen}"><span class="workbench-arrow">◆</span><span>${selectedWorkbench.label}</span><span class="picker-chevron">⌄</span></button><div class="workbench-menu${menuOpen ? ' is-open' : ''}">${workbenchOptions()}</div></div><span class="toolbar-divider"></span><span class="record-dot"></span><span class="tool-placeholder square"></span><span class="tool-placeholder document"></span><span class="play-symbol">▶</span></div>${toolbarRow(baseToolbar.line2, 'secondary-toolbar')}${selectedLine}</section>
    <section class="document-tabs${documentCreated ? '' : ' is-empty'}">${documentCreated ? '<button class="document-tab is-active"><span class="tab-cube">◆</span>Unnamed : 1 <span class="close-tab">×</span></button>' : ''}</section>
    <section class="workspace"><aside class="combo-view${taskMode ? ' is-task-mode' : ''}"><div class="panel-heading">Combo View <span>□</span><span>×</span></div><div class="panel-tabs"><button class="${taskMode ? '' : 'is-active'}">Model</button><button class="${taskMode ? 'is-active' : ''}">Tasks</button></div>${sidebarContent()}</aside><section class="viewport${selectedWorkbench.id === 'sketcher' ? ' is-sketcher' : ''}">${viewportContent()}</section></section>
    <footer class="status-bar"><span class="status-progress"></span><span id="status-message">${statusMessage}</span><span class="units">Unit system: mm, ton, s, °C</span></footer>
  </main>`;
  mountThreeViewport();
}

function mountThreeViewport() {
  const host = document.querySelector('[data-three-host]');
  if (!host) return;
  threeViewport = createThreeViewport({
    host,
    stage: modelStageFor(bracketWorkflow.phase),
    view: bracketWorkflow.view,
    profile: bracketWorkflow.profile,
    sketch: selectedWorkbench.id === 'sketcher' ? { kind: sketchMode } : null,
    faceCircle: bracketWorkflow.faceCircle,
    patternCount: bracketWorkflow.patternCount,
    selectedFeatureId: bracketWorkflow.selectedFace?.featureId ?? null,
    onHoverChange: (hover) => { if (hover) setStatus(`${hover.label}: click a face to select it`); },
    onSelectionChange: (face) => {
      bracketWorkflow = reduceBracketWorkflow(bracketWorkflow, { type: 'face.select', face });
      setStatus(`${face.label} face selected`);
      render();
    },
    onSketchComplete: completeSketch,
    onViewChange: (view) => {
      bracketWorkflow = reduceBracketWorkflow(bracketWorkflow, { type: 'view.set', view });
      setStatus(`${view.toUpperCase()} view selected`);
      render();
    },
  });
}

function completeSketch(result) {
  if (result.kind === 'profile') {
    bracketWorkflow = reduceBracketWorkflow(bracketWorkflow, { type: 'profile.completed', points: result.points });
    selectedWorkbench = workbenches['Part Design'];
    partDesignFlowState = partDesignWorkbench.sketchAttachmentFlow.createInitialState();
    sketchMode = null;
    setStatus('Sketch completed. Select Part Design icon 4-13 to revolve the profile.');
  } else {
    bracketWorkflow = reduceBracketWorkflow(bracketWorkflow, {
      type: 'circle.completed',
      // The 2D center/radius only become unambiguous when paired with the
      // selected annular face that supplied the sketch plane.
      circle: { ...result.circle, faceFeatureId: bracketWorkflow.selectedFace?.featureId },
    });
    selectedWorkbench = workbenches['Part Design'];
    sketchMode = null;
    setStatus('Circle path created. Select the circle path, then use Part Design icon 4-19 to create the pocket.');
  }
  render();
}

app.addEventListener('click', (event) => {
  if (event.target.closest('[data-new-file]')) {
    documentCreated = true;
    selectedWorkbench = workbenches['Part Design'];
    partDesignFlowState = partDesignWorkbench.sketchAttachmentFlow.createInitialState();
    bracketWorkflow = createBracketWorkflow();
    sketchMode = null;
    setStatus('Unnamed : 1 created.');
    render();
    return;
  }
  const command = event.target.closest('[data-command]')?.dataset.command;
  if (command && !documentCreated) { setStatus('Create a new file before using Part Design commands.'); return; }
  if (command === 'partDesign.createSketch') {
    if (bracketWorkflow.selectedFace) {
      bracketWorkflow = reduceBracketWorkflow(bracketWorkflow, { type: 'face-sketch.start' });
      if (bracketWorkflow.task === 'face-sketch') {
        selectedWorkbench = workbenches.Sketcher;
        sketchMode = 'face-circle';
        setStatus('Right face sketch: choose Sketcher toolbar item 5 to create a circle.');
        render();
      }
    } else {
      partDesignFlowState = partDesignWorkbench.sketchAttachmentFlow.reduce(partDesignFlowState, { type: 'command', command });
      setStatus('Select an attachment plane.');
      render();
    }
    return;
  }
  if (command === 'partDesign.revolveBracket') {
    const next = reduceBracketWorkflow(bracketWorkflow, { type: 'revolve' });
    if (next === bracketWorkflow) setStatus('Complete the profile sketch before revolving.');
    else { bracketWorkflow = next; setStatus('Revolution created. Hover and click a face to inspect it.'); render(); }
    return;
  }
  if (command === 'partDesign.pocketCircle') {
    const next = reduceBracketWorkflow(bracketWorkflow, { type: 'pocket' });
    if (next === bracketWorkflow) setStatus('Create a circle on a selected face before pocketing.');
    else { bracketWorkflow = next; setStatus('Pocket created. Use icon 4-27 for the polar pattern.'); render(); }
    return;
  }
  if (command === 'partDesign.polarPattern') {
    const next = reduceBracketWorkflow(bracketWorkflow, { type: 'pattern.open' });
    if (next === bracketWorkflow) setStatus('Create the first pocket before opening a pattern.');
    else { bracketWorkflow = next; setStatus('Set occurrences to 4 and confirm.'); render(); }
    return;
  }
  const sketchTool = event.target.closest('[data-sketcher-tool]')?.dataset.sketcherTool;
  if (sketchTool) {
    if (threeViewport?.setSketchTool(sketchTool)) setStatus(sketchTool === 'polyline' ? 'Polyline tool active' : 'Circle tool active');
    return;
  }
  const planeId = event.target.closest('[data-plane-id]')?.dataset.planeId;
  if (planeId) { partDesignFlowState = partDesignWorkbench.sketchAttachmentFlow.reduce(partDesignFlowState, { type: 'plane.select', planeId }); render(); return; }
  const taskAction = event.target.closest('[data-task-action]')?.dataset.taskAction;
  if (taskAction) {
    partDesignFlowState = partDesignWorkbench.sketchAttachmentFlow.reduce(partDesignFlowState, { type: `task.${taskAction}` });
    if (taskAction === 'confirm' && partDesignFlowState.activeWorkbench === 'sketcher') { selectedWorkbench = workbenches.Sketcher; sketchMode = 'profile'; setStatus('Top view opened. Use Sketcher item 2 to draw the bracket profile.'); }
    if (taskAction === 'cancel') setStatus('Sketch creation cancelled.');
    render();
    return;
  }
  const patternAction = event.target.closest('[data-pattern-action]')?.dataset.patternAction;
  if (patternAction) { bracketWorkflow = reduceBracketWorkflow(bracketWorkflow, { type: patternAction === 'confirm' ? 'pattern.confirm' : 'task.cancel' }); setStatus(patternAction === 'confirm' ? 'Four-hole polar pattern created.' : 'Polar pattern cancelled.'); render(); return; }
  const workbenchButton = event.target.closest('[data-workbench]');
  if (workbenchButton) { selectedWorkbench = workbenches[workbenchButton.dataset.workbench] || workbenches.Start; menuOpen = false; setStatus(`${selectedWorkbench.label} workbench loaded.`); render(); return; }
  if (event.target.closest('[data-toggle-workbenches]')) { menuOpen = !menuOpen; render(); return; }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action) setStatus(`${action} selected`);
});

app.addEventListener('input', (event) => {
  if (event.target.matches('[data-pattern-count]')) bracketWorkflow = reduceBracketWorkflow(bracketWorkflow, { type: 'pattern.count', count: event.target.value });
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.target.matches?.('[data-pattern-count]') && bracketWorkflow.task === 'polar-pattern') {
    bracketWorkflow = reduceBracketWorkflow(bracketWorkflow, { type: 'pattern.count', count: event.target.value });
    bracketWorkflow = reduceBracketWorkflow(bracketWorkflow, { type: 'pattern.confirm' });
    setStatus(`Polar pattern created with ${bracketWorkflow.patternCount} holes.`);
    render();
    return;
  }
  if (event.key === 'Escape' && menuOpen) { menuOpen = false; render(); }
});

render();
