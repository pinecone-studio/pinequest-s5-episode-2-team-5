import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const StarGuidance = createContext<{
  host: HTMLDivElement | null;
  setHost: (host: HTMLDivElement | null) => void;
}>({ host: null, setHost: () => undefined });

/** Keep the existing procedure engines mounted while Star's speech box is collapsed. */
export function StarGuidanceProvider({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const value = useMemo(() => ({ host, setHost }), [host]);
  return <StarGuidance.Provider value={value}>{children}</StarGuidance.Provider>;
}

export function StarInstructions({ children, priority = 'lesson' }: {
  children: ReactNode;
  priority?: 'lesson' | 'checklist' | 'demo' | 'tour' | 'action';
}) {
  const { host } = useContext(StarGuidance);
  return host ? createPortal(<div data-star-instruction={priority}>{children}</div>, host) : null;
}

export function StarInstructionHost({ fallback, notice, urgent }: {
  fallback: ReactNode;
  notice?: ReactNode;
  urgent?: boolean;
}) {
  const { setHost } = useContext(StarGuidance);
  return <div ref={setHost} className="star-guidance space-y-2">
    {notice && <div data-star-notice data-star-urgent={urgent || undefined}>{notice}</div>}
    <div data-star-fallback>{fallback}</div>
  </div>;
}
