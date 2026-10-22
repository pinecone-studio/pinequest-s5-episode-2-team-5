/**
 * Pouring and mixing (R): pour the held vessel into the focused one, or — with an empty
 * hand-held vessel — draw liquid from the focused one. Contents are mixed, reactions
 * are applied and the result is reported in Mongolian.
 */
import { CATALOG, isContainer, type EquipmentKind } from '../equipment/equipmentCatalog';
import { SUBSTANCES, mergeContents, react, summarizeContents, takePortion, totalMl, type Contents } from '../chemistry/substances';
import { useExperimentStore } from '../store/useExperimentStore';
import { useGameStore } from '../store/useGameStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { sounds } from '../utils/sounds';
import type { ItemVariant } from '../world/itemsLayout';

interface Vessel {
  id: string;
  kind: EquipmentKind;
  variant?: ItemVariant;
  contents: Contents;
}

const EMPTY = 0.01;

function toast(title: string, subtitle?: string): void {
  useGameStore.getState().showToast(title, subtitle);
}

function portionFor(kind: EquipmentKind): number {
  return Math.max(5, Math.round((CATALOG[kind].capacityMl ?? 0) * 0.1));
}

function announce(ml: number, src: Vessel, dst: Vessel, result: Contents, events: { title: string; detail: string }[]): void {
  const game = useGameStore.getState();
  const mixed = new Set([...dst.contents, ...src.contents].map((c) => c.id)).size > 1;
  sounds.play('pour');
  if (events.length > 0) {
    window.setTimeout(() => sounds.play('fizz', 0.8), 350);
    toast(events[0].title, events[0].detail);
    game.logEvent(`${events.map((e) => e.detail).join(' ')} (${summarizeContents(result)})`);
    game.say(events[0].detail, 'happy');
  } else {
    toast(`${Math.round(ml * 10) / 10} мл асгалаа`, `${CATALOG[dst.kind].name}: ${summarizeContents(result)}`);
    game.logEvent(`${CATALOG[src.kind].name}-аас ${CATALOG[dst.kind].name} руу ${Math.round(ml * 10) / 10} мл асгалаа.`);
  }
  if (events.length > 0 || mixed) useExperimentStore.getState().markSkill('mix');
}

/** R on a vessel: pour the held one into it, or fill the empty held one from it. */
export function pourWith(targetId: string): void {
  const inv = useInventoryStore.getState();
  const held = inv.held;
  const target = inv.worldItems.find((w) => w.id === targetId);
  if (!held || !target) {
    toast('Гартаа сав барь', 'Эхлээд аяга, колб зэрэг савыг аваад (E) өөр сав руу хараад R дар');
    return;
  }
  if (!isContainer(held.kind) || !isContainer(target.kind)) {
    toast('Энэ саванд асгах боломжгүй');
    return;
  }
  const a: Vessel = { id: held.id, kind: held.kind, variant: held.variant, contents: held.variant?.contents ?? [] };
  const b: Vessel = { id: target.id, kind: target.kind, variant: target.variant, contents: target.variant?.contents ?? [] };
  const heldHasLiquid = totalMl(a.contents) > EMPTY;
  const [src, dst] = heldHasLiquid ? [a, b] : [b, a];
  if (totalMl(src.contents) <= EMPTY) {
    toast('Хоёр сав хоосон байна', 'Бодистой лонх эсвэл колб руу хараад дахин оролд');
    return;
  }
  if (dst.kind === 'reagentBottle') {
    toast('Урвалжийн лонх руу бүү асга', 'Бодис бохирдоно. Лонхноос л авч хэрэглэ');
    return;
  }
  const room = (CATALOG[dst.kind].capacityMl ?? 0) - totalMl(dst.contents);
  const ml = Math.min(portionFor(dst.kind), totalMl(src.contents), room);
  if (ml < 0.5) {
    toast('Хүлээн авах сав дүүрсэн байна');
    return;
  }
  const { taken, rest } = takePortion(src.contents, ml);
  const { contents, events } = react(mergeContents(dst.contents, taken));
  inv.setVariant(src.id, { ...src.variant, contents: rest });
  inv.setVariant(dst.id, { ...dst.variant, contents });
  announce(ml, src, dst, contents, events);
}

/** R on the sink: fill an empty held vessel with water, or pour a used one away. */
export function sinkPour(): void {
  const inv = useInventoryStore.getState();
  const held = inv.held;
  if (!held || !isContainer(held.kind) || held.kind === 'reagentBottle') {
    toast('Гартаа аяга эсвэл колб барь', 'Усаар дүүргэх эсвэл хоослохын тулд сав хэрэгтэй');
    return;
  }
  const contents = held.variant?.contents ?? [];
  if (totalMl(contents) > EMPTY) {
    inv.setVariant(held.id, { ...held.variant, contents: [] });
    sounds.play('pour');
    toast('Сав хоосорлоо', 'Хаягдлыг угаалтуурт асгалаа');
    useGameStore.getState().logEvent(`${CATALOG[held.kind].name}-ийн агуулгыг угаалтуурт асгалаа.`);
    return;
  }
  const ml = Math.round((CATALOG[held.kind].capacityMl ?? 0) * 0.4);
  inv.setVariant(held.id, { ...held.variant, contents: [{ id: 'water', ml }] });
  sounds.play('pour');
  toast(`${ml} мл ${SUBSTANCES.water.name.toLowerCase()} авлаа`, CATALOG[held.kind].name);
}
