import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { CATALOG } from '../equipment/equipmentCatalog';
import { promptKey } from '../controls/keyMap';

function Chip({ k, children, primary = false }: { k?: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <span className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold shadow-hud backdrop-blur ${primary ? 'bg-white/95 text-lab-ink' : 'bg-black/55 text-white'}`}>
      {k && <span className={`kbd ${primary ? '' : '!border-white/30 !bg-white/15 !text-white !shadow-none'}`}>{k}</span>}
      {children}
    </span>
  );
}

/** Bottom-center prompt, e.g. "[E] Use Microscope", plus inspect/drop hints. */
export function InteractionPrompt() {
  const focus = useGameStore((s) => s.focus);
  const held = useInventoryStore((s) => s.held);
  const bindings = useSettingsStore((s) => s.bindings);
  const lookMode = useSettingsStore((s) => s.lookMode);
  const e = promptKey('interact', bindings, lookMode);
  const f = promptKey('inspect', bindings, lookMode);
  const q = promptKey('drop', bindings, lookMode);
  const key = focus ? `${focus.id}-${focus.verb}-${focus.label}` : held ? `held-${held.id}` : 'none';
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-20 flex justify-center px-4 sm:bottom-10" aria-live="polite">
      <AnimatePresence mode="wait">
        {(focus || held) && (
          <motion.div key={key} className="flex flex-wrap items-center justify-center gap-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.14 }}>
            {focus?.canUse && (
              <Chip k={e} primary>
                {focus.verb} {focus.label}
              </Chip>
            )}
            {focus && !focus.canUse && <Chip primary>{focus.label}</Chip>}
            {focus?.canInspect && <Chip k={f}>Inspect</Chip>}
            {focus?.canScroll && <Chip k="⇕">Scroll to adjust</Chip>}
            {focus?.canDrag && <Chip k={`Hold ${e}`}>+ drag</Chip>}
            {held && !focus && (
              <>
                <Chip k={q} primary>
                  Place {CATALOG[held.kind].name}
                </Chip>
                <Chip k={f}>Inspect</Chip>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
