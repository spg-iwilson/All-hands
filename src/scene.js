import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { lines, sailForLine } from './learning.js';
import { courseSailPoint } from './sail-shape.js';
import { nearestLine } from './line-picking.js';

export function createRigView(container, onSelect) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0xd9e8e6);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label', 'Provisional Duyfken mainmast. Use labelled line controls for an accessible alternative.');
  container.append(renderer.domElement);
  const lineLabel = document.createElement('div');
  lineLabel.className = 'line-label';
  lineLabel.hidden = true;
  lineLabel.setAttribute('role', 'status');
  container.append(lineLabel);
  let labelledLine = null;
  const curves = new Map();
  function dismissLineLabel() {
    labelledLine = null;
    lineLabel.hidden = true;
    lineLabel.textContent = '';
  }
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd9e8e6, 36, 95);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 150);
  camera.position.set(22, 13, 27);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 8, 0);
  controls.enableDamping = true;
  controls.minDistance = 13;
  controls.maxDistance = 55;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.minPolarAngle = 0.18;
  scene.add(new THREE.HemisphereLight(0xf5fbff, 0x60594c, 2.4));
  const sun = new THREE.DirectionalLight(0xffecd3, 3);
  sun.position.set(9, 25, 15);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 22, bottom: -5 });
  scene.add(sun);

  const wood = new THREE.MeshStandardMaterial({ color: 0x654b32, roughness: 0.87 });
  const deckMaterial = new THREE.MeshStandardMaterial({ color: 0x9e8060, roughness: 0.95 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0xe9dbc1, roughness: 1, side: THREE.DoubleSide });
  const furledCloth = new THREE.MeshStandardMaterial({ color: 0xd2c3a6, roughness: 1 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x343b3c, roughness: 0.65 });
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.32, 18, 16), wood);
  mast.position.y = 8.8;
  mast.castShadow = true;
  scene.add(mast);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(13, 0.32, 9), deckMaterial);
  deck.position.y = -0.24;
  deck.receiveShadow = true;
  scene.add(deck);
  for (let x = -6; x <= 6; x += 0.55) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.012, 9), wood);
    seam.position.set(x, -0.07, 0);
    scene.add(seam);
  }
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    new THREE.MeshStandardMaterial({ color: 0x5b8e97, roughness: 0.35, metalness: 0.15 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -1;
  scene.add(sea);
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.15, 9), wood);
    rail.position.set(side * 6.1, 0.95, 0);
    scene.add(rail);
    for (let z = -4; z <= 4; z += 1) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1, 0.14), wood);
      post.position.set(side * 6.1, 0.45, z);
      scene.add(post);
    }
    for (let z = -2; z <= 2; z += 2) {
      const stay = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.LineCurve3(
          new THREE.Vector3(0, 16, 0), new THREE.Vector3(side * 5.5, 0.4, z),
        ), 1, 0.025, 4, false),
        new THREE.MeshStandardMaterial({ color: 0x4b4940 }),
      );
      scene.add(stay);
    }
  }

  function yard(width, y) {
    const group = new THREE.Group();
    const spar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, width, 12), wood);
    spar.rotation.z = Math.PI / 2;
    spar.castShadow = true;
    group.add(spar);
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.23, width * 0.94, 12), furledCloth);
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, -0.24, 0.04);
    group.add(roll);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 6, 16), iron);
    collar.rotation.y = Math.PI / 2;
    group.add(collar);
    group.position.set(0, y, 0.25);
    scene.add(group);
    return { group, roll };
  }
  const course = yard(10, 10);
  yard(7.4, 14.8);
  const sailGeometry = new THREE.PlaneGeometry(10, 4.6, 20, 14);
  const sail = new THREE.Mesh(sailGeometry, cloth);
  sail.castShadow = true;
  scene.add(sail);
  const originalSail = Float32Array.from(sailGeometry.attributes.position.array);

  const ropeMeshes = new Map();
  const coils = new Map();
  const markerMeshes = [];
  const baseMarker = new THREE.Mesh(
    new THREE.TorusGeometry(0.43, 0.035, 6, 24),
    new THREE.MeshStandardMaterial({ color: 0xe1a44c }),
  );
  baseMarker.rotation.x = Math.PI / 2;
  baseMarker.position.y = 0.32;
  scene.add(baseMarker);
  for (const line of lines) {
    const rope = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshStandardMaterial({ color: line.kind.startsWith('top-') ? 0x7c827a : 0x9c835a, roughness: 1 }),
    );
    rope.userData.lineId = line.id;
    scene.add(rope);
    ropeMeshes.set(line.id, rope);
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.033, 5, 20), rope.material.clone());
    coil.rotation.x = Math.PI / 2;
    coil.visible = false;
    scene.add(coil);
    coils.set(line.id, coil);
    if (line.kind === 'lift') {
      const mark = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xe1a44c }),
      );
      mark.userData.side = line.side === 'port' ? -1 : 1;
      scene.add(mark);
      markerMeshes.push(mark);
    }
  }
  let selected = new Set();
  let visibleSail = 'course';
  let currentRig;
  function showSailLines(sail) {
    if (sail !== visibleSail) dismissLineLabel();
    visibleSail = sail;
    for (const line of lines) {
      const visible = sailForLine(line) === visibleSail;
      ropeMeshes.get(line.id).visible = visible;
      coils.get(line.id).visible = visible && Boolean(currentRig?.coiled.includes(line.id));
    }
    for (const mark of markerMeshes) mark.visible = visibleSail === 'course';
  }
  function highlight(ids) {
    selected = new Set(ids);
    for (const [id, mesh] of ropeMeshes) {
      mesh.material.emissive.set(selected.has(id) ? 0x37bdc1 : 0x000000);
      mesh.material.emissiveIntensity = selected.has(id) ? 1.5 : 0;
    }
  }
  const point = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  function update(rig) {
    currentRig = rig;
    const y = 5.4 + rig.yard * 4.6;
    course.group.position.y = y;
    course.roll.scale.set(1 - rig.sail * 0.7, 1, 1 - rig.sail * 0.7);
    course.roll.visible = rig.sail < 0.99;
    sail.visible = rig.sail > 0.01;
    const positions = sailGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const ox = originalSail[i * 3];
      const oy = originalSail[i * 3 + 1];
      const vertical = (2.3 - oy) / 4.6;
      const vertex = courseSailPoint(ox / 5, vertical, rig);
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    positions.needsUpdate = true;
    sailGeometry.computeVertexNormals();
    sailGeometry.computeBoundingSphere();
    sail.position.y = y;
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const s = line.side === 'port' ? -1 : 1;
      const end = point(s * (1.4 + (index % 6) * 0.55), 0.4, 1.9 + (index % 3) * 0.4);
      const clew = courseSailPoint(s, 1, rig);
      const corner = point(clew.x, y + clew.y, clew.z);
      let points;
      switch (line.kind) {
        case 'lift':
          points = [point(s * 5, y, 0.25), point(s * 0.2, 12.6, 0), point(s * 0.4, 0.4, 0.1)];
          break;
        case 'brace':
          points = [point(s * 5, y, 0.25), point(s * 5.7, y * 0.45, -2), end];
          break;
        case 'sheet':
          points = [corner, point(s * 5.7, 0.7, 2.7), end];
          break;
        case 'tack':
          points = [corner, point(s * 5.7, 0.7, -2.5), end];
          break;
        case 'clew':
          points = [corner, point(s * 4.5, y, 0.35), end];
          break;
        case 'martnet':
          {
            const gathered = courseSailPoint(s * 0.6, 0.65, rig);
            points = [point(gathered.x, y + gathered.y, gathered.z), point(s * 1.5, y, 0.5), end];
          }
          break;
        case 'halyard':
          points = [point(0, y, -0.25), point(0.2, 16, -0.3), end];
          break;
        case 'top-halyard':
          points = [point(0, 14.8, -0.3), point(-0.15, 17.7, -0.3), end];
          break;
        case 'top-sheet':
          points = [point(s * 2.8, 14.6, 0.35), point(s * 5, y, 0.25), end];
          break;
        case 'top-brace':
          points = [point(s * 3.7, 14.8, 0.25), point(s * 5.6, 7, -2.8), end];
          break;
        case 'gasket': {
          const x = 2.4;
          const stowed = rig.stowed.includes(line.id);
          const released = rig.released.includes(line.id);
          points = stowed
            ? [point(0.32, y + 0.7, -0.2), point(-0.28, y + 0.45, -0.4), point(0.32, y + 0.2, -0.2)]
            : [point(x, y + 0.18, 0.22), point(x, y - (released ? 1.2 : 0.42), 0.5), point(x + 0.12, y - 0.1, 0)];
          break;
        }
        default:
          throw new Error(`No visual routing for ${line.kind}.`);
      }
      const mesh = ropeMeshes.get(line.id);
      const curve = new THREE.CatmullRomCurve3(points);
      curves.set(line.id, curve);
      mesh.geometry.dispose();
      mesh.geometry = new THREE.TubeGeometry(curve, 24, line.kind === 'gasket' ? 0.042 : 0.027, 5, false);
      const coil = coils.get(line.id);
      coil.position.copy(end);
      coil.position.y = 0.1;
      coil.visible = rig.coiled.includes(line.id);
      coil.material.color.set(rig.belayed.includes(line.id) ? 0x526f60 : 0x9c835a);
    }
    for (const mark of markerMeshes) {
      mark.position.set(mark.userData.side * 0.4, 2 - rig.lifts * 1.68, 0.1);
    }
    showSailLines(visibleSail);
  }
  function project(point, width, height) {
    const projected = point.project(camera);
    return { x: (projected.x + 1) * width / 2, y: (1 - projected.y) * height / 2, z: projected.z };
  }
  let down;
  renderer.domElement.addEventListener('pointerdown', event => {
    down = event.isPrimary && event.button === 0 ? [event.clientX, event.clientY] : null;
  });
  renderer.domElement.addEventListener('pointercancel', () => { down = null; });
  renderer.domElement.addEventListener('pointerup', event => {
    const start = down;
    down = null;
    if (!start || Math.hypot(event.clientX - start[0], event.clientY - start[1]) > 6) return;
    const rect = renderer.domElement.getBoundingClientRect();
    camera.updateMatrixWorld();
    const candidates = lines.filter(line => ropeMeshes.get(line.id).visible).map(line => ({
      id: line.id,
      points: curves.get(line.id).getPoints(96).map((point, index) => ({
        ...project(point, rect.width, rect.height), t: index / 96,
      })),
    }));
    const hit = nearestLine({ x: event.clientX - rect.left, y: event.clientY - rect.top }, candidates);
    const previous = labelledLine?.id;
    dismissLineLabel();
    if (!hit) return;
    onSelect(hit.id);
    if (previous !== hit.id) {
      labelledLine = { id: hit.id, t: hit.t };
      lineLabel.textContent = lines.find(line => line.id === hit.id).label;
    }
  });
  const resize = new ResizeObserver(() => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
  resize.observe(container);
  let contextLost = false;
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    contextLost = true;
    dismissLineLabel();
    container.dispatchEvent(new CustomEvent('rigerror', { detail: 'The 3D graphics context was lost. Reload to restore the rig. Your exercise has not been completed.' }));
  });
  renderer.setAnimationLoop(() => {
    if (contextLost) return;
    controls.update();
    renderer.render(scene, camera);
    if (labelledLine) {
      const width = container.clientWidth;
      const height = container.clientHeight;
      const anchor = project(curves.get(labelledLine.id).getPoint(labelledLine.t), width, height);
      lineLabel.hidden = anchor.z < -1 || anchor.z > 1 || anchor.x < 0 || anchor.x > width || anchor.y < 0 || anchor.y > height;
      if (!lineLabel.hidden) {
        lineLabel.style.left = `${Math.max(4, Math.min(anchor.x + 12, width - lineLabel.offsetWidth - 4))}px`;
        lineLabel.style.top = `${Math.max(4, Math.min(anchor.y + 12, height - lineLabel.offsetHeight - 4))}px`;
      }
    }
  });
  return {
    update, highlight, showSailLines, dismissLineLabel,
    resetCamera() { camera.position.set(22, 13, 27); controls.target.set(0, 8, 0); controls.update(); },
    dispose() {
      resize.disconnect();
      controls.dispose();
      renderer.setAnimationLoop(null);
      scene.traverse(object => {
        if (object.isMesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => material.dispose());
        }
      });
      renderer.dispose();
      lineLabel.remove();
    },
  };
}
