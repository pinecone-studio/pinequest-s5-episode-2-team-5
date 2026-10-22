/**
 * Every equipment component renders through <ModelOr>: when a `modelUrl` is supplied the
 * procedural model is replaced by a GLTF loaded with useGLTF, otherwise the children
 * (the procedural model) are rendered. This keeps a drop-in path to authored assets.
 */
import { Suspense, useMemo, type ReactNode } from 'react';
import type { GroupProps } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { StaticBatch } from '../world/StaticBatch';

export interface ModelProps extends GroupProps {
  /** Optional GLTF/GLB to use instead of the procedural model. */
  modelUrl?: string;
}

function GltfModel({ url, ...props }: GroupProps & { url: string }) {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => scene.clone(true), [scene]);
  return (
    <group {...props}>
      <primitive object={clone} />
    </group>
  );
}

export function ModelOr({ modelUrl, children, ...props }: ModelProps & { children?: ReactNode }) {
  if (modelUrl) {
    return (
      <Suspense fallback={null}>
        <GltfModel url={modelUrl} {...props} />
      </Suspense>
    );
  }
  // Procedural models are many small meshes: batch the static ones per material.
  return (
    <group {...props}>
      <StaticBatch>{children}</StaticBatch>
    </group>
  );
}
