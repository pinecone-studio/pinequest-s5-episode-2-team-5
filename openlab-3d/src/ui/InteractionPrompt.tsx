import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useChemStore } from '../store/useChemStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { CATALOG } from '../equipment/equipmentCatalog';
import { usePortableStore } from '../interaction/portable';
import { keyLabel, promptKey } from '../controls/keyMap';
import { describeUse } from '../interaction/actions';
import { interactables } from '../interaction/registry';

function Chip({ k, children, primary = false }: { k?: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <span className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold shadow-hud backdrop-blur ${primary ? 'bg-white/95 text-lab-ink' : 'bg-black/55 text-white'}`}>
      {k && <span className={`kbd ${primary ? '' : '!border-white/30 !bg-white/15 !text-white !shadow-none'}`}>{k}</span>}
      {children}
    </span>
  );
}

/** Bottom-center prompt, e.g. "[E] Бунзены горелк асаах", plus what R, Q, T and F do right now. */
export function InteractionPrompt() {
  const focus = useGameStore((s) => s.focus);
  const held = useInventoryStore((s) => s.held);
  const portable = usePortableStore((s) => s.held);
  // Re-render when the held or focused vessel's contents change (R may switch from pour to draw).
  useChemStore((s) => (held ? s.mixtures[held.id] : undefined));
  useChemStore((s) => (focus ? s.mixtures[focus.id] : undefined));
  const bindings = useSettingsStore((s) => s.bindings);
  const lookMode = useSettingsStore((s) => s.lookMode);
  const e = promptKey('interact', bindings, lookMode);
  const f = promptKey('inspect', bindings, lookMode);
  const q = promptKey('drop', bindings, lookMode);
  const g = keyLabel(bindings.grab[0]);
  const r = keyLabel(bindings.pour[0]);
  const t = keyLabel(bindings.throw[0]);
  const entry = focus ? interactables.get(focus.id) : undefined;
  const use = describeUse(held, entry?.useTarget ?? null);
  const key = focus ? `${focus.id}-${focus.verb}-${focus.label}-${use?.verb}-${focus.canStore}` : held ? `held-${held.id}-${use?.verb}` : 'none';
  const heldName = held ? (held.grip ? `${CATALOG[held.kind].name} (${CATALOG[held.grip.kind].name}-аар)` : CATALOG[held.kind].name) : '';
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-20 flex justify-center px-4 sm:bottom-10" aria-live="polite">
      <AnimatePresence mode="wait">
        {(focus || held || portable) && (
          <motion.div key={key} className="flex max-w-3xl flex-wrap items-center justify-center gap-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.14 }}>
            {focus?.canUse && (
              <Chip k={e} primary>
                {focus.label} {focus.verb}
              </Chip>
            )}
            {focus && !focus.canUse && <Chip primary>{focus.label}</Chip>}
            {use && <Chip k={r}>{use.verb}{use.continuous ? ' (дарсаар)' : ''}</Chip>}
            {portable && <><Chip k={q}>{portable.label} тавих</Chip><Chip k={r}>Чиглүүлж ашиглах</Chip></>}
            {held && focus?.canStore && <Chip k={q}>{focus.storeVerb ?? 'энд хийх'}</Chip>}
            {focus?.canGrab && <Chip k={g}>Авах</Chip>}
            {focus?.canInspect && <Chip k={f}>Ойроос харах</Chip>}
            {focus?.canScroll && <Chip k="⇕">Урсгал тохируулах</Chip>}
            {focus?.canDrag && <Chip k={e}>дарсаар чирэх</Chip>}
            {held && !focus && (
              <>
                <Chip k={q} primary>
                  {heldName} тавих
                </Chip>
                <Chip k={t}>Шидэх</Chip>
                <Chip k={f}>Ойроос харах</Chip>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
