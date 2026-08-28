import { access, readdir, readFile } from 'node:fs/promises';
const required = ['index.html', 'src/main.js', 'src/app/structure-shell.js', 'src/app/quarter-disk-viewport.js', 'src/app/styles.css', 'src/common/icon-assets.js', 'src/common/menus.js', 'src/common/tree-view.js', 'src/state/app-state.js', 'refs/UI/main.png'];
for (const file of required) await access(file);
const [shell, viewport, state, trees, menus, assets, css, iconFiles] = await Promise.all([readFile('src/app/structure-shell.js', 'utf8'), readFile('src/app/quarter-disk-viewport.js', 'utf8'), readFile('src/state/app-state.js', 'utf8'), readFile('src/common/tree-view.js', 'utf8'), readFile('src/common/menus.js', 'utf8'), readFile('src/common/icon-assets.js', 'utf8'), readFile('src/app/styles.css', 'utf8'), readdir('refs/icons')]);
if (shell.includes('Visualization area')) throw new Error('Removed viewport guidance text is still present.');
if (viewport.includes('main_ref.png')) throw new Error('Reference image must not be rendered in the viewport.');
if (!viewport.includes('OrbitControls') || !viewport.includes('setModelSelected')) throw new Error('3D viewport selection controls are missing.');
if (!state.includes('toolbarInteractionsEnabled: false') || !state.includes('contextMenu') || !state.includes('meshSetupModal')) throw new Error('Tutorial interaction state is missing.');
if (!shell.includes('app-context-menu') || !shell.includes('Create Mesh Setup Item') || !shell.includes('Set Selection') || !shell.includes('Material Library Editor') || !shell.includes('Create Section') || !shell.includes('Create Step') || !shell.includes('Create Load') || !shell.includes('Create Boundary Condition') || !shell.includes('Monitor') || !shell.includes('Create Transformation') || !shell.includes('Animation')) throw new Error('Required tutorial context menu or modal is missing.');
if (!trees.includes('Parts (1)') || !trees.includes('Surface Interactions') || !trees.includes("'results-root'") || !trees.includes('6061_Alloy') || !trees.includes('Solid_Section-1') || !trees.includes('Gravity-1') || !trees.includes('Step-1') || !trees.includes('Displacement_Rotation-') || !trees.includes('Analysis-1') || !trees.includes('Fixed-1') || !trees.includes('results-disp-all')) throw new Error('Required tree hierarchy is missing.');
if (!menus.includes('hoverDelay: true') || !menus.includes("item('Settings')")) throw new Error('Required menu behavior is missing.');
if (!css.includes('.tree-row.is-selected') || !css.includes('.mesh-dialog')) throw new Error('Tutorial selection or modal styling is missing.');
for (const match of assets.matchAll(/'([^']+\.png)'/g)) if (!iconFiles.includes(match[1])) throw new Error(`Missing icon asset: ${match[1]}`);
console.log(`Check passed: ${required.length} required files, tutorial controls, and PNG icon references are valid.`);





