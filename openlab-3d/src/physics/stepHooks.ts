/** Per-substep callbacks shared by the renderer and physics-independent controllers. */
export const preStepHooks = new Set<(dt: number) => void>();
