/**
 * Bright, even indoor lighting:
 *  - hemisphere light (sky #ffffff, ground #b0b4b8)
 *  - one shadow-casting directional light framed on the Physics Lab (hero room)
 *  - a locally rendered environment map (drei <Environment> + <Lightformer>s) for
 *    glass and metal reflections. The "apartment" preset would download an HDR file
 *    from a CDN, so an equivalent studio-style setup is built in-scene instead.
 */
import { useEffect, useRef } from 'react';
import { Environment, Lightformer } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import type { DirectionalLight } from 'three';
import { QUALITY_PRESETS, useSettingsStore } from '../store/useSettingsStore';

export function Lighting() {
  const quality = useSettingsStore((s) => s.quality);
  const preset = QUALITY_PRESETS[quality];
  const sun = useRef<DirectionalLight>(null);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const light = sun.current;
    if (!light) return;
    light.target.position.set(-12, 0, -9);
    scene.add(light.target);
    light.target.updateMatrixWorld();
    return () => {
      scene.remove(light.target);
    };
  }, [scene]);

  return (
    <>
      <hemisphereLight args={['#ffffff', '#b0b4b8', 0.62]} />
      <ambientLight intensity={0.05} />
      <directionalLight
        ref={sun}
        position={[-23, 11, -5]}
        intensity={0.95}
        color="#fff6ea"
        castShadow={preset.shadows}
        shadow-mapSize-width={preset.shadowMapSize}
        shadow-mapSize-height={preset.shadowMapSize}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={4}
      />
      <Environment resolution={128} frames={1} background={false} environmentIntensity={0.5}>
        <color attach="background" args={['#dfe3e8']} />
        {/* Ceiling panels. */}
        <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[12, 6, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[6, 6, 5]} rotation={[Math.PI / 2, 0, 0]} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[-6, 6, -5]} rotation={[Math.PI / 2, 0, 0]} scale={[6, 3, 1]} />
        {/* Windows: cool daylight from one side, warm bounce from the other. */}
        <Lightformer form="rect" intensity={1.6} color="#d8ecff" position={[-9, 2, 0]} rotation={[0, Math.PI / 2, 0]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={0.7} color="#fff1df" position={[9, 2, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[10, 3, 1]} />
        <Lightformer form="ring" intensity={0.8} color="#ffffff" position={[0, 1.5, 9]} scale={3} />
      </Environment>
    </>
  );
}
