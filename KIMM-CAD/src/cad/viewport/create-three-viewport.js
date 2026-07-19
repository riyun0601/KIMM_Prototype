import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

/**
 * UI와 형상 커널 양쪽에서 사용할 Three.js 뷰포트 기반입니다.
 * 이 함수는 아직 조립 화면에 연결하지 않습니다. 실제 기능 단계에서 viewport DOM에 mount합니다.
 */
export function createThreeViewport({ host, onSelectionChange = () => {} }) {
  if (!(host instanceof HTMLElement)) {
    throw new TypeError('createThreeViewport requires a viewport HTMLElement');
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f4f5f7');

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 10_000);
  camera.position.set(160, 130, 180);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  host.replaceChildren(renderer.domElement);

  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.target.set(0, 0, 0);

  const transform = new TransformControls(camera, renderer.domElement);
  transform.addEventListener('dragging-changed', ({ value }) => { orbit.enabled = !value; });
  scene.add(transform);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const selectable = new Set();

  function resize() {
    const { width, height } = host.getBoundingClientRect();
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function render() {
    orbit.update();
    renderer.render(scene, camera);
  }

  function pick(event) {
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const hit = raycaster.intersectObjects([...selectable], true)[0] || null;
    onSelectionChange(hit && {
      object: hit.object,
      faceIndex: hit.faceIndex,
      point: hit.point.clone(),
      normal: hit.face?.normal.clone() ?? null,
    });
  }

  function setSelectable(objects) {
    selectable.clear();
    objects.forEach((object) => selectable.add(object));
  }

  function attachTransform(object, mode = 'translate') {
    transform.setMode(mode);
    transform.attach(object);
  }

  renderer.domElement.addEventListener('pointerup', pick);
  const resizeObserver = new ResizeObserver(() => { resize(); render(); });
  resizeObserver.observe(host);
  resize();
  render();

  return {
    scene,
    camera,
    renderer,
    render,
    setSelectable,
    attachTransform,
    clearTransform: () => transform.detach(),
    dispose() {
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerup', pick);
      orbit.dispose();
      transform.dispose();
      renderer.dispose();
      host.replaceChildren();
    },
  };
}
