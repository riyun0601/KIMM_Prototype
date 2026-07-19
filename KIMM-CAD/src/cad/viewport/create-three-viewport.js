import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const VIEW_POSITIONS = {
  isometric: { position: [135, 120, 165], up: [0, 0, 1] },
  front: { position: [0, -210, 0], up: [0, 0, 1] },
  back: { position: [0, 210, 0], up: [0, 0, 1] },
  right: { position: [210, 0, 0], up: [0, 0, 1] },
  left: { position: [-210, 0, 0], up: [0, 0, 1] },
  top: { position: [0, 0, 210], up: [0, 1, 0] },
  bottom: { position: [0, 0, -210], up: [0, -1, 0] },
};

const SKETCH_SNAP = 5;
// Closing requires a deliberate click on the first point, not merely the same grid cell.
const SKETCH_CLOSE_DISTANCE = SKETCH_SNAP * 0.7;
const CIRCLE_CURSOR = 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2718%27 height=%2718%27%3E%3Ccircle cx=%279%27 cy=%279%27 r=%275.5%27 fill=%27none%27 stroke=%27%2338424d%27 stroke-width=%271.5%27/%3E%3Cpath d=%27M9 0v3M9 15v3M0 9h3M15 9h3%27 stroke=%27%2338424d%27/%3E%3C/svg%3E") 9 9, crosshair';

function makeMaterial(color = 0xc8cdd3) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.05, roughness: 0.62 });
}

function discAt(position, radius, color = 0x252a31) {
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), new THREE.MeshBasicMaterial({ color }));
  disc.position.copy(position);
  disc.rotation.y = Math.PI / 2;
  return disc;
}

function makeSketchCircleLine(center, radius, color = 0x717a84) {
  const points = Array.from({ length: 64 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 64;
    return new THREE.Vector3(center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius, 0.6);
  });
  return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color }));
}

function makeFaceCirclePath(circle, planeX) {
  const points = Array.from({ length: 64 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 64;
    return new THREE.Vector3(planeX, circle.center.x + Math.cos(angle) * circle.radius, circle.center.y + Math.sin(angle) * circle.radius);
  });
  const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x4c82ed, depthTest: false, depthWrite: false }));
  line.userData = { featureId: 'Sketch.Circle', featureLabel: 'Sketch circle path' };
  line.renderOrder = 4;
  return line;
}

/**
 * The flange is built along world X. A face sketch lives in that face's Y/Z
 * plane, so it must remember whether the front or rear annular face started it.
 */
function flangeFacePlaneX({ flangeStart, flangeDepth }, faceFeatureId) {
  return faceFeatureId === 'Revolution.Flange.FrontFace'
    ? flangeStart + flangeDepth + 0.22
    : flangeStart - 0.22;
}

/**
 * Reads the stepped path as a flange thickness, hub length, and radii while
 * retaining its placement relative to the sketch's red X axis.
 */
function profileDimensions(profile) {
  const fallback = [
    { x: -60, y: 40 }, { x: -35, y: 40 }, { x: -35, y: 15 },
    { x: -18, y: 15 }, { x: -18, y: -35 }, { x: -60, y: -35 },
  ];
  const points = profile.length > 2 ? profile : fallback;
  const xs = [...new Set(points.map((point) => Math.round(point.x * 100) / 100))].sort((a, b) => a - b);
  const radii = [...new Set(points.map((point) => Math.round(Math.abs(point.y) * 100) / 100))].sort((a, b) => b - a);
  const flangeStart = xs[0];
  const hubStart = xs[1] ?? flangeStart + Math.max((xs.at(-1) - flangeStart) * 0.28, SKETCH_SNAP * 2);
  const hubEnd = xs.at(-1);
  const outerRadius = Math.max(radii[0] ?? 40, SKETCH_SNAP * 5);
  const hubRadius = Math.max(radii[1] ?? outerRadius * 0.52, SKETCH_SNAP * 3);
  // Keep the bore small and consistent rather than deriving it from an arbitrary snapped path point.
  const boreRadius = THREE.MathUtils.clamp(hubRadius * 0.22, SKETCH_SNAP, hubRadius * 0.32);
  return {
    flangeStart,
    hubStart,
    hubEnd,
    flangeDepth: Math.max(hubStart - flangeStart, SKETCH_SNAP * 2),
    hubLength: Math.max(hubEnd - hubStart, SKETCH_SNAP * 3),
    outerRadius,
    hubRadius: Math.min(hubRadius, outerRadius - SKETCH_SNAP),
    boreRadius,
  };
}

/** Builds an annular end face with real circular voids, rather than overlays. */
function perforatedAnnularFaceGeometry(outerRadius, boreRadius, holes = []) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  const addVoid = (x, y, radius) => {
    const voidPath = new THREE.Path();
    voidPath.absarc(x, y, radius, 0, Math.PI * 2, true);
    shape.holes.push(voidPath);
  };
  addVoid(0, 0, boreRadius);
  holes.forEach(({ x, y, radius }) => addVoid(x, y, radius));
  return new THREE.ShapeGeometry(shape, 96);
}

/** Creates four independently pickable surfaces for a true annular revolution. */
function makeHollowRevolutionPart({ outerRadius, boreRadius, length, centerX, featureId, featureLabel, faceHoles = [] }) {
  const halfLength = length / 2;
  const group = new THREE.Group();
  const surfaces = [];
  const addSurface = (mesh, suffix, label) => {
    mesh.userData = { featureId: `${featureId}.${suffix}`, featureLabel: `${featureLabel} — ${label}` };
    group.add(mesh);
    surfaces.push(mesh);
  };

  const outerWall = new THREE.Mesh(new THREE.CylinderGeometry(outerRadius, outerRadius, length, 72, 1, true), makeMaterial());
  outerWall.rotation.z = -Math.PI / 2;
  outerWall.position.x = centerX;
  addSurface(outerWall, 'OuterWall', 'outer wall');

  const innerWall = new THREE.Mesh(
    new THREE.CylinderGeometry(boreRadius, boreRadius, length, 72, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xc8cdd3, metalness: 0.05, roughness: 0.62, side: THREE.BackSide }),
  );
  innerWall.rotation.z = -Math.PI / 2;
  innerWall.position.x = centerX;
  addSurface(innerWall, 'BoreWall', 'inner bore wall');

  // RingGeometry cannot represent additional voids; ShapeGeometry removes the
  // pocket loops from the actual end-face triangles.
  const frontFace = new THREE.Mesh(
    perforatedAnnularFaceGeometry(outerRadius, boreRadius, faceHoles.map((hole) => ({ x: -hole.z, y: hole.y, radius: hole.radius }))),
    makeMaterial(),
  );
  frontFace.rotation.y = Math.PI / 2;
  frontFace.position.x = centerX + halfLength;
  addSurface(frontFace, 'FrontFace', 'front annular face');

  const rearFace = new THREE.Mesh(
    perforatedAnnularFaceGeometry(outerRadius, boreRadius, faceHoles.map((hole) => ({ x: hole.z, y: hole.y, radius: hole.radius }))),
    makeMaterial(),
  );
  rearFace.rotation.y = -Math.PI / 2;
  rearFace.position.x = centerX - halfLength;
  addSurface(rearFace, 'RearFace', 'rear annular face');

  faceHoles.forEach((hole) => {
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(hole.radius, hole.radius, length, 48, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x6f7780, metalness: 0.05, roughness: 0.62, side: THREE.BackSide }),
    );
    wall.rotation.z = -Math.PI / 2;
    wall.position.set(centerX, hole.y, hole.z);
    group.add(wall);
  });

  return { group, surfaces };
}

function cameraDistanceFor(profile) {
  const extent = profile.length > 2
    ? Math.max(...profile.map((point) => Math.hypot(point.x, point.y)))
    : 75;
  return Math.max(245, extent * 3.8);
}

function makeBracket(stage, profile, faceCircle = null, patternCount = 1) {
  const group = new THREE.Group();
  const selectable = [];
  const { flangeStart, hubStart, flangeDepth, hubLength, outerRadius, hubRadius, boreRadius } = profileDimensions(profile);
  const pocketHoles = [];
  if (stage === 'pocket' || stage === 'pattern') {
    const count = stage === 'pattern' ? patternCount : 1;
    const center = faceCircle?.center || { x: outerRadius * 0.62, y: 0 };
    const radius = THREE.MathUtils.clamp(faceCircle?.radius || outerRadius * 0.13, 3, outerRadius * 0.18);
    const requestedOrbit = Math.hypot(center.x, center.y);
    const orbit = THREE.MathUtils.clamp(requestedOrbit, hubRadius + radius * 1.15, outerRadius - radius * 1.15);
    const startAngle = Math.atan2(center.y, center.x);
    for (let index = 0; index < count; index += 1) {
      const angle = startAngle + (Math.PI * 2 * index) / count;
      pocketHoles.push({ y: Math.cos(angle) * orbit, z: Math.sin(angle) * orbit, radius });
    }
  }
  const flange = makeHollowRevolutionPart({
    outerRadius,
    boreRadius,
    length: flangeDepth,
    centerX: flangeStart + flangeDepth / 2,
    featureId: 'Revolution.Flange',
    featureLabel: 'Revolution flange face',
    faceHoles: pocketHoles,
  });
  group.add(flange.group);
  selectable.push(...flange.surfaces);

  const hub = makeHollowRevolutionPart({
    outerRadius: hubRadius,
    boreRadius,
    length: hubLength,
    centerX: hubStart + hubLength / 2,
    featureId: 'Revolution.Hub',
    featureLabel: 'Revolution hub face',
  });
  group.add(hub.group);
  selectable.push(...hub.surfaces);

  const flangeFaceX = flangeFacePlaneX({ flangeStart, flangeDepth }, faceCircle?.faceFeatureId);
  if (stage === 'revolved' && faceCircle) {
    const circlePath = makeFaceCirclePath(faceCircle, flangeFaceX);
    group.add(circlePath);
    selectable.push(circlePath);
  }

  return { group, selectable };

  /* Legacy fixed bracket geometry retained only as merge context.
  flange.userData = { featureId: 'Revolution', featureLabel: 'Revolution (360°)' };
  group.add(flange);
  selectable.push(flange);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(25, 25, 77, 64), bodyMaterial.clone());
  barrel.rotation.z = Math.PI / 2;
  barrel.position.x = 5;
  barrel.userData = { featureId: 'Revolution', featureLabel: 'Revolution (360°)' };
  group.add(barrel);
  selectable.push(barrel);

  const bore = discAt(new THREE.Vector3(44, 0, 0), 8);
  group.add(bore);
  const boreRim = new THREE.Mesh(new THREE.TorusGeometry(8, 1.3, 12, 48), makeMaterial(0x878e96));
  boreRim.rotation.y = Math.PI / 2;
  boreRim.position.copy(bore.position).x += 0.1;
  group.add(boreRim);

  if (stage === 'pocket' || stage === 'pattern') {
    const count = stage === 'pattern' ? 4 : 1;
    for (let index = 0; index < count; index += 1) {
      const angle = Math.PI / 2 + (Math.PI * 2 * index) / count;
      const hole = discAt(new THREE.Vector3(-45, Math.cos(angle) * 28, Math.sin(angle) * 28), 6.2);
      group.add(hole);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.8, 10, 32), makeMaterial(0x9098a1));
      rim.rotation.y = Math.PI / 2;
      rim.position.copy(hole.position).x += 0.15;
      group.add(rim);
    }
  }
  return { group, selectable }; */
}

function asVector3(point) { return new THREE.Vector3(point.x, point.y, 0.35); }

function makeProfile(points, color = 0x737b84, closed = true) {
  if (points.length < 2) return new THREE.Group();
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(asVector3));
  const line = closed ? new THREE.LineLoop(geometry, new THREE.LineBasicMaterial({ color })) : new THREE.Line(geometry, new THREE.LineBasicMaterial({ color }));
  const vertices = new THREE.Points(
    new THREE.BufferGeometry().setFromPoints(points.map(asVector3)),
    new THREE.PointsMaterial({ color: 0xf25757, size: 9, sizeAttenuation: false, depthTest: false }),
  );
  const group = new THREE.Group();
  group.add(line, vertices);
  return group;
}

function textureForLabel(label) {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 160;
  const context = canvas.getContext('2d');
  context.fillStyle = '#eef4f8';
  context.fillRect(0, 0, 160, 160);
  context.strokeStyle = '#7f93a4';
  context.lineWidth = 7;
  context.strokeRect(4, 4, 152, 152);
  context.fillStyle = '#405668';
  context.font = 'bold 25px Segoe UI, Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, 80, 82);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createNavigationCube(host, mainCamera, target, onViewChange) {
  const widget = document.createElement('div');
  widget.className = 'navigation-widget';
  const arrows = [
    ['nav-up', '▲', 'Top view', 'top'], ['nav-down', '▼', 'Bottom view', 'bottom'],
    ['nav-left', '◀', 'Left view', 'left'], ['nav-right', '▶', 'Right view', 'right'],
  ];
  arrows.forEach(([className, glyph, label, view]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = glyph;
    button.setAttribute('aria-label', label);
    button.addEventListener('click', () => onViewChange(view));
    widget.append(button);
  });
  host.append(widget);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.className = 'view-cube-canvas';
  renderer.domElement.setAttribute('aria-label', '3D view cube');
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  const cube = new THREE.Group();
  const faces = [];
  const definitions = [
    ['FRONT', 'front', [0, -0.72, 0], [Math.PI / 2, 0, 0]], ['BACK', 'back', [0, 0.72, 0], [-Math.PI / 2, 0, 0]],
    ['RIGHT', 'right', [0.72, 0, 0], [0, Math.PI / 2, 0]], ['LEFT', 'left', [-0.72, 0, 0], [0, -Math.PI / 2, 0]],
    ['TOP', 'top', [0, 0, 0.72], [0, 0, 0]], ['BOTTOM', 'bottom', [0, 0, -0.72], [0, Math.PI, 0]],
  ];
  definitions.forEach(([label, view, position, rotation]) => {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: textureForLabel(label), side: THREE.DoubleSide }));
    face.position.fromArray(position);
    face.rotation.fromArray(rotation);
    face.userData.view = view;
    cube.add(face);
    faces.push(face);
  });
  cube.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.42, 1.42, 1.42)), new THREE.LineBasicMaterial({ color: 0x596d7c })));
  scene.add(cube);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function resize() { renderer.setSize(112, 112, false); }
  function render() {
    const direction = mainCamera.position.clone().sub(target).normalize();
    camera.position.copy(direction.multiplyScalar(4));
    // Keep the world Z direction upright even while the main camera orbits.
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }
  function click(event) {
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(faces, false)[0];
    if (hit) onViewChange(hit.object.userData.view);
  }
  renderer.domElement.addEventListener('pointerup', click);
  resize();
  return {
    render,
    dispose() {
      renderer.domElement.removeEventListener('pointerup', click);
      faces.forEach((face) => { face.geometry.dispose(); face.material.map.dispose(); face.material.dispose(); });
      renderer.dispose();
      renderer.domElement.remove();
      widget.remove();
    },
  };
}

function snapPoint(point) {
  return { x: Math.round(point.x / SKETCH_SNAP) * SKETCH_SNAP, y: Math.round(point.y / SKETCH_SNAP) * SKETCH_SNAP };
}

/** Shared Three.js viewport for both 3D navigation and Top-view sketching. */
export function createThreeViewport({
  host,
  stage = 'empty',
  view = 'isometric',
  profile = [],
  sketch = null,
  faceCircle = null,
  patternCount = 1,
  selectedFeatureId = null,
  onSelectionChange = () => {},
  onHoverChange = () => {},
  onSketchComplete = () => {},
  onViewChange = () => {},
} = {}) {
  if (!(host instanceof HTMLElement)) throw new TypeError('createThreeViewport requires a viewport HTMLElement');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(sketch ? '#ffffff' : '#f2f3f5');
  const isSketch = Boolean(sketch);
  const isFaceSketch = isSketch && sketch?.kind === 'face-circle';
  const faceSketchDimensions = isFaceSketch ? profileDimensions(profile) : null;
  const faceSketchPlaneX = isFaceSketch ? flangeFacePlaneX(faceSketchDimensions, selectedFeatureId) : 0;
  const faceSketchIsFront = selectedFeatureId === 'Revolution.Flange.FrontFace';
  const camera = isSketch ? new THREE.OrthographicCamera(-100, 100, 75, -75, 0.1, 1000) : new THREE.PerspectiveCamera(38, 1, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.className = 'three-canvas';
  host.replaceChildren(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x738090, 2.1));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(90, 130, 130);
  scene.add(keyLight);
  if (!isFaceSketch) {
    const grid = new THREE.GridHelper(220, 44, 0xbcc7d1, 0xe5e9ed);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);
  }
  scene.add(new THREE.AxesHelper(48));

  if (isSketch) {
    if (isFaceSketch) {
      camera.position.set(faceSketchPlaneX + (faceSketchIsFront ? 200 : -200), 0, 0);
      camera.up.set(0, 0, 1);
    } else {
      camera.position.set(0, 0, 200);
      camera.up.set(0, 1, 0);
    }
  } else {
    const orientation = VIEW_POSITIONS[view] || VIEW_POSITIONS.isometric;
    camera.position.fromArray(orientation.position).setLength(cameraDistanceFor(profile));
    // Set Z-up before OrbitControls is constructed: its orbit quaternion is
    // computed once from camera.up, so horizontal dragging then yaws around Z.
    camera.up.set(0, 0, 1);
  }
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.enablePan = true;
  orbit.screenSpacePanning = false;
  orbit.mouseButtons = { LEFT: isSketch ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
  orbit.target.set(isFaceSketch ? faceSketchPlaneX : 0, 0, 0);
  if (isSketch) orbit.enableRotate = false;
  camera.lookAt(orbit.target);
  orbit.update();

  // A face sketch uses the real revolution in a face-normal orthographic view:
  // the selected annular face stays blue while the hub and bore remain visible.
  const showModel = isFaceSketch || (!isSketch && ['revolved', 'pocket', 'pattern'].includes(stage));
  const { group: model, selectable } = showModel ? makeBracket(isFaceSketch ? 'revolved' : stage, profile, faceCircle, patternCount) : { group: new THREE.Group(), selectable: [] };
  scene.add(model);
  if (!isSketch && stage === 'profile' && profile.length > 1) scene.add(makeProfile(profile));
  selectable.forEach((object) => {
    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    if (object.userData.featureId === selectedFeatureId) material.color.setHex(0x8cc6ee);
  });

  const sketchState = { tool: null, points: [], pointer: null, center: null, circleRadius: 0, visual: null };
  const faceSketchOuterRadius = faceSketchDimensions?.outerRadius ?? null;
  const sketchPlane = isFaceSketch
    ? new THREE.Plane(new THREE.Vector3(1, 0, 0), -faceSketchPlaneX)
    : new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const raycaster = new THREE.Raycaster();
  raycaster.params.Line.threshold = SKETCH_SNAP * 1.4;
  const pointer = new THREE.Vector2();
  let hovered = null;
  let disposed = false;
  const navigation = createNavigationCube(host, camera, orbit.target, onViewChange);

  function materialFor(object) { return Array.isArray(object.material) ? object.material[0] : object.material; }
  function pickedObject() {
    const hits = raycaster.intersectObjects(selectable, false);
    return hits.find((hit) => hit.object.userData.featureId === 'Sketch.Circle')?.object || hits[0]?.object || null;
  }
  function setPointer(event) {
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
  }
  function pointOnSketchPlane(event, shouldSnap = true) {
    setPointer(event);
    const worldPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(sketchPlane, worldPoint);
    const point = isFaceSketch ? { x: worldPoint.y, y: worldPoint.z } : worldPoint;
    return shouldSnap ? snapPoint(point) : point;
  }
  function clearSketchVisual() {
    if (!sketchState.visual) return;
    sketchState.visual.traverse((object) => { object.geometry?.dispose?.(); object.material?.dispose?.(); });
    scene.remove(sketchState.visual);
    sketchState.visual = null;
  }
  function updateSketchVisual() {
    clearSketchVisual();
    const group = new THREE.Group();
    if (sketch?.kind === 'profile' && sketchState.points.length) {
      group.add(makeProfile(sketchState.points, 0x717a84, false));
      if (sketchState.pointer) {
        const last = sketchState.points.at(-1);
        const preview = Math.abs(sketchState.pointer.x - last.x) >= Math.abs(sketchState.pointer.y - last.y)
          ? { x: sketchState.pointer.x, y: last.y } : { x: last.x, y: sketchState.pointer.y };
        const previewLine = new THREE.BufferGeometry().setFromPoints([asVector3(last), asVector3(preview)]);
        group.add(new THREE.Line(previewLine, new THREE.LineDashedMaterial({ color: 0x4c82ed, dashSize: 2.5, gapSize: 1.8 })));
        group.children.at(-1).computeLineDistances();
      }
    }
    if (sketch?.kind === 'face-circle' && sketchState.center) {
      const circle = isFaceSketch
        ? makeFaceCirclePath({ center: sketchState.center, radius: sketchState.circleRadius }, faceSketchPlaneX)
        : makeSketchCircleLine(sketchState.center, sketchState.circleRadius);
      group.add(circle);
      const centerPoint = isFaceSketch
        ? new THREE.Vector3(faceSketchPlaneX, sketchState.center.x, sketchState.center.y)
        : asVector3(sketchState.center);
      group.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints([centerPoint]), new THREE.PointsMaterial({ color: 0xf25757, size: 9, sizeAttenuation: false, depthTest: false })));
    }
    sketchState.visual = group;
    scene.add(group);
  }
  function setHovered(object) {
    if (hovered === object) return;
    if (hovered) materialFor(hovered).color.setHex(hovered.userData.featureId === selectedFeatureId ? 0x8cc6ee : 0xc8cdd3);
    hovered = object;
    if (hovered) materialFor(hovered).color.setHex(0x8cc6ee);
    renderer.domElement.style.cursor = hovered ? 'pointer' : (isSketch && sketchState.tool === 'circle' ? CIRCLE_CURSOR : isSketch && sketchState.tool ? 'crosshair' : 'grab');
    onHoverChange(hovered && { featureId: hovered.userData.featureId, label: hovered.userData.featureLabel });
  }
  function onPointerMove(event) {
    if (isSketch && sketchState.tool) {
      const point = pointOnSketchPlane(event);
      sketchState.pointer = point;
      if (sketchState.center) sketchState.circleRadius = Math.hypot(point.x - sketchState.center.x, point.y - sketchState.center.y);
      updateSketchVisual();
      return;
    }
    setPointer(event);
    setHovered(pickedObject());
  }
  function onPointerUp(event) {
    if (event.button !== 0) return;
    if (isSketch && sketchState.tool) {
      const rawPoint = pointOnSketchPlane(event, false);
      const point = snapPoint(rawPoint);
      if (sketchState.tool === 'polyline') {
        const first = sketchState.points[0];
        if (sketchState.points.length > 2 && Math.hypot(rawPoint.x - first.x, rawPoint.y - first.y) <= SKETCH_CLOSE_DISTANCE) {
          onSketchComplete({ kind: 'profile', points: sketchState.points });
          return;
        }
        const last = sketchState.points.at(-1);
        sketchState.points.push(last && Math.abs(point.x - last.x) < Math.abs(point.y - last.y) ? { x: last.x, y: point.y } : last ? { x: point.x, y: last.y } : point);
      } else if (!sketchState.center) {
        sketchState.center = point;
      } else {
        onSketchComplete({ kind: 'circle', circle: { center: sketchState.center, radius: Math.hypot(point.x - sketchState.center.x, point.y - sketchState.center.y) } });
        return;
      }
      sketchState.pointer = point;
      updateSketchVisual();
      return;
    }
    setPointer(event);
    const hits = raycaster.intersectObjects(selectable, false);
    const hit = hits.find((candidate) => candidate.object.userData.featureId === 'Sketch.Circle') || hits[0];
    if (hit) onSelectionChange({ featureId: hit.object.userData.featureId, label: hit.object.userData.featureLabel, faceIndex: hit.faceIndex, point: hit.point.toArray(), normal: hit.face?.normal?.toArray() || null });
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (isSketch) {
      const frustum = faceSketchOuterRadius ? Math.max(90, faceSketchOuterRadius * 2.5) : 150;
      const aspect = width / Math.max(height, 1);
      camera.left = (-frustum * aspect) / 2; camera.right = (frustum * aspect) / 2; camera.top = frustum / 2; camera.bottom = -frustum / 2;
    } else camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  function render() {
    if (disposed) return;
    orbit.update();
    renderer.render(scene, camera);
    navigation?.render();
  }

  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  renderer.setAnimationLoop(render);
  return {
    setSketchTool(tool) {
      if (!isSketch) return false;
      sketchState.tool = tool;
      renderer.domElement.style.cursor = tool === 'circle' ? CIRCLE_CURSOR : tool ? 'crosshair' : 'grab';
      return true;
    },
    dispose() {
      disposed = true;
      observer.disconnect();
      renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      navigation?.dispose();
      orbit.dispose();
      scene.traverse((object) => { object.geometry?.dispose?.(); if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose()); else object.material?.dispose?.(); });
      renderer.dispose();
      host.replaceChildren();
    },
  };
}
