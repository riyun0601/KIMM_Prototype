export const controlTabs = [
  { id: 'model', label: '모델' },
  { id: 'tools', label: '공구' },
  { id: 'procedure', label: '작업 절차' },
  { id: 'boundary', label: '경계' },
  { id: 'job', label: '작업' },
];

export function getControlTabs(hasToolpathTab, toolpathCount) {
  return hasToolpathTab ? [...controlTabs, { id: 'toolpaths', label: `툴 패스 (${toolpathCount})` }] : controlTabs;
}

export function isEnabledTab(tabId, hasToolpathTab = false) {
  return getControlTabs(hasToolpathTab, 0).some((tab) => tab.id === tabId && !tab.disabled);
}