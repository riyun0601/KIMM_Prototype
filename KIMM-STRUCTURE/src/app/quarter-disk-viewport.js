import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function createQuarterDiskViewport() {
  const viewport = document.createElement('section');
  viewport.className = 'viewport';
  viewport.innerHTML = `
    <img class="viewport-background" src="/refs/UI/main.png" alt="">
    <div class="three-canvas" aria-label="Rotatable quarter disk model"></div>
    <img class="results-disp-legend" src="/refs/UI/disp.png" alt="Displacement contour legend">
    <aside class="results-info">
      <div>Name: Analysis-1.frd <span>Date: 08/28/2026</span> <span>Time: 19:36:42</span></div>
      <div>Step: #1 <span>Increment: #1</span> <span>Analysis time: 1 s</span></div>
      <div>Deformation variable: Displacements <span>Deformation scale factor: 30000</span></div>
      <span class="animation-info">Animation scale factor: <span class="animation-factor">0</span></span>
    </aside>
    <div class="axis-indicator"><span class="axis-z">Z</span><span class="axis-x">X</span><span class="axis-y">Y</span></div>`;

  const host = viewport.querySelector('.three-canvas');
  let api = {};
  let handler = () => {};
  requestAnimationFrame(() => { api = mount(host, (hit) => handler(hit)); });

  return {
    element: viewport,
    setModelVisible: (visible) => { host.hidden = !visible; },
    setModelSelected: (selected) => api.selected?.(selected),
    setMeshVisible: (visible) => api.mesh?.(visible),
    setSurfaceSelected: (selected) => api.surface?.(selected),
    setGravityVisible: (visible) => api.gravity?.(visible),
    setGravitySelected: (selected) => api.gravitySelected?.(selected),
    setBcFaces: (count, selected) => api.bcFaces?.(count, selected),
    setFixedFace: (visible, selected) => api.fixedFace?.(visible, selected),
    setResults: (visible, patterned, animating, frame) => {
      viewport.classList.toggle('is-results', visible);
      viewport.classList.toggle('has-animation-info', animating);
      api.results?.(visible, patterned, animating, frame);
    },
    setAnimationFactor: (factor) => {
      const element = viewport.querySelector('.animation-factor');
      if (element) element.textContent = formatFactor(factor);
      api.factor?.(factor);
    },
    onModelClick: (callback) => { handler = callback; },
  };
}

function formatFactor(value) {
  if (value < .000001) return '0';
  if (value > .999999) return '1';
  return Number(value.toFixed(8)).toString();
}

const contourPalette = [
  0x223f9e, // +0
  0x236ec7,
  0x2ea8e6,
  0x22c8c6,
  0x25b65d,
  0x9ed43b,
  0xffdf27,
  0xff8c18,
  0xdd3028, // +9.979E-05
].map((value) => new THREE.Color(value));

function contourBand(value) {
  return Math.max(0, Math.min(8, Math.floor(Math.max(0, Math.min(1, value)) * 9)));
}

function makeColor(value) {
  return contourPalette[contourBand(value)].clone();
}

function resultValue(x, y, radius) {
  return Math.max(0, Math.min(1, 1 - Math.pow(Math.hypot(x, y) / radius, .72)));
}

function createResultSolidGeometry(radius, depth = .24, rings = 18, segments = 32) {
  const positions = []; const colors = []; const indices = [];
  const half = depth / 2;
  const add = (x, y, z, value) => {
    const deformation = .42 * value;
    positions.push(x - radius / 2, y - radius / 2, z - deformation);
    const color = makeColor(value);
    colors.push(color.r, color.g, color.b);
    return positions.length / 3 - 1;
  };

  const front = []; const back = [];
  for (let ring = 0; ring <= rings; ring += 1) {
    front[ring] = []; back[ring] = [];
    const radial = radius * ring / rings;
    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = Math.PI / 2 * segment / segments;
      const x = radial * Math.cos(angle); const y = radial * Math.sin(angle);
      const value = resultValue(x, y, radius);
      front[ring][segment] = add(x, y, half + .006, value);
      back[ring][segment] = add(x, y, -half - .006, value);
    }
  }
  for (let segment = 0; segment < segments; segment += 1) {
    indices.push(front[0][segment], front[1][segment], front[1][segment + 1]);
    indices.push(back[0][segment], back[1][segment + 1], back[1][segment]);
  }
  for (let ring = 1; ring < rings; ring += 1) for (let segment = 0; segment < segments; segment += 1) {
    const a = front[ring][segment]; const b = front[ring + 1][segment];
    const c = front[ring + 1][segment + 1]; const d = front[ring][segment + 1];
    indices.push(a, b, c, a, c, d);
    const aa = back[ring][segment]; const bb = back[ring + 1][segment];
    const cc = back[ring + 1][segment + 1]; const dd = back[ring][segment + 1];
    indices.push(aa, cc, bb, aa, dd, cc);
  }

  const sideGrid = (point, sections) => {
    const depthSteps = 3; const nodes = [];
    for (let i = 0; i <= sections; i += 1) {
      nodes[i] = []; const [x, y] = point(i / sections); const value = resultValue(x, y, radius);
      for (let j = 0; j <= depthSteps; j += 1) nodes[i][j] = add(x, y, -half - .006 + (depth + .012) * j / depthSteps, value);
    }
    for (let i = 0; i < sections; i += 1) for (let j = 0; j < depthSteps; j += 1) {
      const a = nodes[i][j]; const b = nodes[i + 1][j]; const c = nodes[i][j + 1]; const d = nodes[i + 1][j + 1];
      indices.push(a, b, d, a, d, c);
    }
  };
  sideGrid((t) => [radius * t, 0], rings);
  sideGrid((t) => [0, radius * t], rings);
  sideGrid((t) => { const angle = Math.PI / 2 * t; return [radius * Math.cos(angle), radius * Math.sin(angle)]; }, segments);

  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  indexed.setIndex(indices);
  const geometry = indexed.toNonIndexed();
  indexed.dispose();
  const flatColors = new Float32Array(geometry.attributes.position.count * 3);
  const position = geometry.attributes.position;
  for (let index = 0; index < position.count; index += 3) {
    const x = (position.getX(index) + position.getX(index + 1) + position.getX(index + 2)) / 3 + radius / 2;
    const y = (position.getY(index) + position.getY(index + 1) + position.getY(index + 2)) / 3 + radius / 2;
    const color = makeColor(resultValue(x, y, radius));
    for (let vertex = 0; vertex < 3; vertex += 1) flatColors.set([color.r, color.g, color.b], (index + vertex) * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(flatColors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function createCurvedSideGeometry(radius, depth = .24, segments = 48) {
  const positions = []; const indices = []; const half = depth / 2;
  for (let i = 0; i <= segments; i += 1) {
    const angle = i / segments * Math.PI / 2;
    const x = (radius + .006) * Math.cos(angle) - radius / 2;
    const y = (radius + .006) * Math.sin(angle) - radius / 2;
    positions.push(x, y, -half - .003, x, y, half + .003);
  }
  for (let i = 0; i < segments; i += 1) { const a = i * 2; const b = a + 1; const c = a + 2; const d = a + 3; indices.push(a, c, d, a, d, b); }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); return geometry;
}

function createStraightSideGeometry(radius, depth = .24, side = 'x') {
  const half = depth / 2; const fixed = -radius / 2 - .006;
  const positions = side === 'x'
    ? [fixed, -radius / 2, -half, fixed, radius / 2, -half, fixed, radius / 2, half, fixed, -radius / 2, half]
    : [-radius / 2, fixed, -half, radius / 2, fixed, -half, radius / 2, fixed, half, -radius / 2, fixed, half];
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex([0, 1, 2, 0, 2, 3]); return geometry;
}

function createUniformQuarterSolidMesh(radius, divisions = 20, depth = .24) {
  const positions = []; const indices = []; const front = new Map(); const back = new Map(); const half = depth / 2; const key = (i, j) => `${i}:${j}`;
  const add = (x, y, z) => { positions.push(x - radius / 2, y - radius / 2, z); return positions.length / 3 - 1; };
  const inside = (x, y) => x * x + y * y <= radius * radius + .0001;
  for (let i = 0; i <= divisions; i += 1) for (let j = 0; j <= divisions; j += 1) { const x = radius * i / divisions; const y = radius * j / divisions; if (inside(x, y)) { front.set(key(i, j), add(x, y, half + .004)); back.set(key(i, j), add(x, y, -half - .004)); } }
  for (let i = 0; i < divisions; i += 1) for (let j = 0; j < divisions; j += 1) { const a = front.get(key(i, j)); const b = front.get(key(i + 1, j)); const c = front.get(key(i, j + 1)); const d = front.get(key(i + 1, j + 1)); const aa = back.get(key(i, j)); const bb = back.get(key(i + 1, j)); const cc = back.get(key(i, j + 1)); const dd = back.get(key(i + 1, j + 1)); if ([a, b, c, d, aa, bb, cc, dd].every((v) => v !== undefined)) indices.push(a, b, d, a, d, c, aa, dd, bb, aa, cc, dd); }
  const sideGrid = (point, segments) => { const rows = 3; const nodes = []; for (let i = 0; i <= segments; i += 1) { nodes[i] = []; const [x, y] = point(i / segments); for (let j = 0; j <= rows; j += 1) nodes[i][j] = add(x, y, -half + depth * j / rows); } for (let i = 0; i < segments; i += 1) for (let j = 0; j < rows; j += 1) { const a = nodes[i][j]; const b = nodes[i + 1][j]; const c = nodes[i][j + 1]; const d = nodes[i + 1][j + 1]; indices.push(a, b, d, a, d, c); } };
  sideGrid((t) => [radius * t, -.004], divisions); sideGrid((t) => [-.004, radius * t], divisions); sideGrid((t) => { const angle = t * Math.PI / 2; return [(radius + .004) * Math.cos(angle), (radius + .004) * Math.sin(angle)]; }, divisions * 2);
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); return geometry;
}

function mount(host, onClick) {
  if (!host.isConnected) return {};
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 100); camera.position.set(0, -1.15, 9);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setClearColor(0, 0); host.append(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7d8589, 2.4)); const light = new THREE.DirectionalLight(0xffffff, 2.1); light.position.set(4, -4, 8); scene.add(light);

  const r = 3.15; const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(r, 0); shape.absarc(0, 0, r, 0, Math.PI / 2, false); shape.lineTo(0, 0);
  const solidGeometry = new THREE.ExtrudeGeometry(shape, { depth: .24, bevelEnabled: false, curveSegments: 64 }); solidGeometry.center();
  const disk = new THREE.Mesh(solidGeometry, new THREE.MeshStandardMaterial({ color: 0xd5d0bf, roughness: .67 })); disk.rotation.set(-.02, .02, 0); scene.add(disk);
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x465158 }); const edge = new THREE.LineSegments(new THREE.EdgesGeometry(solidGeometry, 18), edgeMaterial); edge.rotation.copy(disk.rotation); scene.add(edge);
  const selectionOutline = new THREE.LineSegments(new THREE.EdgesGeometry(solidGeometry, 18), new THREE.LineBasicMaterial({ color: 0xff0000, depthTest: false, depthWrite: false })); selectionOutline.rotation.copy(disk.rotation); selectionOutline.renderOrder = 999; selectionOutline.visible = false; scene.add(selectionOutline);
  const meshLines = new THREE.LineSegments(new THREE.WireframeGeometry(createUniformQuarterSolidMesh(r)), new THREE.LineBasicMaterial({ color: 0x3d4b52, transparent: true, opacity: .78 })); meshLines.rotation.copy(disk.rotation); meshLines.visible = false; meshLines.renderOrder = 5; scene.add(meshLines);

  const arcPoints = []; for (let i = 0; i <= 64; i += 1) { const a = i / 64 * Math.PI / 2; arcPoints.push(new THREE.Vector3(r * Math.cos(a) - r / 2, r * Math.sin(a) - r / 2, .13)); }
  const curve = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPoints), new THREE.LineBasicMaterial({ color: 0xff0000 })); curve.rotation.copy(disk.rotation); curve.visible = false; scene.add(curve);
  const fixedCurve = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPoints), new THREE.LineBasicMaterial({ color: 0x00ff00 })); fixedCurve.rotation.copy(disk.rotation); fixedCurve.visible = false; scene.add(fixedCurve);

  const annotations = new THREE.Group(); annotations.renderOrder = 1200; scene.add(annotations);
  const gravity = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(), 1.45, 0x4169e1, .34, .18); gravity.visible = false; gravity.renderOrder = 1200;
  const updateGravityTransform = () => { disk.updateWorldMatrix(true, false); gravity.position.copy(new THREE.Vector3(0, 0, -.15).applyMatrix4(disk.matrixWorld)); gravity.setDirection(new THREE.Vector3(0, 0, -1).transformDirection(disk.matrixWorld).normalize()); };
  [gravity.line, gravity.cone].forEach((part) => { part.renderOrder = 1200; const materials = Array.isArray(part.material) ? part.material : [part.material]; materials.forEach((material) => { material.depthTest = false; material.depthWrite = false; material.transparent = true; material.needsUpdate = true; }); }); updateGravityTransform(); annotations.add(gravity);

  const curvedSideGeometry = createCurvedSideGeometry(r); const surfaceSideOverlay = new THREE.Mesh(curvedSideGeometry, new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: .9, side: THREE.DoubleSide, depthTest: true, depthWrite: false })); surfaceSideOverlay.visible = false; surfaceSideOverlay.renderOrder = 8; const curvedSideOverlay = new THREE.Mesh(curvedSideGeometry, new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: .86, side: THREE.DoubleSide, depthTest: true, depthWrite: false })); curvedSideOverlay.visible = false; curvedSideOverlay.renderOrder = 8; disk.add(surfaceSideOverlay, curvedSideOverlay);
  const curvedSidePicker = new THREE.Mesh(curvedSideGeometry, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, depthTest: false, side: THREE.DoubleSide })); curvedSidePicker.userData.selectableBoundaryFace = 'curved-side'; disk.add(curvedSidePicker);
  const xSideGeometry = createStraightSideGeometry(r, .24, 'x'); const ySideGeometry = createStraightSideGeometry(r, .24, 'y');
  const sideOverlay = (geometry) => new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false })); const xFace = sideOverlay(xSideGeometry); const yFace = sideOverlay(ySideGeometry); xFace.visible = false; yFace.visible = false; xFace.renderOrder = 2; yFace.renderOrder = 2;
  const xSidePicker = new THREE.Mesh(xSideGeometry, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, depthTest: false })); const ySidePicker = new THREE.Mesh(ySideGeometry, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, depthTest: false })); xSidePicker.userData.selectableBoundaryFace = 'x-normal-side'; ySidePicker.userData.selectableBoundaryFace = 'y-normal-side'; disk.add(xFace, yFace, xSidePicker, ySidePicker);

  const resultGeometry = createResultSolidGeometry(r); const resultMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: false, opacity: 1, depthWrite: true, depthTest: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const resultModelGroup = new THREE.Group(); resultModelGroup.visible = false; scene.add(resultModelGroup); const resultSector = new THREE.Group(); const resultSolid = new THREE.Mesh(resultGeometry, resultMaterial); resultSolid.renderOrder = 10; const resultWire = new THREE.LineSegments(new THREE.WireframeGeometry(resultGeometry), new THREE.LineBasicMaterial({ color: 0x253746, transparent: true, opacity: .42, depthTest: true, depthWrite: false })); resultWire.renderOrder = 100; resultWire.userData.resultWire = true; resultSector.add(resultSolid, resultWire); resultSector.visible = false; resultModelGroup.add(resultSector);
  const pattern = new THREE.Group(); pattern.visible = false; resultModelGroup.add(pattern); const sectorOrigin = new THREE.Vector3(-r / 2, -r / 2, 0);
  for (let i = 0; i < 4; i += 1) { const rotationGroup = new THREE.Group(); rotationGroup.rotation.z = i * Math.PI / 2; const copy = resultSector.clone(true); copy.visible = true; copy.position.set(-sectorOrigin.x, -sectorOrigin.y, 0); rotationGroup.add(copy); pattern.add(rotationGroup); }
  pattern.position.copy(sectorOrigin);

  const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, 0, 0); controls.enableDamping = true; controls.enableRotate = true; controls.enableZoom = true; controls.enablePan = false; controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.ROTATE, RIGHT: null }; controls.minDistance = 4; controls.maxDistance = 16; controls.update();
  const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2(); let pointerStart = null; let capturedPointerId = null; let dragged = false;
  const resetPointer = () => { if (capturedPointerId !== null && renderer.domElement.hasPointerCapture?.(capturedPointerId)) { try { renderer.domElement.releasePointerCapture(capturedPointerId); } catch {} } pointerStart = null; capturedPointerId = null; dragged = false; };
  const hitModel = (event) => { const rect = renderer.domElement.getBoundingClientRect(); pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1; pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1; raycaster.setFromCamera(pointer, camera); return { model: raycaster.intersectObject(disk, true).length > 0, curvedSide: raycaster.intersectObject(curvedSidePicker, false).length > 0, xSide: raycaster.intersectObject(xSidePicker, false).length > 0, ySide: raycaster.intersectObject(ySidePicker, false).length > 0 }; };
  renderer.domElement.addEventListener('pointerdown', (event) => { if (event.button !== 0) return; pointerStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId }; dragged = false; renderer.domElement.setPointerCapture?.(event.pointerId); capturedPointerId = event.pointerId; });
  renderer.domElement.addEventListener('pointermove', (event) => { if (pointerStart && event.pointerId === pointerStart.pointerId && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) dragged = true; });
  renderer.domElement.addEventListener('pointerup', (event) => { if (event.button === 0 && pointerStart?.pointerId === event.pointerId && !dragged) { event.stopPropagation(); onClick(hitModel(event)); } resetPointer(); });
  renderer.domElement.addEventListener('pointercancel', resetPointer); renderer.domElement.addEventListener('lostpointercapture', resetPointer); renderer.domElement.addEventListener('dblclick', (event) => { event.preventDefault(); resetPointer(); }); renderer.domElement.addEventListener('contextmenu', (event) => { event.preventDefault(); resetPointer(); }); window.addEventListener('blur', resetPointer);
  const resize = () => { const rect = host.getBoundingClientRect(); if (!rect.width || !rect.height) return; camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix(); renderer.setSize(rect.width, rect.height, false); }; new ResizeObserver(resize).observe(host); resize();

  let resultsWereVisible = false;
  let animationColorMode = false;
  const applyResultDeformation = (animationFactor = 0, updateColors = animationColorMode) => {
    const base = resultGeometry.userData.base ?? (resultGeometry.userData.base = resultGeometry.attributes.position.array.slice());
    const position = resultGeometry.attributes.position; const colors = resultGeometry.attributes.color;
    const colorScale = updateColors ? .58 + .42 * animationFactor : 1;
    for (let i = 0; i < position.count; i += 1) {
      const x = base[i * 3] + r / 2; const y = base[i * 3 + 1] + r / 2; const value = resultValue(x, y, r);
      position.setZ(i, base[i * 3 + 2] - animationFactor * .30 * value);
    }
    for (let triangle = 0; triangle < position.count; triangle += 3) {
      const x = (base[triangle * 3] + base[(triangle + 1) * 3] + base[(triangle + 2) * 3]) / 3 + r / 2;
      const y = (base[triangle * 3 + 1] + base[(triangle + 1) * 3 + 1] + base[(triangle + 2) * 3 + 1]) / 3 + r / 2;
      const color = makeColor(Math.min(1, resultValue(x, y, r) * colorScale));
      for (let vertex = 0; vertex < 3; vertex += 1) colors.setXYZ(triangle + vertex, color.r, color.g, color.b);
    }
    position.needsUpdate = true; colors.needsUpdate = true;
    [resultSector, pattern].forEach((root) => root.traverse((object) => { if (object.userData.resultWire) { object.geometry.dispose(); object.geometry = new THREE.WireframeGeometry(resultGeometry); } }));
  };
  const render = () => { controls.update(); updateGravityTransform(); edge.rotation.copy(disk.rotation); selectionOutline.rotation.copy(disk.rotation); meshLines.rotation.copy(disk.rotation); curve.rotation.copy(disk.rotation); fixedCurve.rotation.copy(disk.rotation); resultModelGroup.rotation.copy(disk.rotation); renderer.render(scene, camera); requestAnimationFrame(render); }; render();

  return {
    selected: (value) => { selectionOutline.visible = value; edgeMaterial.color.set(0x465158); },
    mesh: (value) => { meshLines.visible = value; },
    surface: (value) => { curve.visible = value; surfaceSideOverlay.visible = value; },
    gravity: (value) => { gravity.visible = value; },
    gravitySelected: (value) => gravity.setColor(new THREE.Color(value ? 0xff1717 : 0x4169e1)),
    bcFaces: (count, selected) => { xFace.visible = count >= 1; yFace.visible = count >= 2; xFace.material.color.set(selected === 1 ? 0xff1717 : 0x00ff00); yFace.material.color.set(selected === 2 ? 0xff1717 : 0x00ff00); },
    fixedFace: (created, selected) => { const active = Boolean(created || selected); fixedCurve.visible = active; fixedCurve.material.color.set(selected ? 0xff1717 : 0x00ff00); curve.visible = active; curve.material.color.set(selected ? 0xff1717 : 0x00ff00); curvedSideOverlay.visible = active; curvedSideOverlay.material.color.set(selected ? 0xff1717 : 0x00ff00); },
    results: (visible, patterned, _animating, frame) => { animationColorMode = Boolean(_animating); if (visible && !resultsWereVisible) { camera.position.set(4.6, -5.1, 7.3); controls.target.set(0, 0, -.18); controls.update(); } resultsWereVisible = visible; resultModelGroup.visible = visible; resultSector.visible = visible && !patterned; pattern.visible = visible && patterned; disk.visible = !visible; edge.visible = !visible; if (visible) { selectionOutline.visible = false; meshLines.visible = false; curve.visible = false; fixedCurve.visible = false; surfaceSideOverlay.visible = false; curvedSideOverlay.visible = false; xFace.visible = false; yFace.visible = false; gravity.visible = false; } disk.material.color.set(0xd5d0bf); applyResultDeformation(frame || 0); },
    factor: applyResultDeformation,
  };
}






