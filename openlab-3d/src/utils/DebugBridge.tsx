/**
 * Development-only test hook (window.__lab): deterministic frame stepping and store access,
 * so automated checks work even when the browser throttles requestAnimationFrame.
 */
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Mesh, Raycaster, Vector2, Vector3 } from 'three';
import { playerApi, playerState, useGameStore } from '../store/useGameStore';
import { useExperimentStore } from '../store/useExperimentStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useLoadingStore } from '../store/useLoadingStore';
import { interactables } from '../interaction/registry';
import { sim } from '../experiment/millikanSim';

declare global {
  interface Window {
    __lab?: Record<string, unknown>;
  }
}

export function DebugBridge() {
  const get = useThree((s) => s.get);
  useEffect(() => {
    let t = 0;
    window.__lab = {
      game: useGameStore,
      experiment: useExperimentStore,
      inventory: useInventoryStore,
      settings: useSettingsStore,
      loading: useLoadingStore,
      player: playerState,
      interactables,
      sim,
      teleport: (x: number, z: number, yaw = 0) => playerApi.teleport(x, z, yaw),
      look: (yaw: number, pitch = 0) => {
        playerState.yaw = yaw;
        playerState.pitch = pitch;
      },
      setDpr: (v: number) => get().setDpr(v),
      /** Point the camera at a world position. */
      lookAt: (x: number, y: number, z: number) => {
        const eye = get().camera.position;
        const dx = x - eye.x;
        const dy = y - eye.y;
        const dz = z - eye.z;
        playerState.yaw = Math.atan2(-dx, -dz);
        playerState.pitch = Math.atan2(dy, Math.hypot(dx, dz));
      },
      /** Run `frames` frames of `dt` seconds synchronously (also renders). */
      step: (frames = 1, dt = 1 / 60) => {
        const state = get();
        const prev = state.frameloop;
        state.setFrameloop('never');
        t = state.clock.elapsedTime;
        for (let i = 0; i < frames; i++) {
          t += dt;
          state.advance(t);
        }
        state.setFrameloop(prev);
        return frames;
      },
      /** Describe what is under a screen point (NDC -1..1). */
      pick: (nx: number, ny: number) => {
        const { scene, camera } = get();
        const rc = new Raycaster();
        rc.setFromCamera(new Vector2(nx, ny), camera);
        return rc
          .intersectObjects(scene.children, true)
          .filter((h) => h.object.visible)
          .slice(0, 4)
          .map((h) => {
            const o = h.object;
            const chain: string[] = [];
            let p = o.parent;
            while (p && chain.length < 6) {
              const id = (p.userData as { interactableId?: string }).interactableId;
              chain.push(id ?? p.type);
              p = p.parent;
            }
            const mat = o instanceof Mesh && !Array.isArray(o.material) ? (o.material as { color?: { getHexString: () => string } }) : null;
            return { type: o.type, geo: o instanceof Mesh ? o.geometry.type : '', color: mat?.color?.getHexString(), dist: +h.distance.toFixed(2), at: h.point.toArray().map((v) => +v.toFixed(2)), world: o.getWorldPosition(new Vector3()).toArray().map((v) => +v.toFixed(2)), chain };
          });
      },
      /** Draw calls / triangles for one full frame (all passes). */
      info: () => {
        const state = get();
        const info = state.gl.info;
        info.autoReset = false;
        info.reset();
        const prev = state.frameloop;
        state.setFrameloop('never');
        t = state.clock.elapsedTime + 1 / 60;
        state.advance(t);
        state.setFrameloop(prev);
        const out = { calls: info.render.calls, triangles: info.render.triangles, programs: info.programs?.length, geometries: info.memory.geometries, textures: info.memory.textures };
        info.autoReset = true;
        return out;
      },
    };
    return () => {
      delete window.__lab;
    };
  }, [get]);
  return null;
}
