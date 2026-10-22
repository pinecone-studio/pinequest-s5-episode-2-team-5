/**
 * Renders an equipment model centered at the origin and moves the current camera so the
 * model's bounding sphere fills the view. Used by the inspect view and Tools thumbnails.
 */
import { useLayoutEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Box3, Sphere, Vector3, type Group, type PerspectiveCamera } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { EquipmentKind } from './equipmentCatalog';
import type { ItemVariant } from '../world/itemsLayout';
import type { Mixture } from '../chemistry/mixture';
import type { ToolState } from '../store/useChemStore';
import { EquipmentModel } from './registry';

const DEFAULT_DIR = new Vector3(0.55, 0.42, 0.85).normalize();

export function FittedModel({
  kind,
  variant,
  mixture,
  tool,
  fill = 1.08,
  direction = DEFAULT_DIR,
  decorative = !mixture,
}: {
  kind: EquipmentKind;
  variant?: ItemVariant;
  mixture?: Mixture;
  tool?: ToolState;
  fill?: number;
  direction?: Vector3;
  decorative?: boolean;
}) {
  const inner = useRef<Group>(null);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  useLayoutEffect(() => {
    const fit = () => {
      const g = inner.current;
      if (!g) return;
      g.position.set(0, 0, 0);
      g.updateWorldMatrix(true, true);
      const sphere = new Box3().setFromObject(g).getBoundingSphere(new Sphere());
      if (!Number.isFinite(sphere.radius) || sphere.radius <= 0) return;
      // Measured in world space; convert to the parent's frame (it may be rotating).
      const center = sphere.center.clone();
      g.parent?.worldToLocal(center);
      g.position.copy(center).multiplyScalar(-1);
      const dist = (sphere.radius / Math.sin(((camera.fov / 2) * Math.PI) / 180)) * fill;
      camera.position.copy(direction).multiplyScalar(dist);
      camera.lookAt(0, 0, 0);
      camera.near = dist / 200;
      camera.far = dist * 20;
      camera.updateProjectionMatrix();
      if (controls) {
        controls.target.set(0, 0, 0);
        controls.minDistance = dist * 0.35;
        controls.maxDistance = dist * 2.5;
        controls.update();
      }
    };
    fit();
    // Text glyphs and batching settle a few frames later; refit then.
    const a = window.setTimeout(fit, 250);
    const b = window.setTimeout(fit, 900);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [kind, camera, controls, fill, direction]);
  return (
    <group ref={inner}>
      <EquipmentModel kind={kind} variant={variant} mixture={mixture} tool={tool} decorative={decorative} upright />
    </group>
  );
}
