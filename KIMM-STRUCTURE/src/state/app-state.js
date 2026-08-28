const allExpanded = ['geometry-parts', 'fe-model', 'fe-mesh', 'results-mesh', 'results-root'];
export const state = { activeTab: 'geometry', expandedNodes: new Set(allExpanded), openMenu: null, openSubmenu: null, activeTool: null, toolbarOverrides: new Map(), toolbarInteractionsEnabled: false, modelVisibilityByTab: { geometry: true, fe: false, results: false }, symbols: 'None', treeSearch: '', selectedTreeNode: null, selectedEntityId: null, contextMenu: null, meshSetupModal: null, meshSetupSelection: null, surfaceModal: null, maxElementSize: '1000 mm', minElementSize: '0 mm', elementsPerEdge: '2', elementsPerCurvature: '2', secondOrder: 'Yes', surfaceName: 'Surface-1', meshSetupCreated: false, meshCreated: false, surfaceCreated: false, materialCreated: false, sectionCreated: false, libraryMaterials: [], librarySelection: '', libraryScrollTop: 0, feModelScrollTop: 0, sectionModal: null, materialLibraryModal: null, sectionRegionType: 'Selection', staticStepCreated: false, gravityCreated: false, stepModal: null, loadModal: null, gravityRegionType: 'Selection', gravityF3: '0 mm/s²', bcCount: 0, bcModal: null, analysisRunCompleted: false, monitorModal: false, fixedCreated: false, resultsMode: false, transformationModal: null, transformationApplied: false, animationModal: null, animationPlaying: false, animationFrame: 1, animationDirection: -1, animationPhase: 0, modelSelected: false, surfaceSelected: false, logEntries: ['[System] KIMM-Structure UI prototype initialized.', '[Info] No STP or analysis data is loaded.'], result: '', variable: 'Displacements', type: 'Automatic', factor: '10', stepIncrement: '' };
export const tabPresets = { geometry: ['Model Edges'], fe: ['Element Edges'], results: ['Element Edges', 'Undeformed_Wireframe'] };
export const tabSymbols = { geometry: 'None', fe: 'Model', results: 'Results' };
export const updateState = (changes) => Object.assign(state, changes);
export function activateTab(tab) { const solidSelected = state.selectedEntityId === 'solid-part-1'; updateState({ activeTab: tab, activeTool: null, toolbarOverrides: new Map(), symbols: tabSymbols[tab], treeSearch: '', selectedTreeNode: null, selectedEntityId: solidSelected ? 'solid-part-1' : null, contextMenu: null, modelSelected: solidSelected, surfaceSelected: false, resultsMode: tab === 'results' ? state.resultsMode : false }); }
export function clearTutorialSelection() { updateState({ selectedTreeNode: null, selectedEntityId: null, contextMenu: null, modelSelected: false, surfaceSelected: false }); }
export function selectTreeNode(id, selectedModel = false) { const solid = id === 'geometry-solid-part' || id === 'fe-solid-part'; updateState({ selectedTreeNode: id, selectedEntityId: solid ? 'solid-part-1' : null, contextMenu: null, modelSelected: selectedModel, surfaceSelected: false }); }
export function openContextMenu(id, x, y, selectedModel = false, anchor = null) { const solid = id === 'geometry-solid-part' || id === 'fe-solid-part'; updateState({ selectedTreeNode: id, selectedEntityId: solid ? 'solid-part-1' : null, contextMenu: { kind: id, x, y, anchor }, modelSelected: selectedModel, surfaceSelected: false }); }
export function isModelVisible() { return state.modelVisibilityByTab[state.activeTab]; }
export function isToolActive(name) { if (state.toolbarInteractionsEnabled && state.toolbarOverrides.has(name)) return state.toolbarOverrides.get(name); return tabPresets[state.activeTab].includes(name); }
export function toggleTool(name) { if (!state.toolbarInteractionsEnabled) return; const next = new Map(state.toolbarOverrides); next.set(name, !isToolActive(name)); updateState({ toolbarOverrides: next }); }
export function toggleExpanded(id) { state.expandedNodes.has(id) ? state.expandedNodes.delete(id) : state.expandedNodes.add(id); }















