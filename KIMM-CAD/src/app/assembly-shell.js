import { baseToolbar, workbenchMenu } from '../workbenches/common/base-toolbar.js';
import { partWorkbench } from '../workbenches/part/toolbar.js';
import { partDesignWorkbench } from '../workbenches/part-design/toolbar.js';
import { sketcherWorkbench } from '../workbenches/sketcher/toolbar.js';

const workbenches = {
  Start: { id: 'start', label: 'Start', documentLabel: null, toolbarLine: [] },
  Part: partWorkbench,
  'Part Design': partDesignWorkbench,
  Sketcher: sketcherWorkbench,
};

const app = document.querySelector('#app');
let selectedWorkbench = workbenches.Start;
let menuOpen = false;

function toolbarButton(item) {
  return `
    <span class="tool-slot${item.separatorAfter ? ' has-separator' : ''}">
      <button class="tool-button" type="button" data-action="${item.label}" aria-label="${item.label}" title="${item.label}">
        <img src="${item.icon}" alt="" draggable="false" />
      </button>
    </span>`;
}

function toolbarRow(items, extraClass = '') {
  return `<div class="toolbar-row ${extraClass}">${items.map(toolbarButton).join('')}</div>`;
}

function workbenchOptions() {
  return workbenchMenu.map((name) => `
    <button class="workbench-option${name === selectedWorkbench.label ? ' is-selected' : ''}" type="button" data-workbench="${name}">
      ${name}
    </button>`).join('');
}

function treeContent() {
  if (!selectedWorkbench.documentLabel) {
    return `
      <div class="tree-section-label">Application</div>
      <div class="tree-row"><span class="tree-toggle">+</span><span class="tree-cube"></span><strong>Unnamed</strong></div>`;
  }

  const entity = selectedWorkbench.documentLabel;
  return `
    <div class="tree-section-label">Application</div>
    <div class="tree-row"><span class="tree-toggle">−</span><span class="tree-cube"></span><strong>Unnamed</strong></div>
    <div class="tree-row nested"><span class="tree-toggle">−</span><span class="tree-cube"></span><strong>${entity}</strong></div>
    <div class="tree-row doubly-nested"><span class="tree-toggle">+</span><span class="tree-origin"></span>Origin</div>`;
}

function viewportObject() {
  if (selectedWorkbench.id === 'start') {
    return `<div class="origin-axes" aria-label="3D axis indicator"><i class="axis-z"></i><i class="axis-x"></i><i class="axis-y"></i><b>Z</b><em>X</em><span>Y</span></div>`;
  }

  return `
    <svg class="model-cube" viewBox="0 0 500 560" role="img" aria-label="CAD model placeholder">
      <polygon points="250,24 474,154 250,284 26,154" fill="#d0d0d0" stroke="#333" stroke-width="3" />
      <polygon points="26,154 250,284 250,536 26,406" fill="#c7c7c7" stroke="#333" stroke-width="3" />
      <polygon points="250,284 474,154 474,406 250,536" fill="#bebebe" stroke="#333" stroke-width="3" />
    </svg>
    <div class="origin-axes compact" aria-label="3D axis indicator"><i class="axis-z"></i><i class="axis-x"></i><i class="axis-y"></i></div>`;
}

function render() {
  const selectedLine = selectedWorkbench.toolbarLine.length
    ? toolbarRow(selectedWorkbench.toolbarLine, 'workbench-toolbar')
    : '';

  app.innerHTML = `
    <main class="cad-window">
      <header class="title-bar">
        <div class="brand-mark">◆</div><span>KIMM-CAD V22</span>
        <div class="window-controls" aria-hidden="true"><span>−</span><span>□</span><span>×</span></div>
      </header>
      <nav class="menu-bar" aria-label="Application menu">
        ${['File', 'Edit', 'View', 'Tools', 'Macro', 'Sketch', 'Part Design', 'Measure', 'Windows', 'Help'].map((name) => `<button type="button" data-action="${name} menu">${name}</button>`).join('')}
      </nav>
      <section class="toolbar-area" aria-label="Command toolbars">
        <div class="toolbar-row primary-toolbar">
          ${baseToolbar.line1.map(toolbarButton).join('')}
          <span class="toolbar-divider"></span>
          <div class="workbench-picker">
            <button class="workbench-trigger" type="button" aria-haspopup="listbox" aria-expanded="${menuOpen}" data-toggle-workbenches>
              <span class="workbench-arrow">◆</span><span>${selectedWorkbench.label}</span><span class="picker-chevron">⌄</span>
            </button>
            <div class="workbench-menu${menuOpen ? ' is-open' : ''}" role="listbox" aria-label="Workbench">
              ${workbenchOptions()}
            </div>
          </div>
          <span class="toolbar-divider"></span>
          <span class="record-dot" title="Record macro"></span>
          <span class="tool-placeholder square"></span><span class="tool-placeholder document"></span><span class="play-symbol">▶</span>
        </div>
        ${toolbarRow(baseToolbar.line2, 'secondary-toolbar')}
        ${selectedLine}
      </section>
      <section class="document-tabs">
        <button class="document-tab is-active"><span class="tab-cube">◆</span>시작페이지 <span class="close-tab">×</span></button>
        <button class="document-tab"><span class="tab-cube">◆</span>Unnamed : 1 <span class="close-tab">×</span></button>
      </section>
      <section class="workspace">
        <aside class="combo-view">
          <div class="panel-heading">Combo View <span>⌗</span><span>×</span></div>
          <div class="panel-tabs"><button class="is-active">Model</button><button>Tasks</button></div>
          <div class="property-mode"><span>Labels &amp; Attributes</span><span>Description</span></div>
          <div class="model-tree">${treeContent()}</div>
          <div class="properties">
            <div class="property-head"><span>Property</span><span>Value</span></div>
            <div class="property-group">Display Options</div>
            <dl><dt>Display Model</dt><dd>Group</dd><dt>Show In Tree</dt><dd>true</dd><dt>Visibility</dt><dd>true</dd></dl>
            <div class="property-group">Selection</div>
            <dl><dt>On Top Whe...</dt><dd>Disabled</dd><dt>Selection</dt><dd>Shape</dd></dl>
          </div>
          <div class="view-tabs"><button class="is-active">View</button><button>Data</button></div>
        </aside>
        <section class="viewport">
          ${viewportObject()}
          <div class="navigation-cube"><span class="nav-face top"></span><span class="nav-face left"></span><span class="nav-face right"></span></div>
        </section>
      </section>
      <footer class="status-bar"><span class="status-progress"></span><span id="status-message">Ready</span><span class="units">Unit system: mm, ton, s, °C</span></footer>
    </main>`;
}

function setStatus(message) {
  const target = document.querySelector('#status-message');
  if (target) target.textContent = message;
}

app.addEventListener('click', (event) => {
  const workbenchButton = event.target.closest('[data-workbench]');
  if (workbenchButton) {
    const requested = workbenchButton.dataset.workbench;
    selectedWorkbench = workbenches[requested] || workbenches.Start;
    menuOpen = false;
    render();
    setStatus(`${selectedWorkbench.label} workbench loaded`);
    return;
  }

  if (event.target.closest('[data-toggle-workbenches]')) {
    menuOpen = !menuOpen;
    render();
    return;
  }

  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action) setStatus(`${action} selected`);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuOpen) {
    menuOpen = false;
    render();
  }
});

render();
