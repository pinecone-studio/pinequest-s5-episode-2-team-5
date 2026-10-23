/** Inspect current contents independently of any earlier reaction episode. */
import { atom, ion, solid, type ReactionObservation } from '../chemistry/reaction-view';
import type { AqId, SolidId } from '../chemistry/species';
import { mixtureOf } from '../store/useChemStore';
import { describe } from '../experiments/nacl/sandbox';
import { useInventoryStore } from '../store/useInventoryStore';
import { interactables } from '../interaction/registry';

export function vesselObservation(id: string): ReactionObservation {
  const inv = useInventoryStore.getState();
  const item = inv.held?.id === id ? inv.held : inv.worldItems.find((w) => w.id === id);
  const target = interactables.get(id)?.useTarget;
  const m = mixtureOf(id, item?.variant ?? (target?.type === 'item' ? target.variant : undefined));
  const species = [...Object.entries(m.aq).filter(([, n]) => n > 1e-10).map(([key]) => ion(key as AqId)),
    ...Object.entries(m.s).filter(([, n]) => n > 1e-10).map(([key]) => solid(key as SolidId))];
  if (m.water > 0) species.unshift(atom('H2O', 'Ус', 'H₂O', '#ef3038'));
  if (m.ethanol > 0) species.push(atom('ethanol', 'Этанол', 'C₂H₅OH', '#ffffff'));
  return { preset: 'generic', key: `contents:${id}`, reactants: species, products: [], rate: 0, info: true, temp: m.temp,
    equation: `${describe(id).label} · Сав доторх бодисууд`,
    sentence: species.length ? 'Одоогийн агуулгын молекул, ион болон хатуу бодисын бүтцийг сонгон харна уу.' : 'Энэ сав одоогоор хоосон байна.', effect: 'water' };
}
