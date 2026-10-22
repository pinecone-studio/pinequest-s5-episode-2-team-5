import { Fragment, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal, type GroupProps } from '@react-three/fiber';
import { Outlines } from '@react-three/drei';
import { InstancedMesh, Mesh, type Group, type Object3D } from 'three';
import { useGameStore } from '../store/useGameStore';
import type { EquipmentKind } from '../equipment/equipmentCatalog';
import { interactables, type InteractableEntry } from './registry';

export interface InteractableProps extends Omit<GroupProps, 'children' | 'onWheel' | 'id'> {
  id: string;
  label: string;
  /** Verb shown in the prompt: "[E] <verb> <label>". */
  verb?: string;
  enabled?: boolean;
  /** Enables F-inspect using this catalog model. */
  inspectKind?: EquipmentKind;
  onInteract?: () => void;
  onDrag?: (dx: number, dy: number) => void;
  onDragEnd?: () => void;
  onWheel?: (direction: number) => void;
  /** 'outline' draws a white hull around every mesh while focused. */
  highlight?: 'outline' | 'none';
  children: ReactNode;
}

/**
 * Wraps any 3D content and makes it focusable by the center-screen raycast.
 * The latest callbacks are kept in a registry entry, so re-renders are cheap.
 */
export function Interactable({
  id,
  label,
  verb = 'ашиглах',
  enabled = true,
  inspectKind,
  onInteract,
  onDrag,
  onDragEnd,
  onWheel,
  highlight = 'outline',
  children,
  ...props
}: InteractableProps) {
  const ref = useRef<Group>(null);
  const entryRef = useRef<InteractableEntry | null>(null);

  useLayoutEffect(() => {
    const object = ref.current;
    if (!object) return;
    const entry: InteractableEntry = { id, object, label, verb, enabled, inspectKind, onInteract, onDrag, onDragEnd, onWheel, bounds: null };
    entryRef.current = entry;
    interactables.set(id, entry);
    return () => {
      if (interactables.get(id) === entry) interactables.delete(id);
      const focus = useGameStore.getState().focus;
      if (focus?.id === id) useGameStore.getState().setFocus(null);
    };
    // Registration is keyed by id only; the effect below keeps the fields current.
  }, [id]);

  useLayoutEffect(() => {
    const entry = entryRef.current;
    if (!entry) return;
    entry.label = label;
    entry.verb = verb;
    entry.enabled = enabled;
    entry.inspectKind = inspectKind;
    entry.onInteract = onInteract;
    entry.onDrag = onDrag;
    entry.onDragEnd = onDragEnd;
    entry.onWheel = onWheel;
  });

  const focused = useGameStore((s) => s.focus?.id === id);

  return (
    <group ref={ref} userData={{ interactableId: id }} {...props}>
      {children}
      {focused && highlight === 'outline' && <FocusOutline target={ref} />}
    </group>
  );
}

function isTroikaText(o: Object3D): boolean {
  return typeof (o as unknown as { sync?: unknown }).sync === 'function' && 'text' in o;
}

function outlineCandidates(root: Object3D): Mesh[] {
  const list: Mesh[] = [];
  root.traverse((o) => {
    if (!(o instanceof Mesh) || o instanceof InstancedMesh) return;
    if ((o.userData as { noOutline?: boolean; isOutline?: boolean }).noOutline) return;
    if (isTroikaText(o)) return;
    if (!o.geometry.getAttribute('normal')) return;
    // Skip hull meshes created by <Outlines> itself.
    if (o.parent && (o.parent.userData as { isOutline?: boolean }).isOutline) return;
    list.push(o);
  });
  return list;
}

/** White outline on every mesh of the focused object (drei <Outlines> portalled into each mesh). */
function FocusOutline({ target }: { target: RefObject<Group> }) {
  const [meshes, setMeshes] = useState<Mesh[]>([]);
  useLayoutEffect(() => {
    if (target.current) setMeshes(outlineCandidates(target.current));
  }, [target]);
  return (
    <>
      {meshes.map((mesh) => (
        <Fragment key={mesh.uuid}>
          {createPortal(
            <Outlines userData={{ isOutline: true }} thickness={3.2} color="#ffffff" screenspace={false} toneMapped={false} angle={Math.PI} />,
            mesh,
          )}
        </Fragment>
      ))}
    </>
  );
}
