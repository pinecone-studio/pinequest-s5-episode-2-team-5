import { loadAsync, Renderer } from 'expo-three';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import beakerAsset from '../../../assets/models/openlab/beaker.glb';
import centrifugeAsset from '../../../assets/models/openlab/centrifuge.glb';
import flaskAsset from '../../../assets/models/openlab/erlenmeyer-flask.glb';
import hotplateAsset from '../../../assets/models/openlab/hot-plate.glb';
import counterAsset from '../../../assets/models/openlab/lab-counter.glb';
import microscopeAsset from '../../../assets/models/openlab/microscope.glb';
import reagentBottleAsset from '../../../assets/models/openlab/reagent-bottle.glb';
import testTubeRackAsset from '../../../assets/models/openlab/test-tube-rack.glb';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Colors, Fonts } from '@/constants/theme';

type Direction = 'forward' | 'back' | 'left' | 'right';
type LabItem = { id: string; name: string; description: string; position: [number, number, number]; kind: 'beaker' | 'flask' | 'microscope' | 'laptop' | 'bottle' | 'box' | 'centrifuge' | 'hotplate' };
type SceneState = { renderer: Renderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; player: THREE.Group; playerBody: THREE.Group; items: Map<string, THREE.Group>; hitTargets: THREE.Object3D[]; position: THREE.Vector3; heading: number; frame: number; frameHandle: number };

const ITEMS: LabItem[] = [
  { id: 'beaker-blue', name: 'Copper sulfate beaker', description: 'A clear blue solution. Tap Use to inspect its color and sample notes.', position: [-2.6, 1.38, -0.45], kind: 'beaker' },
  { id: 'flask-green', name: 'Indicator flask', description: 'The green indicator changes color when the pH shifts.', position: [-1.55, 1.38, -0.45], kind: 'flask' },
  { id: 'microscope', name: 'Digital microscope', description: 'The lens is ready. Use it to reveal a magnified crystal sample.', position: [-3.3, 1.38, -2.55], kind: 'microscope' },
  { id: 'laptop', name: 'Lab computer', description: 'A saved readout is open: temperature 22 °C, pH 7.0.', position: [2.4, 1.38, -0.45], kind: 'laptop' },
  { id: 'bottle-red', name: 'Reagent bottle', description: 'A sealed, labeled reagent bottle. In this demo it is safe to handle.', position: [1.55, 1.38, -0.45], kind: 'bottle' },
  { id: 'sample-box', name: 'Crystal sample box', description: 'A small tray of mineral crystals, ready for the microscope.', position: [2.6, 1.38, -2.55], kind: 'box' },
  { id: 'beaker-yellow', name: 'Warm solution', description: 'A yellow solution is ready for a temperature check.', position: [-3.05, 0, 2.25], kind: 'beaker' },
  { id: 'flask-violet', name: 'Reaction flask', description: 'A violet sample sits in a round-bottom flask.', position: [3.05, 1.38, 2.05], kind: 'flask' },
  { id: 'centrifuge', name: 'Bench centrifuge', description: 'A compact centrifuge for separating a sample into layers.', position: [0.45, 1.38, -3.15], kind: 'centrifuge' },
  { id: 'hotplate', name: 'Hot plate', description: 'A small hot plate with a ceramic heating surface.', position: [-1.55, 1.38, -3.12], kind: 'hotplate' },
];

const MODEL_ASSETS = {
  beaker: beakerAsset,
  flask: flaskAsset,
  microscope: microscopeAsset,
  bottle: reagentBottleAsset,
  box: testTubeRackAsset,
  centrifuge: centrifugeAsset,
  hotplate: hotplateAsset,
  counter: counterAsset,
};

const ARROWS: Record<Direction, string> = { forward: '▲', back: '▼', left: '◀', right: '▶' };

export function LabScene({ onExit }: { onExit: () => void }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const sceneRef = useRef<SceneState | null>(null);
  const heldRef = useRef<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  const activeDirections = useRef(new Set<Direction>());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [heldId, setHeldId] = useState<string | null>(null);
  const [message, setMessage] = useState('Walk around and tap equipment to inspect it.');

  const onContextCreate = useCallback((gl: ExpoWebGLRenderingContext) => {
    const renderer = new Renderer({ gl, antialias: true, alpha: false });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setPixelRatio(Math.min(1.5, renderer.getPixelRatio()));
    renderer.setClearColor('#D7E4E6', 1);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#D7E4E6');
    scene.fog = new THREE.Fog('#D7E4E6', 12, 24);
    const camera = new THREE.PerspectiveCamera(48, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 60);
    camera.position.set(0, 3.5, 8.5);

    const hemisphere = new THREE.HemisphereLight('#E8F8FF', '#867C73', 2.2);
    scene.add(hemisphere);
    const sun = new THREE.DirectionalLight('#FFF4D8', 2.4);
    sun.position.set(-4, 9, 5);
    scene.add(sun);
    const fill = new THREE.DirectionalLight('#A4DFFF', 1.2);
    fill.position.set(6, 6, -4);
    scene.add(fill);

    const room = new THREE.Group();
    scene.add(room);
    const material = (color: string, roughness = 0.72, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
    const floorMat = material('#D6D9D5');
    const wallMat = material('#DCE5E3');
    const cabinetMat = material('#F3F4F0');
    const steelMat = material('#89999B', 0.34, 0.7);
    const darkMat = material('#293B4A', 0.4, 0.25);
    const benchTopMat = material('#FBFCF8', 0.3);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 10), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.025, 0);
    room.add(floor);
    const grid = new THREE.GridHelper(12, 24, '#B7C2C0', '#C8D0CC');
    grid.position.y = -0.018;
    room.add(grid);

    // A bright corner room with its front left open so the player can move through it.
    addBox(room, [12, 4.1, 0.14], [0, 2.05, -4.95], wallMat);
    addBox(room, [0.14, 4.1, 10], [-5.95, 2.05, 0], wallMat);
    for (const x of [-3.9, -1.55, 1.15, 3.55]) {
      addBox(room, [1.95, 1.35, 0.12], [x, 2.55, -4.84], darkMat);
      addBox(room, [1.78, 1.17, 0.035], [x, 2.55, -4.745], material('#24546A', 0.22, 0.08));
      addBox(room, [1.78, 0.018, 0.04], [x, 2.35, -4.71], material('#52D7E7', 0.25));
    }
    // Wall cabinets and a tall analyzer.
    addBox(room, [1.45, 2.65, 0.72], [-2.55, 1.34, -4.12], cabinetMat);
    addBox(room, [0.9, 1.08, 0.05], [-2.55, 1.68, -3.73], darkMat);
    addBox(room, [0.63, 0.64, 0.06], [-2.55, 1.68, -3.68], material('#162936', 0.25));
    addBox(room, [0.04, 0.04, 0.08], [-2.23, 1.16, -3.65], material('#72D8BB', 0.25));
    addBox(room, [0.72, 2.35, 0.63], [4.72, 1.18, -4.28], material('#D0D9D7'));
    addBox(room, [0.54, 0.13, 0.65], [4.72, 2.4, -4.28], steelMat);

    // Long rear counter with drawers, metal legs, and small upper shelf.
    addCounter(room, -3.3, -3.55, 6.6, 1.55, benchTopMat, cabinetMat, steelMat);
    addBox(room, [6.6, 0.11, 0.6], [0, 2.45, -3.8], steelMat);
    addBox(room, [6.6, 0.09, 0.68], [0, 2.57, -3.8], benchTopMat);

    // Main island counter matching the broad white central work surface in the reference.
    addCounter(room, -2.75, -0.8, 5.5, 2.05, benchTopMat, cabinetMat, steelMat);
    addBox(room, [5.5, 0.12, 0.92], [0, 2.55, -0.82], steelMat);
    addBox(room, [5.5, 0.09, 0.98], [0, 2.68, -0.82], benchTopMat);
    // Side bench for a separate workstation.
    addCounter(room, 2.35, 1.5, 2.8, 1.3, benchTopMat, cabinetMat, steelMat);

    // Stools, wall plant, and room details.
    for (const [x, z] of [[-4.15, 2.55], [4.45, 2.25]] as [number, number][]) {
      addCylinder(room, 0.45, 0.45, 0.2, [x, 0.62, z], material('#1677A8', 0.42));
      addCylinder(room, 0.09, 0.11, 0.65, [x, 0.31, z], steelMat);
      addBox(room, [0.62, 0.09, 0.11], [x, 0.09, z], steelMat);
    }
    makePlant(room, [5.05, 2.5, -4.1]);
    addBox(room, [11.9, 0.16, 0.16], [0, 4.08, -4.9], material('#84969A'));

    const items = new Map<string, THREE.Group>();
    const hitTargets: THREE.Object3D[] = [];
    ITEMS.forEach((item, index) => {
      const group = makeLabItem(item, index, material, steelMat, darkMat);
      group.position.set(...item.position);
      group.userData.labItemId = item.id;
      const tapTarget = new THREE.Mesh(
        new THREE.SphereGeometry(0.58, 12, 8),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      );
      tapTarget.position.y = 0.46;
      tapTarget.userData.labItemId = item.id;
      tapTarget.userData.labUtility = true;
      group.add(tapTarget);
      const selectionRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.57, 0.035, 8, 32),
        new THREE.MeshBasicMaterial({ color: '#B5F23D', transparent: true, opacity: 0.9 }),
      );
      selectionRing.name = 'selection-ring';
      selectionRing.rotation.x = Math.PI / 2;
      selectionRing.position.y = 0.025;
      selectionRing.visible = false;
      selectionRing.userData.labUtility = true;
      group.add(selectionRing);
      scene.add(group);
      items.set(item.id, group);
      group.traverse((object) => {
        if ((object as THREE.Mesh).isMesh && !object.userData.labDecorative) {
          object.userData.labItemId = item.id;
          hitTargets.push(object);
        }
      });
      if (item.kind !== 'laptop') {
        const modelKey = item.kind as keyof typeof MODEL_ASSETS;
        loadAssetModel(MODEL_ASSETS[modelKey], targetHeightFor(item.kind)).then((model) => {
          if (sceneRef.current !== state) return;
          group.children.filter((child) => !child.userData.labUtility).forEach((child) => {
            disposeGroup(child);
            group.remove(child);
          });
          group.add(model);
          const replacementTargets: THREE.Object3D[] = [];
          group.traverse((object) => {
            if ((object as THREE.Mesh).isMesh && !object.userData.labDecorative) {
              object.userData.labItemId = item.id;
              replacementTargets.push(object);
            }
          });
          state.hitTargets = state.hitTargets.filter((target) => target.userData.labItemId !== item.id);
          state.hitTargets.push(...replacementTargets);
        }).catch((error: unknown) => console.warn(`OpenLab model failed to load: ${item.kind}`, error));
      }
    });

    loadAssetModel(MODEL_ASSETS.counter, 2.45, 2.7, 0.85).then((counter) => {
      if (sceneRef.current !== state) return;
      counter.position.set(0, 0, -4.2);
      room.add(counter);
    }).catch((error: unknown) => console.warn('OpenLab counter model failed to load', error));

    const player = new THREE.Group();
    const playerBody = new THREE.Group();
    player.add(playerBody);
    scene.add(player);
    makeScientist(playerBody, material, darkMat);
    const state: SceneState = { renderer, scene, camera, player, playerBody, items, hitTargets, position: new THREE.Vector3(0, 0, 2.25), heading: 0, frame: 0, frameHandle: 0 };
    sceneRef.current = state;
    player.position.copy(state.position);

    const tick = () => {
      if (sceneRef.current !== state) return;
      const step = 0.055;
      const forward = (activeDirections.current.has('forward') ? 1 : 0) - (activeDirections.current.has('back') ? 1 : 0);
      const sideways = (activeDirections.current.has('right') ? 1 : 0) - (activeDirections.current.has('left') ? 1 : 0);
      const dx = Math.sin(state.heading) * forward + Math.cos(state.heading) * sideways;
      const dz = -Math.cos(state.heading) * forward + Math.sin(state.heading) * sideways;
      if (forward || sideways) {
        const nextX = THREE.MathUtils.clamp(state.position.x + dx * step, -5.2, 5.2);
        const nextZ = THREE.MathUtils.clamp(state.position.z + dz * step, -4.3, 4.25);
        if (!inBench(nextX, nextZ)) state.position.set(nextX, 0, nextZ);
        state.playerBody.position.y = 0.025 + Math.abs(Math.sin(state.frame * 0.24)) * 0.035;
      } else {
        state.playerBody.position.y = 0;
      }
      state.frame += 1;
      state.player.position.copy(state.position);
      state.player.rotation.y = state.heading;

      const followDistance = 5.7;
      const desired = new THREE.Vector3(
        state.position.x + Math.sin(state.heading) * followDistance,
        3.35,
        state.position.z + Math.cos(state.heading) * followDistance,
      );
      state.camera.position.lerp(desired, 0.08);
      state.camera.lookAt(state.position.x, 1.08, state.position.z - 0.55);

      if (heldRef.current) {
        const held = state.items.get(heldRef.current);
        if (held) {
          held.visible = true;
          held.position.set(state.position.x - Math.sin(state.heading) * 0.64, 1.08, state.position.z + Math.cos(state.heading) * -0.64);
          held.rotation.y += 0.01;
        }
      }
      state.renderer.render(state.scene, state.camera);
      gl.endFrameEXP();
      state.frameHandle = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  useEffect(() => () => {
    const state = sceneRef.current;
    if (state) {
      cancelAnimationFrame(state.frameHandle);
      state.renderer.dispose();
      state.scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((entry) => entry?.dispose());
      });
      sceneRef.current = null;
    }
    activeDirections.current.clear();
  }, []);

  const tapScene = useCallback((event: GestureResponderEvent) => {
    const state = sceneRef.current;
    if (!state) return;
    const { locationX, locationY } = event.nativeEvent;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2((locationX / width) * 2 - 1, -(locationY / height) * 2 + 1), state.camera);
    const hit = raycaster.intersectObjects(state.hitTargets, false)[0];
    let id = hit?.object.userData.labItemId as string | undefined;
    if (!id) {
      state.camera.updateMatrixWorld();
      let nearestDistance = 68;
      state.items.forEach((group, itemId) => {
        const point = group.getWorldPosition(new THREE.Vector3()).project(state.camera);
        if (point.z < -1 || point.z > 1) return;
        const screenX = ((point.x + 1) / 2) * width;
        const screenY = ((1 - point.y) / 2) * height;
        const distance = Math.hypot(screenX - locationX, screenY - locationY);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          id = itemId;
        }
      });
    }
    if (!id) return;
    selectedRef.current = id;
    setSelectedId(id);
    state.items.forEach((group, itemId) => {
      const ring = group.getObjectByName('selection-ring');
      if (ring) ring.visible = itemId === id;
    });
    setMessage(`${ITEMS.find((item) => item.id === id)?.name ?? 'Lab item'} selected. Pick it up or use it.`);
  }, [height, width]);

  const action = useCallback(() => {
    const state = sceneRef.current;
    if (!state) return;
    const selected = selectedRef.current;
    if (heldRef.current) {
      const held = state.items.get(heldRef.current);
      if (held) {
        held.position.set(state.position.x - Math.sin(state.heading) * 0.85, 0.03, state.position.z - Math.cos(state.heading) * 0.85);
        held.rotation.y = state.heading;
        heldRef.current = null;
        setHeldId(null);
        setMessage('Item placed on the floor. Tap it again to move or use it.');
      }
      return;
    }
    if (!selected) return;
    const item = state.items.get(selected);
    if (!item) return;
    const playerDistance = item.position.distanceTo(state.position);
    if (playerDistance > 4.8) {
      setMessage('Walk closer to the item first.');
      return;
    }
    heldRef.current = selected;
    setHeldId(selected);
    setMessage(`${ITEMS.find((entry) => entry.id === selected)?.name} picked up. Move, then tap Place.`);
  }, []);

  const useItem = useCallback(() => {
    const selected = selectedRef.current;
    if (!selected) return;
    const item = ITEMS.find((entry) => entry.id === selected);
    if (!item) return;
    if (selected === 'microscope' || selected === 'sample-box') setMessage(`${item.description} Crystal view: hexagonal lattice, 40× magnification.`);
    else if (selected.includes('beaker') || selected.includes('flask')) setMessage(`${item.description} Demo reading: pH 7.0 · 22 °C. This is a visual learning simulation.`);
    else setMessage(item.description);
  }, []);

  const setDirection = (direction: Direction, active: boolean) => {
    if (active) activeDirections.current.add(direction);
    else activeDirections.current.delete(direction);
  };
  const rotate = (direction: 'left' | 'right') => {
    if (direction === 'left') setMessage('Camera turned left.');
    const state = sceneRef.current;
    if (state) state.heading += direction === 'left' ? 0.35 : -0.35;
  };
  const selected = ITEMS.find((item) => item.id === selectedId);

  return (
    <View style={styles.root}>
      <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
      <Pressable accessibilityLabel="Tap a lab item to select it" onPress={tapScene} style={StyleSheet.absoluteFill} />
      <View pointerEvents="box-none" style={[styles.overlay, { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View pointerEvents="box-none" style={styles.topbar}>
          <Pressable onPress={onExit} style={styles.backButton}><AppText style={styles.backArrow}>‹</AppText></Pressable>
          <View pointerEvents="none" style={styles.titlePill}><AppText style={styles.title}>OPENLAB</AppText><AppText style={styles.subTitle}>CHEMISTRY SPACE</AppText></View>
          <View pointerEvents="none" style={styles.live}><View style={styles.liveDot} /><AppText style={styles.liveText}>LIVE</AppText></View>
        </View>

        <View pointerEvents="none" style={styles.hint}><AppText style={styles.hintText}>{message}</AppText></View>
        {selected && <View pointerEvents="none" style={styles.selectedTag}><AppText style={styles.selectedText}>{selected.name.toUpperCase()}</AppText></View>}

        <View pointerEvents="box-none" style={styles.bottomControls}>
          <View pointerEvents="box-none" style={styles.dpad}>
            <View pointerEvents="box-none" style={styles.dpadRow}><View pointerEvents="none" style={styles.dpadSpacer} /><MoveButton label={ARROWS.forward} onChange={(active) => setDirection('forward', active)} /><View pointerEvents="none" style={styles.dpadSpacer} /></View>
            <View pointerEvents="box-none" style={styles.dpadRow}><MoveButton label={ARROWS.left} onChange={(active) => setDirection('left', active)} /><MoveButton label={ARROWS.back} onChange={(active) => setDirection('back', active)} /><MoveButton label={ARROWS.right} onChange={(active) => setDirection('right', active)} /></View>
            <View pointerEvents="box-none" style={styles.rotateRow}><Pressable onPress={() => rotate('left')} style={styles.rotateButton}><AppText style={styles.rotateText}>↶</AppText></Pressable><AppText style={styles.moveLabel}>MOVE</AppText><Pressable onPress={() => rotate('right')} style={styles.rotateButton}><AppText style={styles.rotateText}>↷</AppText></Pressable></View>
          </View>
          <View pointerEvents="box-none" style={styles.actionStack}>
            <Pressable disabled={!selectedId} onPress={useItem} style={[styles.actionButton, styles.useButton, !selectedId && styles.disabled]}><AppText style={styles.actionText}>USE</AppText></Pressable>
            <Pressable disabled={!selectedId && !heldId} onPress={action} style={[styles.actionButton, styles.pickButton, !selectedId && !heldId && styles.disabled]}><AppText style={styles.actionText}>{heldId ? 'PLACE' : 'PICK UP'}</AppText></Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function MoveButton({ label, onChange }: { label: string; onChange: (active: boolean) => void }) {
  return <Pressable onPressIn={() => onChange(true)} onPressOut={() => onChange(false)} style={({ pressed }) => [styles.moveButton, pressed && styles.movePressed]}><AppText style={styles.moveText}>{label}</AppText></Pressable>;
}

function addBox(parent: THREE.Object3D, size: [number, number, number], position: [number, number, number], mat: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...position);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent: THREE.Object3D, topRadius: number, bottomRadius: number, height: number, position: [number, number, number], mat: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(topRadius, bottomRadius, height, 20), mat);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function addCounter(parent: THREE.Object3D, x: number, z: number, width: number, depth: number, top: THREE.Material, front: THREE.Material, steel: THREE.Material) {
  addBox(parent, [width, 0.16, depth], [x + width / 2, 1.34, z + depth / 2], top);
  addBox(parent, [width, 0.48, 0.11], [x + width / 2, 1.02, z + depth - 0.055], front);
  for (const px of [x + 0.12, x + width - 0.12]) for (const pz of [z + 0.12, z + depth - 0.12]) {
    addBox(parent, [0.11, 1.26, 0.11], [px, 0.65, pz], steel);
  }
  for (const dx of [-0.22, 0.22]) {
    addBox(parent, [0.38, 0.34, 0.055], [x + width * 0.5 + dx, 0.9, z + depth - 0.018], front);
    addBox(parent, [0.14, 0.035, 0.035], [x + width * 0.5 + dx, 0.91, z + depth + 0.016], steel);
  }
}

function makePlant(parent: THREE.Object3D, position: [number, number, number]) {
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.27, 12), new THREE.MeshStandardMaterial({ color: '#D7B889', roughness: 0.85 }));
  pot.position.set(...position);
  parent.add(pot);
  for (let i = 0; i < 6; i += 1) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), new THREE.MeshStandardMaterial({ color: i % 2 ? '#67945A' : '#85A96A', roughness: 0.7 }));
    const angle = (Math.PI * 2 * i) / 6;
    leaf.scale.set(0.65, 0.35, 1.4);
    leaf.position.set(position[0] + Math.cos(angle) * 0.22, position[1] + 0.39 + (i % 2) * 0.08, position[2] + Math.sin(angle) * 0.22);
    leaf.rotation.z = Math.cos(angle) * 0.7;
    parent.add(leaf);
  }
}

async function loadAssetModel(asset: number, height: number, width?: number, depth?: number) {
  const loaded = await loadAsync(asset);
  const model = (loaded.scene ?? loaded) as THREE.Group;
  const bounds = new THREE.Box3().setFromObject(model);
  const originalSize = bounds.getSize(new THREE.Vector3());
  const scale = height / (originalSize.y || 1);
  model.scale.set(scale, scale, scale);
  if (width && originalSize.x > 0) model.scale.x = width / originalSize.x;
  if (depth && originalSize.z > 0) model.scale.z = depth / originalSize.z;
  model.updateMatrixWorld(true);
  const scaledBounds = new THREE.Box3().setFromObject(model);
  const center = scaledBounds.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= scaledBounds.min.y;
  model.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) {
      object.castShadow = false;
      object.receiveShadow = false;
    }
  });
  return model;
}

function disposeGroup(group: THREE.Object3D) {
  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((entry) => entry?.dispose());
  });
}

function targetHeightFor(kind: LabItem['kind']) {
  switch (kind) {
    case 'microscope': return 1.08;
    case 'beaker': return 0.72;
    case 'flask': return 0.9;
    case 'bottle': return 0.86;
    case 'box': return 0.78;
    case 'centrifuge': return 0.88;
    case 'hotplate': return 0.42;
    default: return 0.8;
  }
}

function makeLabItem(item: LabItem, index: number, material: (color: string, roughness?: number, metalness?: number) => THREE.MeshStandardMaterial, steel: THREE.Material, dark: THREE.Material) {
  const group = new THREE.Group();
  const glass = (color: string) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.11, metalness: 0.04, transmission: 0.55, transparent: true, opacity: 0.6, thickness: 0.2, side: THREE.DoubleSide });
  const liquid = ['#42B7D2', '#9EDB58', '#F1CB58', '#A777D5'][index % 4];
  if (item.kind === 'beaker') {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.31, 0.78, 24, 1, true), glass('#E8FBF9'));
    body.position.y = 0.56;
    group.add(body);
    const fluid = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.285, 0.28, 24), material(liquid, 0.24));
    fluid.position.y = 0.4;
    group.add(fluid);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 8, 24), steel);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.96;
    group.add(rim);
    for (let i = 0; i < 3; i += 1) addBox(group, [0.1, 0.025, 0.018], [0.25, 0.72 - i * 0.11, 0.2], material('#6B888D', 0.4));
  } else if (item.kind === 'flask') {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 16), glass('#E8FBF9'));
    bulb.position.y = 0.48;
    bulb.scale.y = 0.92;
    group.add(bulb);
    const fluid = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 12), material(liquid, 0.22));
    fluid.position.y = 0.34;
    fluid.scale.y = 0.55;
    group.add(fluid);
    addCylinder(group, 0.13, 0.16, 0.48, [0, 0.95, 0], glass('#E8FBF9'));
    addCylinder(group, 0.16, 0.16, 0.08, [0, 1.22, 0], material('#607780'));
  } else if (item.kind === 'microscope') {
    addBox(group, [0.9, 0.13, 0.68], [0, 0.09, 0], material('#E7ECEA'));
    const foot = addBox(group, [0.34, 0.09, 0.42], [0, 0.19, 0.08], steel);
    foot.rotation.y = -0.22;
    const arm = addBox(group, [0.13, 0.84, 0.15], [0.02, 0.59, -0.08], dark);
    arm.rotation.z = -0.28;
    const barrel = addCylinder(group, 0.13, 0.16, 0.62, [-0.2, 0.97, -0.17], steel);
    barrel.rotation.z = -0.52;
    addCylinder(group, 0.12, 0.12, 0.18, [-0.37, 1.22, -0.17], dark);
    addBox(group, [0.45, 0.07, 0.36], [0.08, 0.39, 0.03], material('#A9D9E1', 0.3));
    addCylinder(group, 0.12, 0.12, 0.12, [0.08, 0.52, 0.03], material('#D5E8E7'));
  } else if (item.kind === 'laptop') {
    const base = addBox(group, [0.98, 0.09, 0.7], [0, 0.18, 0.12], dark);
    base.rotation.x = -0.06;
    const screen = addBox(group, [0.98, 0.72, 0.085], [0, 0.6, -0.19], material('#293B4A', 0.35, 0.28));
    screen.rotation.x = -0.18;
    addBox(group, [0.82, 0.53, 0.012], [0, 0.62, -0.14], material('#7FD1BD', 0.28));
    addBox(group, [0.5, 0.025, 0.03], [0, 0.61, -0.127], material('#EFFFC4', 0.4));
  } else if (item.kind === 'bottle') {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.27, 0.76, 24, 1, false), glass('#F9ECEA'));
    bottle.position.y = 0.5;
    group.add(bottle);
    addCylinder(group, 0.12, 0.15, 0.22, [0, 1, 0], glass('#F9ECEA'));
    addCylinder(group, 0.16, 0.16, 0.12, [0, 1.17, 0], material('#B94B55'));
    addBox(group, [0.34, 0.2, 0.025], [0, 0.5, 0.25], material('#F6F0D9'));
    addBox(group, [0.19, 0.025, 0.03], [0, 0.51, 0.27], material('#B94B55'));
  } else {
    addBox(group, [0.92, 0.17, 0.62], [0, 0.18, 0], material('#D8E0DC'));
    addBox(group, [0.82, 0.08, 0.54], [0, 0.3, 0], material('#C8B89A'));
    for (let i = 0; i < 7; i += 1) {
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.09 + (i % 3) * 0.025), material(i % 2 ? '#C6EFF1' : '#A9CDDD', 0.24, 0.16));
      crystal.position.set(-0.27 + (i % 4) * 0.18, 0.42 + (i % 2) * 0.04, -0.15 + Math.floor(i / 4) * 0.24);
      group.add(crystal);
    }
  }
  // A small platform keeps each prop visibly grounded and easy to tap.
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.08, 24), material('#DDE5E3', 0.45));
  pad.position.y = 0.045;
  pad.userData.labItemId = item.id;
  group.add(pad);
  return group;
}

function makeScientist(parent: THREE.Object3D, material: (color: string, roughness?: number, metalness?: number) => THREE.MeshStandardMaterial, dark: THREE.Material) {
  const coat = new THREE.Mesh(new THREE.CapsuleGeometry(0.31, 0.68, 4, 12), material('#F7F8F2'));
  coat.position.y = 0.92;
  parent.add(coat);
  const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.56, 0.08), material('#67C9D4'));
  shirt.position.set(0, 0.95, 0.28);
  parent.add(shirt);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), material('#D9A982'));
  head.position.y = 1.67;
  parent.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 10), dark);
  hair.position.set(0, 1.79, -0.015);
  hair.scale.set(1, 0.7, 1);
  parent.add(hair);
  for (const x of [-0.13, 0.13]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.48, 10), dark);
    leg.position.set(x, 0.27, 0);
    parent.add(leg);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.3), material('#384651'));
    boot.position.set(x, 0.08, 0.07);
    parent.add(boot);
  }
  for (const x of [-0.42, 0.42]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.45, 3, 8), material('#F1F3EE'));
    arm.position.set(x, 1.03, 0);
    arm.rotation.z = x < 0 ? -0.12 : 0.12;
    parent.add(arm);
  }
}

function inBench(x: number, z: number) {
  return (x > -2.85 && x < 2.85 && z > -1.95 && z < 0.22)
    || (z < -2.75 && Math.abs(x) < 3.45)
    || (x > 2.15 && x < 5.15 && z > 0.75 && z < 2.2);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#D7E4E6' },
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'space-between', paddingHorizontal: 15 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(18,12,51,.84)', borderWidth: 1, borderColor: 'rgba(255,255,255,.2)' },
  backArrow: { color: '#fff', fontSize: 36, lineHeight: 39, marginTop: -5, fontFamily: Fonts.regular },
  titlePill: { alignItems: 'center', backgroundColor: 'rgba(18,12,51,.82)', paddingHorizontal: 15, paddingVertical: 7, borderRadius: 14 },
  title: { color: Colors.lime, fontFamily: Fonts.bold, fontSize: 15, letterSpacing: 1.5 },
  subTitle: { color: '#D1CCE9', fontFamily: Fonts.medium, fontSize: 9, letterSpacing: 1.5 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(18,12,51,.76)', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 99 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#69E6A2' },
  liveText: { fontFamily: Fonts.bold, fontSize: 10, color: '#A7F0C8', letterSpacing: 1 },
  hint: { position: 'absolute', top: 98, left: 20, right: 20, alignItems: 'center' },
  hintText: { color: '#fff', backgroundColor: 'rgba(18,12,51,.76)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontFamily: Fonts.medium, fontSize: 12, textAlign: 'center', overflow: 'hidden' },
  selectedTag: { position: 'absolute', right: 17, top: 158, borderRadius: 9, backgroundColor: 'rgba(181,242,61,.93)', paddingHorizontal: 10, paddingVertical: 6 },
  selectedText: { color: '#24330E', fontFamily: Fonts.bold, fontSize: 9, letterSpacing: 0.8 },
  bottomControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  dpad: { alignItems: 'center', gap: 5 },
  dpadRow: { flexDirection: 'row', gap: 5 },
  dpadSpacer: { width: 48, height: 42 },
  moveButton: { width: 48, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(18,12,51,.82)', borderWidth: 1, borderColor: 'rgba(255,255,255,.2)' },
  movePressed: { backgroundColor: '#473D88', transform: [{ scale: 0.95 }] },
  moveText: { color: '#fff', fontFamily: Fonts.bold, fontSize: 18 },
  rotateRow: { marginTop: 2, flexDirection: 'row', gap: 10, alignItems: 'center' },
  rotateButton: { width: 36, height: 30, borderRadius: 10, backgroundColor: 'rgba(18,12,51,.76)', alignItems: 'center', justifyContent: 'center' },
  rotateText: { color: '#EAE5FF', fontSize: 19, lineHeight: 22 },
  moveLabel: { color: '#FFF', fontFamily: Fonts.bold, fontSize: 9, letterSpacing: 1.4, textShadowColor: '#140F2C', textShadowRadius: 5 },
  actionStack: { gap: 9, alignItems: 'flex-end', paddingBottom: 15 },
  actionButton: { minWidth: 90, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,.35)' },
  useButton: { backgroundColor: 'rgba(20,117,140,.93)' },
  pickButton: { backgroundColor: 'rgba(181,242,61,.96)' },
  actionText: { color: '#fff', fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 1 },
  disabled: { opacity: 0.42 },
});

