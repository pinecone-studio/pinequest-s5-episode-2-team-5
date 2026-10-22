/** Prepared-slide box: 100 × 80 × 30 mm plastic box with a hinged lid showing 5 glass slides. */
import { useLayoutEffect, useRef } from 'react';
import { BoxGeometry, InstancedMesh, Object3D } from 'three';
import { plastic } from '../materials/plastic';
import { useGlass } from '../materials/glass';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';

const slide = lazy(() => new BoxGeometry(0.076, 0.026, 0.0012));

export function SlideBox({ modelUrl, ...props }: ModelProps) {
  const glass = useGlass('#f3f9fb');
  const slides = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const d = new Object3D();
    for (let i = 0; i < 5; i++) {
      d.position.set(0, 0.016, -0.028 + i * 0.014);
      d.updateMatrix();
      slides.current?.setMatrixAt(i, d.matrix);
    }
    if (slides.current) {
      slides.current.instanceMatrix.needsUpdate = true;
      slides.current.computeBoundingSphere();
    }
  }, []);
  const shell = plastic('#3b82f6', 0.5);
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh material={shell} position={[0, 0.003, 0]} castShadow>
        <boxGeometry args={[0.1, 0.006, 0.08]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`x${s}`} material={shell} position={[s * 0.048, 0.015, 0]}>
          <boxGeometry args={[0.004, 0.024, 0.08]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`z${s}`} material={shell} position={[0, 0.015, s * 0.038]}>
          <boxGeometry args={[0.1, 0.024, 0.004]} />
        </mesh>
      ))}
      <instancedMesh ref={slides} args={[slide(), glass, 5]} userData={{ noOutline: true }} />
      {/* Open lid leaning back. */}
      <mesh material={shell} position={[0, 0.045, -0.052]} rotation={[-1.25, 0, 0]}>
        <boxGeometry args={[0.1, 0.08, 0.004]} />
      </mesh>
    </ModelOr>
  );
}
