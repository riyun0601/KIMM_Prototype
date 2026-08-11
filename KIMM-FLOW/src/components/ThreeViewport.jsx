import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const MODEL_ROOT = "/models/polyMesh";

export default function ThreeViewport({ displayMode, selectedBoundary }) {
  const hostRef = useRef(null);
  const objectsRef = useRef([]);
  const appearanceRef = useRef({ displayMode, selectedBoundary });
  const [loadState, setLoadState] = useState("loading");

  useEffect(() => {
    appearanceRef.current = { displayMode, selectedBoundary };
    applyAppearance(objectsRef.current, displayMode, selectedBoundary);
  }, [displayMode, selectedBoundary]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x566076, 2.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(5, 7, 8);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fb8ff, 1.2);
    rim.position.set(-6, 3, -5);
    scene.add(rim);

    const modelRoot = new THREE.Group();
    modelRoot.rotation.x = -Math.PI / 2;
    scene.add(modelRoot);

    let frameId;
    let disposed = false;
    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    Promise.all([
      fetch(`${MODEL_ROOT}/metadata.json`).then(response => response.json()),
      fetch(`${MODEL_ROOT}/points.bin`).then(response => response.arrayBuffer()),
      fetch(`${MODEL_ROOT}/indices.bin`).then(response => response.arrayBuffer()),
    ]).then(([metadata, pointBuffer, indexBuffer]) => {
      if (disposed) return;
      const points = new Float32Array(pointBuffer);
      const allIndices = new Uint32Array(indexBuffer);
      const objects = [];

      Object.entries(metadata.patches).forEach(([name, patch]) => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
        geometry.setIndex(new THREE.BufferAttribute(allIndices.slice(patch.indexOffset, patch.indexOffset + patch.indexCount), 1));
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();

        const surfaceMaterial = new THREE.MeshPhongMaterial({
          color: 0xf7f6f1,
          shininess: 52,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
        });
        const surface = new THREE.Mesh(geometry, surfaceMaterial);
        surface.name = name;
        modelRoot.add(surface);

        const featureMaterial = new THREE.LineBasicMaterial({ color: 0xdde3ef, transparent: true, opacity: 0.72 });
        const feature = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 26), featureMaterial);
        modelRoot.add(feature);

        const wireMaterial = new THREE.LineBasicMaterial({ color: 0x7f8798, transparent: true, opacity: 0.7 });
        const wire = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), wireMaterial);
        modelRoot.add(wire);

        const pointMaterial = new THREE.PointsMaterial({ color: 0xe7e9ef, size: 0.018, sizeAttenuation: true });
        const pointCloud = new THREE.Points(geometry, pointMaterial);
        modelRoot.add(pointCloud);
        objects.push({ name, geometry, surface, surfaceMaterial, feature, featureMaterial, wire, wireMaterial, pointCloud, pointMaterial });
      });

      modelRoot.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(modelRoot);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      modelRoot.position.sub(center);
      const extent = Math.max(size.x, size.y, size.z);
      camera.position.set(extent * 1.0, extent * 0.65, extent * 2.1);
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      controls.minDistance = extent * 0.35;
      controls.maxDistance = extent * 5;
      controls.update();
      objectsRef.current = objects;
      applyAppearance(objects, appearanceRef.current.displayMode, appearanceRef.current.selectedBoundary);
      setLoadState("ready");
    }).catch(() => setLoadState("error"));

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      controls.dispose();
      objectsRef.current.forEach(item => {
        item.geometry.dispose();
        item.feature.geometry.dispose();
        item.wire.geometry.dispose();
        item.surfaceMaterial.dispose();
        item.featureMaterial.dispose();
        item.wireMaterial.dispose();
        item.pointMaterial.dispose();
      });
      objectsRef.current = [];
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="three-viewport" ref={hostRef}>
    {loadState === "loading" && <div className="viewer-message">Loading OpenFOAM surface...</div>}
    {loadState === "error" && <div className="viewer-message error">Unable to load mesh assets.</div>}
  </div>;
}

function applyAppearance(objects, mode, selectedBoundary) {
  objects.forEach(item => {
    const selected = item.name === selectedBoundary;
    const highlight = selected ? 0xf000eb : null;
    item.surface.visible = mode === "Surface" || mode === "Surface With Edges";
    item.feature.visible = mode === "Feature Edges";
    item.wire.visible = selected || mode === "Wireframe" || mode === "Surface With Edges";
    item.pointCloud.visible = mode === "Points";
    item.surfaceMaterial.color.setHex(selected ? 0xf7d7f5 : 0xf7f6f1);
    item.featureMaterial.color.setHex(highlight ?? 0xdde3ef);
    item.featureMaterial.opacity = selected ? 1 : 0.72;
    item.wireMaterial.color.setHex(highlight ?? (mode === "Surface With Edges" ? 0x555b67 : 0xcfd5df));
    item.wireMaterial.opacity = selected ? 1 : mode === "Surface With Edges" ? 0.42 : 0.76;
    item.pointMaterial.color.setHex(highlight ?? 0xe7e9ef);
  });
}
