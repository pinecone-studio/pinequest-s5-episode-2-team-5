/** Live equipment in the shared room; close-up is a camera convenience, never a lesson gate. */
import { useEffect, useLayoutEffect, useMemo, useRef, type ElementRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Box3, MOUSE, TOUCH, Raycaster, Sphere, Vector3, type PerspectiveCamera } from 'three';
import { SignText } from '../../world/furniture/Decor';
import { playerState, useGameStore } from '../../store/useGameStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { CATALOG } from '../../equipment/equipmentCatalog';
import { interactables, isVisibleInScene, localBounds, resolveInteractable, type InteractableEntry } from '../../interaction/registry';
import { benchUseTarget } from '../../interaction/benchUseTarget';
import { interactItem } from '../../interaction/interactItem';
import { endHeldUse } from '../../interaction/useHeld';
import { portableApi, usePortableStore } from '../../interaction/portable';
import { heldApi, tablePointer } from '../../interaction/heldApi';
import { useSettingsStore } from '../../store/useSettingsStore';
import { benchView, useBenchView } from './view';
import { experimentGuide } from './guidance';
import { BENCH_HEIGHT } from '../../utils/constants';
import { seedBenchChemistry } from './chemistry';
import { livePose } from '../../interaction/bodies';
import { createNaClEngine, type BenchVisual } from './engine';
import { useChemStore } from '../../store/useChemStore';
import { mixtureLook } from '../../chemistry/color';
import { bench } from './bench';
import { type PartKey } from './data';
import { Interactable } from '../../interaction/Interactable';
import { enterBench } from './bench';
import { useLabStore } from '../../store/useLabStore';
import { currentSession, itemPosition, updateStationVisibility, useWorkbench } from '../workbench/session';
import { experimentById } from '../../lab/experiments';
import { emitLab } from '../../lab/events';
import { crystalMass, describe, heldObjectId, labSpace, labUse, mixture, partId, partKey, simulateLab, useSandbox, warn } from './sandbox';

export const STATION_POSITION: [number, number, number] = [8.254, BENCH_HEIGHT, -14.585];
type Controls = ElementRef<typeof OrbitControls>;

export function NaClStation() {
  const active = useLabStore((s) => s.active);
  const engine = useMemo(() => createNaClEngine(), []);
  const inBench = useGameStore((s) => s.mode === 'bench');
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const controls = useRef<Controls>(null);
  const receiverMarker = useRef<import('three').Group>(null);
  const receiverBox = useMemo(() => new Box3(), []);
  const initialTarget = useMemo(() => new Vector3(STATION_POSITION[0] + 0.03, STATION_POSITION[1] + 0.075, STATION_POSITION[2]), []);
  const previousMode = useRef('');
  const motion = useRef<{ from: Vector3; to: Vector3; fromTarget: Vector3; toTarget: Vector3; elapsed: number; duration: number } | null>(null);
  const viewClock = useRef(0);
  const inspectReturn = useRef<{ position: Vector3; target: Vector3 } | null>(null);
  const inspecting = useBenchView((s) => s.inspecting);
  const take = (key: PartKey) => {
    // Taking from the stack supplies one sheet, not the entire stack.
    if (key === 'stack') key = 'paper';
    if (heldObjectId()) { warn('Эхлээд барьж буй зүйлээ Q дарж тавь. Дараа нь хүссэн багажийг ав.'); return; }
    if (!engine.partVisible(key)) return;
    const id = partId(key);
    tablePointer.lastPoint = engine.partPosition(key);
    tablePointer.active = false;
    if (key === 'paper') useSandbox.setState({ paperIn: false });
    if (key === 'lamp' && useSandbox.getState().lit) warn('Асаалттай дэнг зөөж байна! Зааврыг дагаж, R дарж унтраагаарай.');
    else if (mixture(id).temp > 50) warn('Халуун сав! Заавар ба халууныг анхаар. Зөөхийг хориглоогүй.');
    else warn('Багаж авлаа. Q: тавих · R дарж барих: цутгах / ашиглах.');
    usePortableStore.setState({ held: { id, label: engine.parts.find((p) => p.key === key)!.label, footprint: key === 'scope' ? 0.04 : 0.025,
      move: (bottom, yaw, tilt) => engine.movePart(key, bottom, yaw, tilt) } });
    useSandbox.setState({ heldId: id });
    const guide = experimentGuide();
    if (useLabStore.getState().active === 'nacl' && !guide.recommended.includes(id)) warn(`Дарааллын зөвлөгөө: ${guide.current.title}.`);
  };

  useEffect(() => {
    bench.engine = engine;
    engine.prepareFreePlay();
    seedBenchChemistry(useSandbox.getState().contents, false);
    updateStationVisibility();
    const entries: InteractableEntry[] = engine.parts.map(({ key, hit, label }) => {
      const id = partId(key);
      hit.userData.interactableId = id;
      const entry: InteractableEntry = { id, object: hit, label, verb: key === 'lamp' || key === 'scope' ? 'ашиглах' : 'авах', enabled: true, bounds: null, onInteract: () => { if (key === 'lamp' || key === 'scope') labUse.start(id); else take(key); }, onGrab: () => take(key) };
      interactables.set(id, entry);
      return entry;
    });
    return () => {
      labUse.end();
      if (usePortableStore.getState().held?.id.startsWith('nacl-')) usePortableStore.setState({ held: null });
      entries.forEach((entry) => { if (interactables.get(entry.id) === entry) interactables.delete(entry.id); });
      if (bench.engine === engine) bench.engine = null;
      queueMicrotask(() => { if (bench.engine !== engine) engine.dispose(); });
    };
    // Callbacks read the stores at invocation time rather than capturing held state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  useLayoutEffect(() => {
    const ctl = controls.current;
    engine.attach(camera, inBench ? ctl : null);
    if (!inBench || !ctl) return;
    const previous = { near: camera.near, fov: camera.fov, position: camera.position.clone(), rotation: camera.quaternion.clone() };
    camera.near = 0.001; camera.fov = 42; camera.updateProjectionMatrix();
    tablePointer.active = false;
    const move = (to: Vector3, target: Vector3, duration = 0.45) => {
      ctl.enabled = false;
      ctl.enableDamping = false;
      ctl.update();
      motion.current = { from: camera.position.clone(), to, fromTarget: ctl.target.clone(), toTarget: target, elapsed: 0, duration: useSettingsStore.getState().reducedMotion ? 0.001 : duration };
      useBenchView.setState({ moving: true });
    };
    const table = (fit = false) => {
      const target = engine.benchTarget();
      const distance = fit ? Math.max(1.35, 0.85 / Math.max(0.25, camera.aspect)) : Math.max(1.2, 0.65 / Math.max(0.4, camera.aspect));
      move(target.clone().add(new Vector3(0, 0.42, 1).normalize().multiplyScalar(distance)), target);
      useBenchView.setState({ level: 'table', selected: null });
      useSandbox.setState({ inspected: null });
    };
    benchView.table = () => table(false);
    benchView.overview = () => table(true);
    const focus = (id: string, duration = .45) => {
      const key = partKey(id);
      const entry = interactables.get(id);
      const liveHeld = heldObjectId() === id ? benchView.heldObject() : null;
      if (!key && !entry && !liveHeld) return;
      const held = useInventoryStore.getState().held;
      const kind = entry?.inspectKind ?? (held?.id === id ? held.kind : undefined);
      const definition = kind ? CATALOG[kind] : undefined;
      let box: Box3;
      if (key) box = engine.partBounds(key);
      else if (definition) {
        // Live models include large pooled gas/steam bounds. Frame the vessel and
        // its current foam, rather than letting invisible particles zoom us out.
        const at = liveHeld ? liveHeld.getWorldPosition(new Vector3()) : itemPosition(id);
        const foam = useChemStore.getState().mixtures[id]?.foam ?? 0;
        const height = definition.size[1] * (1 + Math.min(2, foam / Math.max(1, definition.capacityMl ?? 100)));
        const width = Math.max(definition.size[0], definition.size[2]);
        box = new Box3().setFromCenterAndSize(at.add(new Vector3(0, height / 2, 0)), new Vector3(width, height, width));
      } else box = new Box3().setFromObject(liveHeld ?? entry!.object);
      const target = box.getCenter(new Vector3());
      const size = box.getSize(new Vector3());
      const distance = Math.max(0.12, size.y / (2 * Math.tan(42 * Math.PI / 360)) * 1.3, size.x / (2 * Math.tan(42 * Math.PI / 360) * camera.aspect) * 1.2);
      move(target.clone().add(new Vector3(0, 0.06, 1).normalize().multiplyScalar(distance)), target, duration);
      useBenchView.setState({ selected: id, level: 'detail' });
      mixture(id);
      useSandbox.setState({ inspected: id, hovered: null });
      tablePointer.active = false;
    };
    benchView.focus = (id) => { if (useBenchView.getState().inspecting) benchView.back(); focus(id); };
    benchView.reaction = (id) => focus(id, .7);
    benchView.inspect = (id) => {
      if (!useBenchView.getState().inspecting) inspectReturn.current = { position: camera.position.clone(), target: ctl.target.clone() };
      endHeldUse();
      useBenchView.setState({ inspecting: true });
      focus(id);
    };
    benchView.back = () => {
      useBenchView.setState({ inspecting: false });
      const pose = inspectReturn.current; inspectReturn.current = null;
      if (pose) move(pose.position, pose.target, .35); else table();
    };
    benchView.setDistance = (distance) => {
      motion.current = null; ctl.enabled = true; ctl.enableDamping = true;
      const direction = camera.position.clone().sub(ctl.target).normalize();
      camera.position.copy(ctl.target).addScaledVector(direction, Math.max(0.018, Math.min(3.5, distance)));
      ctl.update();
      useBenchView.setState({ distance: ctl.getDistance(), moving: false });
    };
    benchView.zoom = (factor) => benchView.setDistance(ctl.getDistance() * factor);
    benchView.pan = (x, z) => {
      motion.current = null; ctl.enabled = true; ctl.enableDamping = true;
      const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion); right.y = 0; right.normalize();
      const forward = camera.getWorldDirection(new Vector3()); forward.y = 0; forward.normalize();
      const shift = right.multiplyScalar(x).add(forward.multiplyScalar(z)).multiplyScalar(Math.max(0.01, ctl.getDistance() * 0.18));
      camera.position.add(shift); ctl.target.add(shift); ctl.update();
      useBenchView.setState({ moving: false });
    };
    // Explicit target prevents OrbitControls from starting around the room origin.
    ctl.target.copy(engine.benchTarget());
    table();
    return () => {
      endHeldUse(); motion.current = null; inspectReturn.current = null; tablePointer.active = false;
      engine.attach(camera, null);
      camera.near = previous.near; camera.fov = previous.fov;
      camera.position.copy(previous.position); camera.quaternion.copy(previous.rotation); camera.updateProjectionMatrix();
      gl.domElement.style.cursor = '';
      useBenchView.setState({ moving: false });
    };
  }, [inBench, camera, engine, gl]);

  useEffect(() => {
    if (!inBench) return;
    const el = gl.domElement;
    let down: { x: number; y: number; id: number } | null = null;
    const pointers = new Set<number>();
    const ray = new Raycaster();
    const sphere = new Sphere();
    const point = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      tablePointer.ndc.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
      tablePointer.active = true;
      heldApi.refreshTarget();
      const key = engine.pick(tablePointer.ndc, partKey(heldObjectId() ?? '') ?? undefined);
      ray.setFromCamera(tablePointer.ndc, camera); ray.far = 3.5;
      let best: string | null = key ? partId(key) : null;
      let nearest = key ? ray.intersectObject(interactables.get(partId(key))!.object, false)[0]?.distance ?? ray.far : ray.far;
      for (const entry of interactables.values()) {
        if (!entry.inspectKind && entry.useTarget?.type !== 'item') continue;
        if (!entry.enabled || entry.id === heldObjectId() || entry.id.startsWith('nacl-') || !isVisibleInScene(entry.object)) continue;
        sphere.copy(localBounds(entry)).applyMatrix4(entry.object.matrixWorld);
        if (!ray.ray.intersectsSphere(sphere)) continue;
        for (const hit of ray.intersectObject(entry.object, true)) {
          if (hit.distance >= nearest || !isVisibleInScene(hit.object)) continue;
          const resolved = resolveInteractable(hit.object);
          if (resolved) { nearest = hit.distance; best = resolved.id; break; }
        }
      }
      return best;
    };
    const cancelMotion = () => {
      motion.current = null;
      if (controls.current) { controls.current.enabled = true; controls.current.enableDamping = true; }
      useBenchView.setState({ moving: false });
    };
    const onWheel = (e: WheelEvent) => {
      if (useWorkbench.getState().drawer) return;
      e.preventDefault(); e.stopImmediatePropagation(); cancelMotion();
      // Use the actual wheel distance, including trackpads, instead of one tiny
      // fixed zoom step regardless of the event's delta. Pinch/two-touch stays native.
      const pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);
      benchView.zoom(Math.exp(Math.max(-400,Math.min(400,pixels))*.0018));
    };
    const onDown = (e: PointerEvent) => {
      cancelMotion(); pointers.add(e.pointerId);
      if (e.button === 0 && pointers.size === 1) down = { x: e.clientX, y: e.clientY, id: e.pointerId };
      else down = null;
      point(e);
    };
    const onMove = (e: PointerEvent) => {
      const id = point(e);
      if (useSandbox.getState().hovered !== id) useSandbox.setState({ hovered: id });
      el.style.cursor = heldObjectId() ? (heldApi.target ? 'copy' : 'not-allowed') : id ? 'pointer' : 'grab';
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) down = null;
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (!useWorkbench.getState().drawer && !useBenchView.getState().inspecting && down?.id === e.pointerId && e.target === el && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) {
        const id = point(e);
        if (heldObjectId() && heldApi.target?.support) {
          if (usePortableStore.getState().held) portableApi.place(); else heldApi.place();
        } else if (id) {
          useSandbox.setState({ inspected: id, hovered: id });
          useBenchView.setState({ selected: id });
          if (!heldObjectId()) interactItem(id);
        } else if (heldObjectId()) {
          const placed = usePortableStore.getState().held ? portableApi.place() : heldApi.place();
          if (!placed) warn('Энэ цэгт тавих гадаргуу алга. Хулганаа ширээний хоосон хэсэг рүү зөөгөөд ногоон хүрээг хараад дар.');
        }
      }
      down = null;
    };
    const onLeave = () => { tablePointer.active = false; useSandbox.setState({ hovered: null }); };
    const onCancel = () => { down = null; pointers.clear(); endHeldUse(); };
    const noMenu = (e: Event) => e.preventDefault();
    el.addEventListener('pointerdown', onDown, true); el.addEventListener('pointermove', onMove); el.addEventListener('pointerleave', onLeave);
    el.addEventListener('wheel', onWheel, { capture: true, passive: false });
    el.addEventListener('contextmenu', noMenu);
    window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onCancel); window.addEventListener('blur', onCancel);
    return () => {
      onCancel(); el.removeEventListener('pointerdown', onDown, true); el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('wheel', onWheel, true); el.removeEventListener('contextmenu', noMenu);
      window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onCancel); window.removeEventListener('blur', onCancel);
    };
  }, [inBench, engine, gl, camera]);

  useFrame((_, rawDt) => {
    const ctl = controls.current;
    if (inBench && ctl && motion.current) {
      const t = motion.current; t.elapsed += Math.min(rawDt, 0.05);
      const k = Math.min(1, t.elapsed / t.duration); const eased = 1 - Math.pow(1 - k, 3);
      camera.position.lerpVectors(t.from, t.to, eased); ctl.target.lerpVectors(t.fromTarget, t.toTarget, eased); ctl.update();
      if (k === 1) { motion.current = null; ctl.enabled = true; ctl.enableDamping = true; useBenchView.setState({ moving: false }); }
    }
    viewClock.current += rawDt;
    if (inBench && ctl && viewClock.current > 0.1) { viewClock.current = 0; if (Math.abs(useBenchView.getState().distance - ctl.getDistance()) > .002) useBenchView.setState({ distance: ctl.getDistance() }); }
    const mode = useGameStore.getState().mode;
    const working = mode === 'bench' || (mode === 'walk' && (useSandbox.getState().near || !!heldObjectId()));
    if (previousMode.current !== mode) { if (!working) labUse.end(); previousMode.current = mode; }
    const near = Math.hypot(playerState.position.x - STATION_POSITION[0], playerState.position.z - STATION_POSITION[2]) < 2.4;
    if (useSandbox.getState().near !== near) useSandbox.setState({ near });
    updateStationVisibility();
    engine.root.updateWorldMatrix(true, true);
    if (receiverMarker.current) {
      const id = inBench && !inspecting && !useWorkbench.getState().drawer ? benchUseTarget() : null;
      const key = id ? partKey(id) : null;
      const object = id ? key ? engine.partObject(key) : interactables.get(id)?.object : null;
      receiverMarker.current.visible = !!object && isVisibleInScene(object);
      if (object && receiverMarker.current.visible) {
        receiverBox.setFromObject(object);
        const center = receiverBox.getCenter(new Vector3());
        const radius = Math.max(.016, Math.min(.09, (receiverBox.max.x - receiverBox.min.x) * .5 + .006));
        // The station group has world transforms: keep the small rim cue in world space via its parent.
        receiverMarker.current.position.copy(center).setY(receiverBox.max.y + .006);
        receiverMarker.current.parent?.worldToLocal(receiverMarker.current.position);
        receiverMarker.current.scale.setScalar(radius);
      }
    }

    engine.parts.forEach(({ key }) => {
      const entry = interactables.get(partId(key));
      if (entry) entry.enabled = engine.partVisible(key) && usePortableStore.getState().held?.id !== entry.id;
    });
    if (!working) { engine.guideMarkers([]); return; }
    const dt = Math.min(0.05, rawDt);
    const position = (id: string) => {
        const key = partKey(id);
        if (key) return engine.partPosition(key);
        if (useInventoryStore.getState().held?.id === id) return camera.position.clone().add(new Vector3(0, -0.2, -0.45).applyQuaternion(camera.quaternion));
        const item = useInventoryStore.getState().worldItems.find((x) => x.id === id);
        if (item) { const p = livePose(item); return new Vector3(p.x, p.y, p.z); }
        return itemPosition(id);
    };
    const distance = (a: string, b: string) => position(a).distanceTo(position(b));
    labSpace.distance = distance;
    labSpace.position = position;
    simulateLab(dt, distance);
    const state = useSandbox.getState();
    const values: Partial<Record<PartKey, BenchVisual>> = {};
    for (const [id, m] of Object.entries(state.contents)) {
      const key = partKey(id); if (key) values[key] = { volume: m.ml, crystals: crystalMass(m), solid: m.carbonate, color: mixtureLook(useChemStore.getState().mixtures[id]).liquid };
    }
    const reacting = state.reaction?.kind === 'acid' ? [state.reaction.id, mixture(state.reaction.id)] as const : null;
    engine.reactionOrigin(reacting ? position(reacting[0]) : null, reacting ? Math.min(0.1, reacting[1].ml / Math.max(1, describe(reacting[0]).capacity) * 0.1) : 0);
    engine.freeVisuals(values, state.lit, state.reaction?.kind === 'acid' ? Math.min(1, state.reaction.rate / 1.8) : 0, state.rx === 'evap' ? 0.7 : 0, state.rx, dt, state.paperIn);
    const from = labUse.source; const to = labUse.target;
    const flowing = !!from && !!to && describe(from).capacity > 0 && describe(to).capacity > 0 && mixture(from).ml > 0 && distance(from, to) < 1;
    engine.transferStream(flowing ? position(from!).add(new Vector3(0, 0.08, 0)) : null, flowing ? position(to!).add(new Vector3(0, 0.03, 0)) : null);
    if (state.paperIn && usePortableStore.getState().held?.id !== partId('paper')) {
      engine.movePart('paper', engine.partPosition('funnel').add(new Vector3(0, 0.05, 0)), 0);
    }
    if (state.scope && mixture(partId('slide')).salt > 0.001 && distance(partId('slide'), partId('scope')) < 0.2 && Math.abs(state.focus - 64) < 3 && !state.completed.includes('microscope')) {
      useSandbox.setState({ completed: [...state.completed, 'microscope'] });
      warn('NaCl: куб хэлбэртэй талст ажиглагдлаа. Цааш чөлөөтэй ажиллаж болно.');
    }
    const guide = experimentGuide();
    const progress = useLabStore.getState().progress.nacl ?? [];
    guide.steps.forEach((step, i) => {
      if (useLabStore.getState().active === 'nacl' && currentSession()?.ready && step.done && !progress.includes(`step-${i + 1}`)) emitLab({ key: `nacl:${step.letter}`, quiet: true });
    });
    const selected = useBenchView.getState().selected;
    const markerKeys = (inBench && useBenchView.getState().level === 'detail' && selected ? [selected] : guide.recommended).map(partKey).filter((key): key is PartKey => !!key);
    engine.guideMarkers(useLabStore.getState().active === 'nacl' && currentSession()?.ready ? markerKeys : []);
    engine.update(dt);
  });

  return (
    <group>
      <group position={STATION_POSITION}><primitive object={engine.root} /></group>
      <group name="bench-use-target" ref={receiverMarker} visible={false} userData={{ noOutline: true, noBatch: true }}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => undefined} renderOrder={10}>
          <ringGeometry args={[.87, 1, 48]} />
          <meshBasicMaterial color="#0284c7" transparent opacity={.9} depthWrite={false} depthTest={false} toneMapped={false} side={2} />
        </mesh>
      </group>
      <Interactable id="open-workbench" label="Ажлын ширээ" verb="суух" onInteract={() => enterBench()} highlight="none" position={[8.25, BENCH_HEIGHT, -14.5]}>
        <mesh><boxGeometry args={[1.6, .025, .8]} /><meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} /></mesh>
      </Interactable>
      <SignText text={active ? `Ажлын ширээ\n${experimentById(active)?.title ?? 'Туршилт олдсонгүй'}` : 'Ажлын ширээ\nТуршилт сонгоогүй байна'} color="#1e4db5" width={0.9} height={0.22} position={[8.3, 1.5, -14.885]} />
      {inBench && <OrbitControls ref={controls} target={initialTarget} enablePan={!inspecting} enableDamping dampingFactor={0.12} minDistance={0.018} maxDistance={3.5} minPolarAngle={0.12} maxPolarAngle={1.48}
        zoomSpeed={0.7} panSpeed={0.7} rotateSpeed={0.5} screenSpacePanning={false} zoomToCursor
        mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }} touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }} /> }
    </group>
  );
}
