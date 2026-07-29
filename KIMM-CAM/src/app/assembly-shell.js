import { getControlTabs, isEnabledTab } from '../common/tabs.js';
import { createInitialControlState, reduceControlState, selectedBoundary, selectedProcess, selectedTask, selectedTool, selectedToolpath } from '../workflows/tool-flow.js';

const app = document.querySelector('#app');
const defaultStatus = 'No previous undo state available - request ignored';
let controlState = createInitialControlState();
let openSelectId = null;
let displayedStageImage = 'default.png';
let requestedStageImage = 'default.png';
let statusMessage = defaultStatus;

const iconPath = (icon) => `./refs/icons/${icon}.png`;
const formatDiameter = (diameter) => Number(diameter).toFixed(1);
const toolLabel = (tool) => `${tool.name} (d=${formatDiameter(tool.diameter)})`;
const visualImagePath = (filename) => `./refs/UI/${encodeURIComponent(filename)}`;

function boundaryStageImage(boundary) {
  if (boundary?.uid === 'boundary-minimum') return 'minimum.png';
  if (boundary?.uid === 'boundary-10-margin') return '10% margin.png';
  return 'default.png';
}

function currentStageImage() {
  if (controlState.toolpathTabCreated) {
    const visibleKey = controlState.toolpaths
      .slice(0, 3)
      .map((toolpath, index) => toolpath.visible ? String(index + 1) : '')
      .join('');
    const toolpathImages = {
      1: 'tool path1.png',
      2: 'tool path2.png',
      3: 'tool path3.png',
      12: 'tool path12.png',
      13: 'tool path13.png',
      23: 'tool path23.png',
      123: 'tool path123.png',
    };
    return toolpathImages[visibleKey] || 'minimum.png';
  }

  if (controlState.activeTab === 'boundary') return boundaryStageImage(selectedBoundary(controlState));
  if (controlState.activeTab === 'job') {
    const task = selectedTask(controlState);
    const boundary = controlState.boundaries.find((item) => item.uid === task?.boundaryId) ?? null;
    return boundaryStageImage(boundary);
  }
  return 'default.png';
}

function visualStageContent() {
  const nextImage = currentStageImage();
  requestedStageImage = nextImage;
  const pendingImage = requestedStageImage !== displayedStageImage
    ? `<img class="stage-image stage-image-pending" data-stage-layer="pending" data-stage-file="${requestedStageImage}" src="${visualImagePath(requestedStageImage)}" alt="" draggable="false" />`
    : '';
  return `<img class="stage-image stage-image-current" src="${visualImagePath(displayedStageImage)}" alt="" draggable="false" />${pendingImage}`;
}

const checkboxIconPath = (checked) => iconPath(checked ? 'checkbox' : 'checkbox_none');

function setStatus() {}
function uiSelect({ id, kind, field, value, options, disabled = false, compact = false }) {
  const normalizedValue = value == null ? '' : String(value);
  const selectedOption = options.find(([optionValue]) => String(optionValue) === normalizedValue) || options[0];
  const isOpen = !disabled && openSelectId === id;
  const stateClass = `${compact ? ' is-compact' : ''}${disabled ? ' is-disabled' : ''}${isOpen ? ' is-open' : ''}`;
  return `<div class="ui-select${stateClass}" data-select-id="${id}" data-select-kind="${kind}" data-select-field="${field}">
    <button type="button" class="ui-select-value" data-select-toggle="${id}" aria-haspopup="listbox" aria-expanded="${isOpen}"${disabled ? ' disabled aria-disabled="true"' : ''}><span class="ui-select-text">${selectedOption[1]}</span></button>
    <button type="button" class="ui-select-toggle" data-select-toggle="${id}" aria-label="드롭다운 열기"${disabled ? ' disabled aria-disabled="true"' : ''}><img src="${iconPath(isOpen ? 'up' : 'down')}" alt="" class="ui-select-arrow-image" /></button>
    <div class="ui-select-options" role="listbox"${isOpen ? '' : ' hidden'}>${options.map(([optionValue, optionLabel]) => `<button type="button" class="ui-select-option${String(optionValue) === normalizedValue ? ' is-selected' : ''}" role="option" aria-selected="${String(optionValue) === normalizedValue}" data-select-option="${optionValue}">${optionLabel}</button>`).join('')}</div>
  </div>`;
}

function modelRadio(field, value, label, selected) {
  return `<label class="ui-radio"><input type="radio" name="${field}" data-model-field="${field}" value="${value}"${selected === value ? ' checked' : ''} /><span class="ui-radio-mark"></span><span class="ui-radio-text">${label}</span></label>`;
}

function modelButton(label, action, extraClass = '') {
  return `<button type="button" class="model-button${extraClass ? ` ${extraClass}` : ''}" data-model-action="${action}">${label}</button>`;
}

function modelContent() {
  const model = controlState.modelTab;
  const extensionLabels = {
    none: '없음',
    grid: '그리드 패턴',
    edge: '자동 배포 (가장자리)',
    corner: '자동 배포 (모서리)',
  };
  const scaleAxisOptions = [['x', 'X'], ['y', 'Y'], ['z', 'Z']];
  const extensionOptions = Object.entries(extensionLabels);
  const positionRow = (axis) => `<div class="move-field"><button type="button" class="move-step move-prev" data-model-shift="${axis}" data-shift-direction="-1" aria-label="${axis} 감소">‹</button><input type="text" class="move-value" data-model-field="position${axis}" value="" placeholder="${axis}: 0.00" aria-label="${axis} 배포값" /><button type="button" class="move-step move-next" data-model-shift="${axis}" data-shift-direction="1" aria-label="${axis} 증가">›</button></div>`;
  return `<div class="tab-content model-content">
    <section class="model-transform-area">
      <h1>모델 변환</h1>
      <div class="model-transform-grid">
        <div class="model-column ui-radio-group">
          ${modelRadio('rotationAxis', 'x', 'x-축 기준', model.rotationAxis)}
          ${modelRadio('rotationAxis', 'y', 'y-축 기준', model.rotationAxis)}
          ${modelRadio('rotationAxis', 'z', 'z-축 기준', model.rotationAxis)}
          ${modelButton('회전', 'rotate')}
        </div>
        <div class="model-column ui-radio-group">
          ${modelRadio('flipPlane', 'xy', 'xy-평면 기준', model.flipPlane)}
          ${modelRadio('flipPlane', 'xz', 'xz-평면 기준', model.flipPlane)}
          ${modelRadio('flipPlane', 'yz', 'yz-평면 기준', model.flipPlane)}
          ${modelButton('뒤집기', 'flip')}
        </div>
        <div class="model-column ui-radio-group">
          ${modelRadio('swapAxis', 'xy', 'x ↔ y', model.swapAxis)}
          ${modelRadio('swapAxis', 'xz', 'x ↔ z', model.swapAxis)}
          ${modelRadio('swapAxis', 'yz', 'y ↔ z', model.swapAxis)}
          ${modelButton('교체', 'swap')}
        </div>
      </div>
    </section>

    <section class="model-lower-grid model-settings-grid">
      <div class="model-column detail-column model-settings-column">
        <h2>모델 치수</h2>
        <label class="compact-field scale-field"><span class="field-caption">배율</span><span class="percent-field"><input type="number" data-model-field="scalePercent" value="${Number(model.scalePercent)}" step="0.01" aria-label="배율" /><span aria-hidden="true">%</span></span></label>
        ${modelButton('모델 스케일', 'model-scale', 'scale-button')}
        <div class="axis-value-row">${uiSelect({ id: 'model-scale-axis', kind: 'model', field: 'scaleAxis', value: model.scaleAxis, options: scaleAxisOptions, compact: true })}<input type="number" data-model-field="scaleAmount" value="${Number(model.scaleAmount).toFixed(2)}" step="0.01" aria-label="값" /></div>
        <label class="proportional-control image-checkbox"><input type="checkbox" data-model-field="proportional"${model.proportional ? ' checked' : ''} /><img class="checkbox-icon" src="${checkboxIconPath(model.proportional)}" alt="" /><span>비례</span></label>
        ${modelButton('적정 치수', 'fit-size', 'model-column-last')}
      </div>
      <div class="model-column detail-column distribution-column model-settings-column">
        <h2>모델 배포</h2>
        ${positionRow('X')}
        ${positionRow('Y')}
        ${positionRow('Z')}
        ${modelButton('이동', 'move', 'is-muted')}
        ${modelButton('원점으로 이동', 'move-origin', 'is-muted model-column-last')}
      </div>
      <div class="model-column detail-column misc-column model-settings-column">
        <h2>잡무</h2>
        <div class="ui-radio-group">
        ${modelRadio('projection', '2d', '2D 프로젝션', model.projection)}
        ${modelRadio('projection', 'mm-inch', 'mm → Inch', model.projection)}
        ${modelRadio('projection', 'inch-mm', 'Inch → mm', model.projection)}
        </div>
        <div class="help-row model-column-last" role="button" tabindex="0" data-model-action="help"><img src="${iconPath(1)}" alt="" /><span>도움말</span></div>
      </div>
    </section>

    <section class="model-extension-area">
      <h2>모델 확장</h2>
      ${uiSelect({ id: 'model-extension', kind: 'model', field: 'extension', value: model.extension, options: extensionOptions })}
    </section>
  </div>`;
}
function iconButton(icon, label, action, disabled = false) {
  const actionNames = { new: 'new-tool', delete: 'delete-tool', up: 'move-up', down: 'move-down' };
  return `<button type="button" class="tool-action" data-tool-action="${action}" data-action="${actionNames[action] || action}"${disabled ? ' disabled' : ''}><img src="${iconPath(icon)}" alt="" /><span>${label}</span></button>`;
}

function toolsContent() {
  const selected = selectedTool(controlState);
  const selectedIndex = controlState.tools.findIndex((tool) => tool.id === controlState.selectedToolId);
  const isDisabled = !selected;
  const disabled = isDisabled ? ' disabled' : '';
  const shapeOptions = [['ball', '볼 엔드밀'], ['flat', '평 엔드밀'], ['toroidal', '토로이달 엔드밀']];
  const torusField = selected?.shape === 'toroidal'
    ? `<label class="tool-inline-field"><span>토러스 지름</span><input type="number" min="0" step="0.1" data-tool-field="torusDiameter" value="${Number(selected.torusDiameter).toFixed(2)}"${disabled} /></label>`
    : '';
  const toolRows = controlState.tools.length
    ? controlState.tools.map((tool) => `<button type="button" class="tool-row${tool.id === controlState.selectedToolId ? ' is-selected' : ''}" data-tool-id="${tool.id}" role="option" aria-selected="${tool.id === controlState.selectedToolId}"><span class="tool-id">${tool.id}</span><span class="tool-name">${tool.name}</span><span class="tool-diameter">(d=${formatDiameter(tool.diameter)})</span></button>`).join('')
    : '<p class="empty-tools">등록된 공구가 없습니다.</p>';

  return `<div class="tab-content tools-content">
    <section class="tool-setup-section">
      <h1>도구 설정</h1>
      <div class="tool-setting-box">
        <div class="tool-list" role="listbox" aria-label="공구 목록">
          <div class="tool-list-head">Tool ID | Name</div>
          ${toolRows}
        </div>
        <aside class="tool-action-panel" aria-label="공구 조작">
          ${iconButton(2, '새로 만들기', 'new')}
          ${iconButton(3, '삭제', 'delete', !selected)}
          ${iconButton(4, '위', 'up', selectedIndex <= 0)}
          ${iconButton(5, '아래', 'down', selectedIndex < 0 || selectedIndex === controlState.tools.length - 1)}
          <div class="help-row tool-help-row" role="button" tabindex="0" data-tool-action="help" data-action="help"><img src="${iconPath(1)}" alt="" /><span>도움말</span></div>
        </aside>
      </div>    </section>

    <section class="tool-name-section">
      <label class="tool-name-field"><span>작업명</span><input type="text" data-tool-field="name" value="${selected ? selected.name : ''}" placeholder="${selected ? '' : 'Text Input'}"${disabled} /></label>
    </section>

    <section class="tool-shape-dimension-grid">
      <div class="tool-shape-section">
        <h2>형태</h2>
        <div class="tool-shape-options ui-radio-group">${shapeOptions.map(([value, label]) => `<label class="ui-radio"><input type="radio" name="tool-shape" data-tool-field="shape" value="${value}"${selected?.shape === value ? ' checked' : ''} /><span class="ui-radio-mark"></span><span class="ui-radio-text">${label}</span></label>`).join('')}</div>
      </div>
      <div class="tool-dimension-section">
        <h2>치수</h2>
        <label class="tool-inline-field"><span>공구 직경</span><input type="number" min="0.1" step="0.1" data-tool-field="diameter" value="${selected ? Number(selected.diameter).toFixed(2) : ''}"${disabled} /></label>${torusField}
      </div>
    </section>

    <section class="tool-speed-section">
      <h2>속도</h2>
      <div class="tool-speed-grid">
        <div class="tool-speed-row"><span>단위</span><strong>mm/minute</strong></div>
        <label class="tool-speed-row"><span>이송 속도</span><input type="number" min="0" step="1" data-tool-field="feedRate" value="${selected ? selected.feedRate : ''}"${disabled} /></label>
        <label class="tool-speed-row"><span>스핀들 속도</span><input type="number" min="0" step="1" data-tool-field="spindleSpeed" value="${selected ? selected.spindleSpeed : ''}"${disabled} /></label>
      </div>
    </section>
  </div>`;
}
function processActionButton(icon, label, action, disabled = false) {
  const actionNames = { new: 'new-process', delete: 'delete-process', up: 'move-up', down: 'move-down' };
  return `<button type="button" class="process-action" data-process-action="${action}" data-action="${actionNames[action] || action}"${disabled ? ' disabled' : ''}><img src="${iconPath(icon)}" alt="" /><span>${label}</span></button>`;
}

function procedureContent() {
  const process = selectedProcess(controlState);
  const selectedIndex = controlState.processes.findIndex((item) => item.id === controlState.selectedProcessId);
  const strategyOptions = [
    ['rough', '황삭 가공'],
    ['semi-shape', '중삭(형상) 가공'],
    ['semi-follow', '중삭(추종) 가공'],
    ['finishing', '정삭 가공(Finishing)'],
    ['engraving', '2차원 조각'],
  ];
  const routeFields = [
    ['overlap', '겹치디다 [%]'],
    ['materialAllowance', '재료 잔량'],
    ['maxDepth', '최대 절입량'],
    ['offset', '가공 오프셋'],
  ];
  const availability = {
    rough: { disabledFields: ['offset', 'pocketing'], disabledGrid: [], disabledMilling: [] },
    'semi-shape': { disabledFields: ['offset', 'pocketing'], disabledGrid: ['y', 'all'], disabledMilling: ['up', 'down'] },
    'semi-follow': { disabledFields: ['overlap', 'materialAllowance', 'offset', 'pocketing'], disabledGrid: ['x', 'y', 'all'], disabledMilling: ['ignore'] },
    finishing: { disabledFields: ['maxDepth', 'offset', 'pocketing'], disabledGrid: [], disabledMilling: [] },
    engraving: { disabledFields: ['overlap', 'materialAllowance'], disabledGrid: ['x', 'y', 'all'], disabledMilling: ['ignore'] },
  };
  const currentAvailability = availability[process?.strategy] || availability.rough;
  const isFieldDisabled = (field) => !process || currentAvailability.disabledFields.includes(field);
  const processRadio = (field, value, label, isDisabled = false) => {
    const disabled = !process || isDisabled;
    return `<label class="ui-radio${disabled ? ' is-disabled' : ''}"><input type="radio" name="process-${field}" data-process-field="${field}" value="${value}"${process?.[field] === value ? ' checked' : ''}${disabled ? ' disabled' : ''} /><span class="ui-radio-mark"></span><span class="ui-radio-text">${label}</span></label>`;
  };
  const numberField = (field, label) => `<label class="process-number-field"><span>${label}</span><input type="number" step="0.01" data-process-field="${field}" value="${process ? Number(process[field]).toFixed(2) : ''}"${isFieldDisabled(field) ? ' disabled' : ''} /></label>`;
  const rows = controlState.processes.length
    ? controlState.processes.map((item) => `<button type="button" class="process-row${item.id === controlState.selectedProcessId ? ' is-selected' : ''}" data-process-id="${item.id}" role="option" aria-selected="${item.id === controlState.selectedProcessId}"><span class="process-name">${item.name}</span></button>`).join('')
    : '<p class="empty-processes">등록된 프로세스가 없습니다.</p>';

  return `<div class="tab-content procedure-content process-tab">
    <section class="process-setup-section">
      <h1>프로세서 설정</h1>
      <div class="process-setting-box">
        <div class="process-list" role="listbox" aria-label="프로세스 목록">
          <div class="process-list-head">Name</div>
          ${rows}
        </div>
        <aside class="process-action-panel" aria-label="프로세스 조작">
          ${processActionButton(2, '새로 만들기', 'new')}
          ${processActionButton(3, '삭제', 'delete', !process)}
          ${processActionButton(4, '위', 'up', selectedIndex <= 0)}
          ${processActionButton(5, '아래', 'down', selectedIndex < 0 || selectedIndex === controlState.processes.length - 1)}
          <div class="help-row process-help-row" role="button" tabindex="0" data-process-action="help"><img src="${iconPath(1)}" alt="" /><span>도움말</span></div>
        </aside>
      </div>
    </section>

    <section class="process-name-section">
      <label class="process-name-field"><span>작업명</span><input type="text" data-process-field="name" value="${process ? process.name : ''}" placeholder="${process ? '' : 'Text Input'}"${process ? '' : ' disabled'} /></label>
    </section>

    <section class="process-plan-settings-grid">
      <div class="process-plan-section">
        <h2>경로 계획</h2>
        <div class="process-plan-options ui-radio-group">${strategyOptions.map(([value, label]) => processRadio('strategy', value, label)).join('')}</div>
      </div>
      <div class="process-settings-section">
        <h2>경로 설정</h2>
        <div class="process-number-list">${routeFields.map(([field, label]) => numberField(field, label)).join('')}</div>
        <label class="process-select-field"><span>포켓팅</span>${uiSelect({ id: 'process-pocketing', kind: 'process', field: 'pocketing', value: process?.pocketing, options: [['none', 'none'], ['holes', 'holes'], ['enclosed', 'enclosed']], disabled: isFieldDisabled('pocketing') })}</label>
      </div>
    </section>

    <section class="process-direction-section">
      <h2>경로 방향</h2>
      <div class="process-direction-grid">
        <div class="process-direction-column ui-radio-group">
          <h3>그리드 방향</h3>
          ${processRadio('gridDirection', 'x', 'x', currentAvailability.disabledGrid.includes('x'))}
          ${processRadio('gridDirection', 'y', 'y', currentAvailability.disabledGrid.includes('y'))}
          ${processRadio('gridDirection', 'all', '모두', currentAvailability.disabledGrid.includes('all'))}
        </div>
        <div class="process-direction-column ui-radio-group">
          <h3>밀링 스타일</h3>
          ${processRadio('millingStyle', 'up', '상향절삭', currentAvailability.disabledMilling.includes('up'))}
          ${processRadio('millingStyle', 'down', '하향절삭', currentAvailability.disabledMilling.includes('down'))}
          ${processRadio('millingStyle', 'ignore', '무시', currentAvailability.disabledMilling.includes('ignore'))}
        </div>
      </div>
    </section>
  </div>`;
}
function boundaryActionButton(icon, label, action, disabled = false) {
  const actionNames = { new: 'new-boundary', delete: 'delete-boundary', up: 'move-up', down: 'move-down' };
  return `<button type="button" class="boundary-action" data-boundary-action="${action}" data-action="${actionNames[action] || action}"${disabled ? ' disabled' : ''}><img src="${iconPath(icon)}" alt="" /><span>${label}</span></button>`;
}

function boundaryContent() {
  const boundary = selectedBoundary(controlState);
  const selectedIndex = controlState.boundaries.findIndex((item) => item.id === controlState.selectedBoundaryId);
  const disabled = boundary ? '' : ' disabled';
  const marginOptions = [['relative', '상대 마진'], ['fixed', '고정 마진'], ['custom', '사용자 설정']];
  const currentMarginValues = boundary?.marginValues?.[boundary.marginType];
  const boundaryNotes = {
    relative: '상대 마진은 해당 모델 크기를 기준으로 백분율로 표시됩니다. 양수 값은 모델 주위에 여백을 만듭니다. 음수 값은 모델보다 작은 경계 상자를 만듭니다.',
    fixed: '고정 여백은 mm / 인치 단위로 표시됩니다. 양수 값은 모델 주위에 여백을 만듭니다. 음수 값은 모델보다 작은 경계 상자를 만듭니다.',
    custom: '이 값은 처리 경계 상자의 절대 좌표입니다. 모델 크기의 변경은 경계 상자에 영향을 미치지 않습니다.',
  };
  const axisRows = ['X', 'Y', 'Z'].map((axis) => {
    const lowerField = `${axis.toLowerCase()}Lower`;
    const upperField = `${axis.toLowerCase()}Upper`;
    return `<div class="boundary-axis-row"><strong>${axis}</strong><input type="number" step="0.01" data-boundary-field="${lowerField}" value="${currentMarginValues ? Number(currentMarginValues[lowerField]).toFixed(2) : ''}"${disabled} /><input type="number" step="0.01" data-boundary-field="${upperField}" value="${currentMarginValues ? Number(currentMarginValues[upperField]).toFixed(2) : ''}"${disabled} /><div class="boundary-sign-controls"><button type="button" class="sign-button" data-boundary-sign="positive" data-boundary-axis="${axis}"${disabled}>+</button><button type="button" class="sign-button" data-boundary-sign="zero" data-boundary-axis="${axis}"${disabled}>0</button><button type="button" class="sign-button" data-boundary-sign="negative" data-boundary-axis="${axis}"${disabled}>−</button></div></div>`;
  }).join('');
  const marginRadio = (value, label) => `<label class="ui-radio"><input type="radio" name="boundary-margin-type" data-boundary-field="marginType" value="${value}"${boundary?.marginType === value ? ' checked' : ''} /><span class="ui-radio-mark"></span><span class="ui-radio-text">${label}</span></label>`;
  const rows = controlState.boundaries.length
    ? controlState.boundaries.map((item) => `<button type="button" class="boundary-row${item.id === controlState.selectedBoundaryId ? ' is-selected' : ''}" data-boundary-id="${item.id}" role="option" aria-selected="${item.id === controlState.selectedBoundaryId}"><span class="boundary-name">${item.name}</span></button>`).join('')
    : '<p class="empty-boundaries">등록된 경계가 없습니다.</p>';

  return `<div class="tab-content boundary-content">
    <section class="boundary-setup-section">
      <h1>프로세싱 경계</h1>
      <div class="boundary-setting-box">
        <div class="boundary-list" role="listbox" aria-label="경계 목록">
          <div class="boundary-list-head">Name</div>
          ${rows}
        </div>
        <aside class="boundary-action-panel" aria-label="경계 조작">
          ${boundaryActionButton(2, '새로 만들기', 'new')}
          ${boundaryActionButton(3, '삭제', 'delete', !boundary)}
          ${boundaryActionButton(4, '위', 'up', selectedIndex <= 0)}
          ${boundaryActionButton(5, '아래', 'down', selectedIndex < 0 || selectedIndex === controlState.boundaries.length - 1)}
          <div class="help-row boundary-help-row" role="button" tabindex="0" data-boundary-action="help"><img src="${iconPath(1)}" alt="" /><span>도움말</span></div>
        </aside>
      </div>
    </section>

    <section class="boundary-name-section">
      <label class="boundary-name-field"><span>작업명</span><input type="text" data-boundary-field="name" value="${boundary ? boundary.name : ''}" placeholder="${boundary ? '' : 'Text Input'}"${disabled} /></label>
    </section>

    <section class="boundary-margin-section">
      <h2>여유 설정</h2>
      <div class="boundary-margin-grid">
        <div class="boundary-margin-options ui-radio-group">${marginOptions.map(([value, label]) => marginRadio(value, label)).join('')}</div>
        <div class="boundary-axis-settings">
          <div class="boundary-axis-head"><span></span><span>더 아래</span><span>더 위로</span><span></span></div>
          ${axisRows}
          <p class="boundary-note">${boundaryNotes[boundary?.marginType ?? 'relative']}</p>
        </div>
      </div>
    </section>
  </div>`;
}
function taskActionButton(icon, label, action, disabled = false) {
  const actionNames = { generate: 'generate-toolpath', 'generate-all': 'generate-all-toolpaths', new: 'new-task', delete: 'delete-task', up: 'move-up', down: 'move-down' };
  return `<button type="button" class="task-action" data-task-action="${action}" data-action="${actionNames[action] || action}"${disabled ? ' disabled' : ''}><img src="${iconPath(icon)}" alt="" /><span>${label}</span></button>`;
}

function taskContent() {
  const task = selectedTask(controlState);
  const selectedIndex = controlState.tasks.findIndex((item) => item.id === controlState.selectedTaskId);
  const disabled = task ? '': ' disabled';
  const selectedToolForTask = task ? controlState.tools.find((item) => item.uid === task.toolId) || null : null;
  const selectedProcessForTask = task ? controlState.processes.find((item) => item.uid === task.processId) || null : null;
  const referenceField = (label, field, items, selectedId, getLabel) => `<label class="task-reference-field"><span>${label}</span>${uiSelect({ id: `task-${field}`, kind: 'task', field, value: selectedId, options: [['', '선택 없음'], ...items.map((item) => [item.uid, getLabel(item)])], disabled: !task })}</label>`;
  const rows = controlState.tasks.length
    ? controlState.tasks.map((item) => `<label class="task-row${item.id === controlState.selectedTaskId ? ' is-selected' : ''}" data-task-id="${item.id}" role="option" aria-selected="${item.id === controlState.selectedTaskId}"><input type="checkbox" data-task-enabled="${item.id}"${item.enabled ? ' checked' : ''} aria-label="${item.name} Enabled" /><img class="checkbox-icon" data-task-enabled="${item.id}" src="${checkboxIconPath(item.enabled)}" alt="" /><span class="task-name">${item.name}</span></label>`).join('')
    : '<p class="empty-tasks">등록된 작업이 없습니다.</p>';
  const summaryLine = (text) => `<p class="task-simple-line">${text}</p>`;
  const millingStyleLabels = { up: 'conventional', down: 'climb', ignore: 'ignore' };
  const formatPercent = (value) => `${Number(value)}%`;
  const formatMillimeters = (value) => `${Number(value).toFixed(2)}mm`;
  const toolSummary = selectedToolForTask
    ? (() => {
      const cutterName = { flat: 'CylindricalCutter', toroidal: 'ToroidalCutter', ball: 'SphericalCutter' }[selectedToolForTask.shape] || '선택 없음';
      const dimensions = selectedToolForTask.shape === 'toroidal'
        ? `${Number(selectedToolForTask.diameter).toFixed(4)}mm / ${Number(selectedToolForTask.torusDiameter || 0).toFixed(4)}mm`
        : `${Number(selectedToolForTask.diameter).toFixed(4)}mm`;
      return `${summaryLine(`툴: ${cutterName} (${dimensions})`)}${summaryLine(`주축 속도: ${Number(selectedToolForTask.spindleSpeed)}rpm / 공급량: ${Number(selectedToolForTask.feedRate)}mm/minute`)}`;
    })()
    : summaryLine('툴: 선택 없음');
  const processSummary = (() => {
    if (!selectedProcessForTask) return summaryLine('전략: 선택 없음');
    const process = selectedProcessForTask;
    const millingStyle = millingStyleLabels[process.millingStyle] || 'ignore';
    if (process.uid === 'process-remove-material') return `${summaryLine('전략: PushRemoveStrategy')}${summaryLine(`밀링 스타일: ${millingStyle}`)}${summaryLine(`중복: ${formatPercent(process.overlap)}`)}${summaryLine(`재료 비용: ${formatMillimeters(process.materialAllowance)}`)}${summaryLine(`최대 하강 스텝: ${formatMillimeters(process.maxDepth)}`)}`;
    if (process.uid === 'process-carve-contour') return `${summaryLine('전략: ContourFollowStrategy')}${summaryLine(`밀링 스타일: ${millingStyle}`)}${summaryLine(`최대 하강 스텝: ${formatMillimeters(process.maxDepth)}`)}`;
    if (process.uid === 'process-cleanup') return `${summaryLine('전략: SurfaceStrategy')}${summaryLine(`밀링 스타일: ${millingStyle}`)}${summaryLine(`중복: ${formatPercent(process.overlap)}`)}${summaryLine(`재료 비용: ${formatMillimeters(process.materialAllowance)}`)}`;
    if (process.uid === 'process-gravure') return `${summaryLine('전략: EngraveStrategy')}${summaryLine(`오프셋 조각: ${Number(process.offset).toFixed(3)}`)}${summaryLine(`최대 하강 스텝: ${formatMillimeters(process.maxDepth)}`)}`;
    return summaryLine('전략: 선택 없음');
  })();

  return `<div class="tab-content task-content">
    <section class="task-setup-section">
      <h1>작업 목록</h1>
      <div class="task-setting-box">
        <div class="task-list" role="listbox" aria-label="작업 목록">
          <div class="task-list-head">Enabled | Name</div>
          ${rows}
        </div>
        <aside class="task-action-panel" aria-label="작업 조작">
          ${taskActionButton(6, '툴패스 생성', 'generate', !task)}
          ${taskActionButton(2, '모두 생성', 'generate-all')}
          ${taskActionButton(2, '새로 만들기', 'new')}
          ${taskActionButton(3, '삭제', 'delete', !task)}
          ${taskActionButton(4, '위', 'up', selectedIndex <= 0)}
          ${taskActionButton(5, '아래', 'down', selectedIndex < 0 || selectedIndex === controlState.tasks.length - 1)}
          <div class="help-row task-help-row" role="button" tabindex="0" data-task-action="help"><img src="${iconPath(1)}" alt="" /><span>도움말</span></div>
        </aside>
      </div>
    </section>

    <section class="task-reference-section">
      <label class="task-name-field"><span>작업명</span><input type="text" data-task-field="name" value="${task ? task.name : ''}" placeholder="${task ? '' : 'Text Input'}"${disabled} /></label>
      ${referenceField('공구', 'toolId', controlState.tools, task?.toolId, toolLabel)}
      ${referenceField('절차', 'processId', controlState.processes, task?.processId, (item) => item.name)}
      ${referenceField('경계', 'boundaryId', controlState.boundaries, task?.boundaryId, (item) => item.name)}
    </section>

    <section class="task-summary-section${task ? '' : ' is-disabled'}">
      <h2>요약:</h2>
      <div class="task-simple-summary">${toolSummary}${processSummary}</div>
    </section>
  </div>`;
}
function toolpathActionButton(label, action, icon = null, disabled = false) {
  return `<button type="button" class="toolpath-action" data-toolpath-action="${action}"${disabled ? ' disabled' : ''}>${icon ? `<img src="${iconPath(icon)}" alt="" />` : ''}<span>${label}</span></button>`;
}

function toolpathsContent() {
  const toolpath = selectedToolpath(controlState);
  const selectedIndex = controlState.toolpaths.findIndex((item) => item.id === controlState.selectedToolpathId);
  const rows = controlState.toolpaths.length
    ? controlState.toolpaths.map((item) => `<label class="toolpath-row${item.id === controlState.selectedToolpathId ? ' is-selected' : ''}" data-toolpath-id="${item.id}" role="option" aria-selected="${item.id === controlState.selectedToolpathId}"><input type="checkbox" data-toolpath-visible="${item.id}"${item.visible ? ' checked' : ''} aria-label="${item.toolName} / ${item.processName} 표시" /><img class="checkbox-icon" data-toolpath-visible="${item.id}" src="${checkboxIconPath(item.visible)}" alt="" /><span class="toolpath-operation">${item.toolName} / ${item.processName}</span><span class="toolpath-duration">${item.duration}</span></label>`).join('')
    : '<p class="empty-toolpaths">생성된 툴패스가 없습니다.</p>';

  return `<div class="tab-content toolpath-content">
    <section class="toolpath-setup-section">
      <h1>생성된 툴 패스 목록</h1>
      <div class="toolpath-setting-box">
        <div class="toolpath-list" role="listbox" aria-label="생성된 툴 패스 목록">
          <div class="toolpath-list-head"><span class="toolpath-head-title">Visible | Operation</span><span class="toolpath-head-machine">Machine</span></div>
          ${rows}
        </div>
        <aside class="toolpath-action-panel" aria-label="툴 패스 조작">
          ${toolpathActionButton('모두 내보내기', 'export-all')}
          ${toolpathActionButton('표시 내보내기', 'export-visible', null, !toolpath)}
          ${toolpathActionButton('시뮬레이션', 'simulate', null, !toolpath)}
          ${toolpathActionButton('그리드 복제', 'grid-copy', null, !toolpath)}
          ${toolpathActionButton('절단', 'crop', null, !toolpath)}
          ${toolpathActionButton('삭제', 'delete', 3, !toolpath)}
          ${toolpathActionButton('위', 'up', 4, selectedIndex <= 0)}
          ${toolpathActionButton('아래', 'down', 5, selectedIndex < 0 || selectedIndex === controlState.toolpaths.length - 1)}
        </aside>
      </div>
    </section>
  </div>`;
}
function renderTabs() {
  return getControlTabs(controlState.toolpathTabCreated, controlState.toolpaths.length).map((tab) => `<button type="button" class="control-tab${tab.id === controlState.activeTab ? ' is-active' : ''}" data-tab-id="${tab.id}"${tab.disabled ? ' disabled aria-disabled="true"' : ''}>${tab.label}</button>`).join('');
}

function render() {
  const currentContent = controlState.activeTab === 'tools' ? toolsContent()
    : controlState.activeTab === 'procedure' ? procedureContent()
      : controlState.activeTab === 'boundary' ? boundaryContent()
        : controlState.activeTab === 'job' ? taskContent()
          : controlState.activeTab === 'toolpaths' ? toolpathsContent()
            : modelContent();
  app.innerHTML = `<div class="dual-window-shell">
    <section class="visual-window" aria-label="Visualization window">
      <div class="visual-menu"><img src="./refs/icons/menu.png" alt="KIMM-CAM visual menu" draggable="false" /></div>
      <div class="visual-stage" aria-label="Visualization stage">${visualStageContent()}</div>
    </section>
    <aside class="control-window-pane">
      <section class="control-window cam-control-panel" aria-label="KIMM-CAM control panel">
        <header class="title-bar"><span class="brand-mark">◆</span><strong>KIMM-CAM V22</strong><span class="window-actions" aria-hidden="true"><i>—</i><i>□</i><i>×</i></span></header>
        <nav class="menu-bar" aria-label="Application menu"><button type="button">파일(F)</button><button type="button">편집(E)</button><button type="button">설정(S)</button><button type="button">추가(X)</button><button type="button">화면(W)</button><button type="button">도움말(H)</button></nav>
        <nav class="tab-strip" aria-label="CAM control tabs">${renderTabs()}</nav>
        <div class="control-content">${currentContent}</div>
        <footer class="status-bar">No previous undo state available - request ignored</footer>
      </section>
    </aside>
  </div>`;
}
function updateToolField(field, rawValue) {
  const numericFields = new Set(['diameter', 'torusDiameter', 'feedRate', 'spindleSpeed']);
  const value = numericFields.has(field) ? Number(rawValue) : rawValue;
  if (numericFields.has(field) && !Number.isFinite(value)) return;
  controlState = reduceControlState(controlState, { type: 'tool.update', field, value });
}

function updateTaskField(field, rawValue) {
  const value = field === 'name' ? rawValue : rawValue || null;
  controlState = reduceControlState(controlState, { type: 'task.update', field, value });
}

function syncSelectedTaskRow() {
  const task = selectedTask(controlState);
  const row = task && document.querySelector(`[data-task-id="${task.id}"]`);
  if (row) row.querySelector('.task-name').textContent = task.name;
}
function updateBoundaryField(field, rawValue) {
  const numericFields = new Set(['xLower', 'xUpper', 'yLower', 'yUpper', 'zLower', 'zUpper']);
  const value = numericFields.has(field) ? Number(rawValue) : rawValue;
  if (numericFields.has(field) && !Number.isFinite(value)) return;
  controlState = reduceControlState(controlState, { type: 'boundary.update', field, value });
}

function syncSelectedBoundaryRow() {
  const boundary = selectedBoundary(controlState);
  const row = boundary && document.querySelector(`[data-boundary-id="${boundary.id}"]`);
  if (row) row.querySelector('.boundary-name').textContent = boundary.name;
}
function updateProcessField(field, rawValue) {
  const numericFields = new Set(['overlap', 'materialAllowance', 'maxDepth', 'offset']);
  const value = numericFields.has(field) ? Number(rawValue) : rawValue;
  if (numericFields.has(field) && !Number.isFinite(value)) return;
  controlState = reduceControlState(controlState, { type: 'process.update', field, value });
}

function syncSelectedProcessRow() {
  const process = selectedProcess(controlState);
  const row = process && document.querySelector(`[data-process-id="${process.id}"]`);
  if (row) row.querySelector('.process-name').textContent = process.name;
}

function syncSelectedToolRow() {
  const tool = selectedTool(controlState);
  const row = tool && document.querySelector(`[data-tool-id="${tool.id}"]`);
  if (!row) return;
  row.querySelector('.tool-name').textContent = tool.name;
  row.querySelector('.tool-diameter').textContent = `(d=${formatDiameter(tool.diameter)})`;
}

app.addEventListener('click', (event) => {
  const tabId = event.target.closest('[data-tab-id]')?.dataset.tabId;
  if (tabId && isEnabledTab(tabId, controlState.toolpathTabCreated)) {
    openSelectId = null;
    controlState = reduceControlState(controlState, { type: 'tab.select', tabId });
    render();
    return;
  }

  const selectToggle = event.target.closest('[data-select-toggle]');
  if (selectToggle && !selectToggle.disabled) {
    const selectId = selectToggle.dataset.selectToggle;
    openSelectId = openSelectId === selectId ? null : selectId;
    render();
    return;
  }

  const selectOption = event.target.closest('[data-select-option]');
  if (selectOption) {
    const select = selectOption.closest('.ui-select');
    const { selectKind: kind, selectField: field } = select.dataset;
    const value = selectOption.dataset.selectOption;
    if (kind === 'model') {
      controlState = reduceControlState(controlState, { type: 'model.update', field, value });
    } else if (kind === 'process') {
      updateProcessField(field, value);
    } else if (kind === 'task') {
      updateTaskField(field, value);
    }
    openSelectId = null;
    render();
    return;
  }

  const toolpathVisibleId = Number(event.target.closest('[data-toolpath-visible]')?.dataset.toolpathVisible);
  if (Number.isInteger(toolpathVisibleId)) {
    event.preventDefault();
    controlState = reduceControlState(controlState, { type: 'toolpath.toggleVisible', toolpathId: toolpathVisibleId });
    render();
    return;
  }
  const toolpathId = Number(event.target.closest('[data-toolpath-id]')?.dataset.toolpathId);
  if (Number.isInteger(toolpathId)) {
    controlState = reduceControlState(controlState, { type: 'toolpath.select', toolpathId });
    render();
    return;
  }
  const toolpathAction = event.target.closest('[data-toolpath-action]')?.dataset.toolpathAction;
  if (toolpathAction) {
    const type = { delete: 'toolpath.delete', up: 'toolpath.move', down: 'toolpath.move', 'export-all': 'toolpath.demo', 'export-visible': 'toolpath.demo', simulate: 'toolpath.demo', 'grid-copy': 'toolpath.demo', crop: 'toolpath.demo' }[toolpathAction];
    controlState = reduceControlState(controlState, type === 'toolpath.move' ? { type, direction: toolpathAction === 'up' ? -1 : 1 } : { type });
    render();
    return;
  }
  const taskEnabledId = Number(event.target.closest('[data-task-enabled]')?.dataset.taskEnabled);
  if (Number.isInteger(taskEnabledId)) {
    event.preventDefault();
    controlState = reduceControlState(controlState, { type: 'task.toggleEnabled', taskId: taskEnabledId });
    render();
    return;
  }
  const taskId = Number(event.target.closest('[data-task-id]')?.dataset.taskId);
  if (Number.isInteger(taskId)) {
    controlState = reduceControlState(controlState, { type: 'task.select', taskId });
    render();
    return;
  }
  const taskAction = event.target.closest('[data-task-action]')?.dataset.taskAction;
  if (taskAction) {
    const type = { generate: 'task.generate', 'generate-all': 'task.generateAll', new: 'task.new', delete: 'task.delete', up: 'task.move', down: 'task.move', help: 'help.toggle' }[taskAction];
    controlState = reduceControlState(controlState, type === 'task.move' ? { type, direction: taskAction === 'up' ? -1 : 1 } : { type });
    render();
    return;
  }
  const boundaryId = Number(event.target.closest('[data-boundary-id]')?.dataset.boundaryId);
  if (Number.isInteger(boundaryId)) {
    controlState = reduceControlState(controlState, { type: 'boundary.select', boundaryId });
    render();
    return;
  }
  const boundaryAction = event.target.closest('[data-boundary-action]')?.dataset.boundaryAction;
  if (boundaryAction) {
    const type = { new: 'boundary.new', delete: 'boundary.delete', up: 'boundary.move', down: 'boundary.move', help: 'boundary.help' }[boundaryAction];
    controlState = reduceControlState(controlState, type === 'boundary.move' ? { type, direction: boundaryAction === 'up' ? -1 : 1 } : { type });
    render();
    return;
  }
  const boundarySign = event.target.closest('[data-boundary-sign]')?.dataset.boundarySign;
  if (boundarySign) {
    const axis = event.target.closest('[data-boundary-axis]')?.dataset.boundaryAxis;
    controlState = reduceControlState(controlState, { type: 'boundary.sign', axis, sign: boundarySign });
    render();
    return;
  }  const processId = Number(event.target.closest('[data-process-id]')?.dataset.processId);
  if (Number.isInteger(processId)) {
    controlState = reduceControlState(controlState, { type: 'process.select', processId });
    render();
    return;
  }
  const processAction = event.target.closest('[data-process-action]')?.dataset.processAction;
  if (processAction) {
    const type = { new: 'process.new', delete: 'process.delete', up: 'process.move', down: 'process.move', help: 'process.help' }[processAction];
    controlState = reduceControlState(controlState, type === 'process.move' ? { type, direction: processAction === 'up' ? -1 : 1 } : { type });
    render();
    return;
  }

  const toolId = Number(event.target.closest('[data-tool-id]')?.dataset.toolId);
  if (Number.isInteger(toolId)) {
    controlState = reduceControlState(controlState, { type: 'tool.select', toolId });
    render();
    return;
  }
  const toolAction = event.target.closest('[data-tool-action]')?.dataset.toolAction;
  if (toolAction) {
    const type = { new: 'tool.new', delete: 'tool.delete', up: 'tool.move', down: 'tool.move', help: 'help.toggle' }[toolAction];
    controlState = reduceControlState(controlState, type === 'tool.move' ? { type, direction: toolAction === 'up' ? -1 : 1 } : { type });
    render();
    return;
  }

  const shiftAxis = event.target.closest('[data-model-shift]')?.dataset.modelShift;
  if (shiftAxis) {
    const direction = Number(event.target.closest('[data-shift-direction]').dataset.shiftDirection);
    const field = `position${shiftAxis}`;
    controlState = reduceControlState(controlState, { type: 'model.update', field, value: Number(controlState.modelTab[field]) + direction * 0.01 });
    setStatus(`${shiftAxis} 위치를 조정했습니다.`);
    render();
    return;
  }
  const modelAction = event.target.closest('[data-model-action]')?.dataset.modelAction;
  if (modelAction) {
    const extensionOpen = modelAction === 'toggle-extension' ? !controlState.modelTab.extensionOpen : controlState.modelTab.extensionOpen;
    controlState = reduceControlState(controlState, { type: 'model.update', field: modelAction === 'toggle-extension' ? 'extensionOpen' : 'lastAction', value: modelAction === 'toggle-extension' ? extensionOpen : modelAction });
    setStatus(modelAction === 'toggle-extension' ? '모델 확장 목록을 전환했습니다.' : `${event.target.textContent.trim()}을 선택했습니다.`);
    render();
  }
});

app.addEventListener('input', (event) => {
  const taskField = event.target.dataset.taskField;
  if (taskField) {
    updateTaskField(taskField, event.target.value);
    if (taskField === 'name') syncSelectedTaskRow();
    return;
  }
  const boundaryField = event.target.dataset.boundaryField;
  if (boundaryField) {
    updateBoundaryField(boundaryField, event.target.value);
    if (boundaryField === 'name') syncSelectedBoundaryRow();
    return;
  }  const processField = event.target.dataset.processField;
  if (processField) {
    updateProcessField(processField, event.target.value);
    if (processField === 'name') syncSelectedProcessRow();
    return;
  }

  const toolField = event.target.dataset.toolField;
  if (toolField && event.target.type !== 'radio') {
    updateToolField(toolField, event.target.value);
    syncSelectedToolRow();
    return;
  }
  const modelField = event.target.dataset.modelField;
  if (modelField) {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.type === 'number' ? Number(event.target.value) : event.target.value;
    controlState = reduceControlState(controlState, { type: 'model.update', field: modelField, value });
    setStatus(`${event.target.closest('label')?.textContent.trim() || '모델 설정'}을 변경했습니다.`);
  }
});

app.addEventListener('change', (event) => {
  const toolpathVisibleId = Number(event.target.dataset.toolpathVisible);
  if (Number.isInteger(toolpathVisibleId)) {
    controlState = reduceControlState(controlState, { type: 'toolpath.toggleVisible', toolpathId: toolpathVisibleId });
    render();
    return;
  }
  const taskEnabledId = Number(event.target.dataset.taskEnabled);
  if (Number.isInteger(taskEnabledId)) {
    controlState = reduceControlState(controlState, { type: 'task.toggleEnabled', taskId: taskEnabledId });
    render();
    return;
  }  const taskField = event.target.dataset.taskField;
  if (taskField) {
    updateTaskField(taskField, event.target.value);
    if (taskField === 'name') syncSelectedTaskRow();
    else render();
    return;
  }
  const boundaryField = event.target.dataset.boundaryField;
  if (boundaryField) {
    updateBoundaryField(boundaryField, event.target.value);
    if (event.target.type === 'radio') render();
    return;
  }  const processField = event.target.dataset.processField;
  if (processField) {
    updateProcessField(processField, event.target.value);
    if (event.target.type === 'radio') render();
    return;
  }

  const toolField = event.target.dataset.toolField;
  if (toolField === 'shape') {
    updateToolField(toolField, event.target.value);
    render();
    return;
  }
  const modelField = event.target.dataset.modelField;
  if (modelField) {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.type === 'number' ? Number(event.target.value) : event.target.value;
    controlState = reduceControlState(controlState, { type: 'model.update', field: modelField, value });
    setStatus(`${event.target.closest('label')?.textContent.trim() || '모델 설정'}을 선택했습니다.`);
    if (event.target.type === 'checkbox') render();
  }
});
render();

app.addEventListener('load', (event) => {
  const image = event.target;
  if (image?.dataset?.stageLayer !== 'pending' || image.dataset.stageFile !== requestedStageImage) return;
  displayedStageImage = requestedStageImage;
  render();
}, true);

document.addEventListener('click', (event) => {
  if (!openSelectId || event.target.closest('.ui-select')) return;
  openSelectId = null;
  render();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !openSelectId) return;
  openSelectId = null;
  render();
});