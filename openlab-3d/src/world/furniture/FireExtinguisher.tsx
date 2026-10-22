/**
 * CO₂ fire extinguisher (Ø 0.15 m × 0.62 m): red cylinder, chrome valve and lever
 * handle, safety pin, black hose (TubeGeometry) to a discharge horn.
 * <WallExtinguisher> adds the wall bracket and a sign, and makes it inspectable.
 */
import { useMemo } from 'react';
import type { GroupProps } from '@react-three/fiber';
import { CatmullRomCurve3, LatheGeometry, MeshStandardMaterial, TubeGeometry, Vector2, Vector3 } from 'three';
import { metalChrome, metalDark, metalRed } from '../../materials/metal';
import { rubberBlack, plasticBlack } from '../../materials/plastic';
import { Interactable } from '../../interaction/Interactable';
import { SignText } from './Decor';
import { lazy } from '../../utils/lazy';
import { ModelOr } from '../../equipment/ModelOr';

const bodyGeometry = lazy(() => {
  const pts: Vector2[] = [new Vector2(0, 0), new Vector2(0.07, 0), new Vector2(0.076, 0.012), new Vector2(0.076, 0.47), new Vector2(0.07, 0.51), new Vector2(0.045, 0.535), new Vector2(0.022, 0.545), new Vector2(0, 0.545)];
  return new LatheGeometry(pts, 28);
});
const hornGeometry = lazy(() => {
  const pts = [new Vector2(0.008, 0), new Vector2(0.012, 0.02), new Vector2(0.03, 0.16), new Vector2(0.036, 0.2)];
  return new LatheGeometry(pts, 18);
});

const redSign = new MeshStandardMaterial({ color: '#d31f1f', roughness: 0.5 });
const labelWhite = new MeshStandardMaterial({ color: '#f5f5f5', roughness: 0.6 });

export function FireExtinguisherModel({ modelUrl, ...props }: GroupProps & { modelUrl?: string }) {
  const hose = useMemo(
    () =>
      new TubeGeometry(
        new CatmullRomCurve3([new Vector3(0.03, 0.56, 0.0), new Vector3(0.08, 0.5, 0.04), new Vector3(0.1, 0.32, 0.07), new Vector3(0.09, 0.18, 0.08), new Vector3(0.06, 0.1, 0.085)]),
        28,
        0.008,
        8,
        false,
      ),
    [],
  );
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={bodyGeometry()} material={metalRed} castShadow />
      <mesh material={plasticBlack} position={[0, 0.0, 0]}>
        <cylinderGeometry args={[0.072, 0.072, 0.012, 24]} />
      </mesh>
      {/* Valve and handles. */}
      <mesh material={metalChrome} position={[0, 0.57, 0]}>
        <cylinderGeometry args={[0.02, 0.024, 0.05, 14]} />
      </mesh>
      <mesh material={metalChrome} position={[-0.03, 0.6, 0]} rotation={[0, 0, 0.18]}>
        <boxGeometry args={[0.11, 0.012, 0.03]} />
      </mesh>
      <mesh material={metalDark} position={[-0.035, 0.62, 0]} rotation={[0, 0, 0.42]}>
        <boxGeometry args={[0.12, 0.01, 0.026]} />
      </mesh>
      <mesh material={metalChrome} position={[0.015, 0.6, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.012, 0.0025, 6, 16]} />
      </mesh>
      <mesh geometry={hose} material={rubberBlack} />
      <mesh geometry={hornGeometry()} material={rubberBlack} position={[0.06, 0.1, 0.085]} rotation={[Math.PI, 0, 0]} />
      {/* Label band. */}
      <mesh material={labelWhite} position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.0765, 0.0765, 0.12, 28, 1, true]} />
      </mesh>
    </ModelOr>
  );
}

export function WallExtinguisher({ id, position, rotY = 0 }: { id: string; position: [number, number, number]; rotY?: number }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh material={metalDark} position={[0, 0.85, 0.02]}>
        <boxGeometry args={[0.08, 0.12, 0.04]} />
      </mesh>
      <Interactable id={id} label="Гал унтраагуур" verb="шалгах" inspectKind="fireExtinguisher">
        <FireExtinguisherModel position={[0, 0.4, 0.1]} />
      </Interactable>
      <group position={[0, 1.38, 0.01]}>
        <mesh material={redSign}>
          <boxGeometry args={[0.26, 0.32, 0.01]} />
        </mesh>
        <SignText text={'ГАЛ\nУНТРААГУУР'} width={0.24} height={0.1} position={[0, -0.09, 0.006]} />
        <mesh material={labelWhite} position={[0, 0.05, 0.006]}>
          <circleGeometry args={[0.07, 3]} />
        </mesh>
      </group>
    </group>
  );
}
