/** Maps a catalog kind (+ optional variant) to its procedural 3D model component. */
import type { GroupProps } from '@react-three/fiber';
import { CATALOG, type EquipmentKind } from './equipmentCatalog';
import type { ItemVariant } from '../world/itemsLayout';
import { SUBSTANCES, contentsColor, totalMl } from '../chemistry/substances';
import { Beaker } from './Beaker';
import { ErlenmeyerFlask } from './ErlenmeyerFlask';
import { TestTube } from './TestTube';
import { TestTubeRack } from './TestTubeRack';
import { GraduatedCylinder } from './GraduatedCylinder';
import { ReagentBottle } from './ReagentBottle';
import { BunsenBurner } from './BunsenBurner';
import { Pipette } from './Pipette';
import { Scale } from './Scale';
import { Thermometer } from './Thermometer';
import { Goggles } from './Goggles';
import { Spatula } from './Spatula';
import { Tongs } from './Tongs';
import { GlassRod } from './GlassRod';
import { Funnel } from './Funnel';
import { WashBottle } from './WashBottle';
import { WatchGlass } from './WatchGlass';
import { PetriDish } from './PetriDish';
import { EvaporatingDish } from './EvaporatingDish';
import { VolumetricFlask } from './VolumetricFlask';
import { TestTubeHolder } from './TestTubeHolder';
import { Mortar } from './Mortar';
import { FireExtinguisherModel } from '../world/furniture/FireExtinguisher';

export interface EquipmentModelProps extends GroupProps {
  kind: EquipmentKind;
  variant?: ItemVariant;
  /** Bunsen burner flame. */
  lit?: boolean;
  /** Balance display. */
  reading?: string;
}

/** Liquid color and fill level (0..1) for a vessel, derived from its contents when it has any. */
export function variantLook(kind: EquipmentKind, variant?: ItemVariant): { liquid?: string; fill?: number } {
  const capacity = CATALOG[kind].capacityMl;
  if (variant?.contents && capacity) {
    const total = totalMl(variant.contents);
    return total > 0 ? { liquid: contentsColor(variant.contents), fill: Math.min(1, Math.max(0.05, total / capacity)) } : { fill: 0 };
  }
  return { liquid: variant?.liquid, fill: variant?.fill };
}

export function EquipmentModel({ kind, variant, lit, reading, ...props }: EquipmentModelProps) {
  const look = variantLook(kind, variant);
  const liquid = look.liquid;
  const fill = (fallback: number) => look.fill ?? (liquid ? fallback : 0);
  switch (kind) {
    case 'beaker':
      return <Beaker liquidColor={liquid} fill={fill(0.5)} {...props} />;
    case 'erlenmeyer':
      return <ErlenmeyerFlask liquidColor={liquid} fill={fill(0.4)} {...props} />;
    case 'testTube':
      return <TestTube liquidColor={liquid} fill={look.fill ?? 0} {...props} />;
    case 'testTubeRack':
      return <TestTubeRack {...props} />;
    case 'graduatedCylinder':
      return <GraduatedCylinder liquidColor={liquid} fill={look.fill ?? 0.5} {...props} />;
    case 'reagentBottle': {
      const substance = variant?.contents?.[0] ? SUBSTANCES[variant.contents[0].id] : undefined;
      return <ReagentBottle label={variant?.label} name={substance?.name} {...props} />;
    }
    case 'bunsenBurner':
      return <BunsenBurner lit={lit} {...props} />;
    case 'pipette':
      return <Pipette {...props} />;
    case 'scale':
      return <Scale reading={reading} {...props} />;
    case 'thermometer':
      return <Thermometer {...props} />;
    case 'goggles':
      return <Goggles {...props} />;
    case 'fireExtinguisher':
      return <FireExtinguisherModel {...props} />;
    case 'spatula':
      return <Spatula {...props} />;
    case 'tongs':
      return <Tongs {...props} />;
    case 'glassRod':
      return <GlassRod {...props} />;
    case 'funnel':
      return <Funnel {...props} />;
    case 'washBottle':
      return <WashBottle {...props} />;
    case 'watchGlass':
      return <WatchGlass {...props} />;
    case 'petriDish':
      return <PetriDish liquidColor={liquid} fill={look.fill ?? 0} {...props} />;
    case 'evaporatingDish':
      return <EvaporatingDish liquidColor={liquid} fill={look.fill ?? 0} {...props} />;
    case 'volumetricFlask':
      return <VolumetricFlask liquidColor={liquid} fill={look.fill ?? 0} {...props} />;
    case 'testTubeHolder':
      return <TestTubeHolder {...props} />;
    case 'mortar':
      return <Mortar {...props} />;
  }
}
