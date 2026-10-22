/** Maps a catalog kind (+ optional variant) to its procedural 3D model component. */
import type { GroupProps } from '@react-three/fiber';
import type { EquipmentKind } from './equipmentCatalog';
import type { ItemVariant } from '../world/itemsLayout';
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
import { FireExtinguisherModel } from '../world/furniture/FireExtinguisher';

export interface EquipmentModelProps extends GroupProps {
  kind: EquipmentKind;
  variant?: ItemVariant;
}

export function EquipmentModel({ kind, variant, ...props }: EquipmentModelProps) {
  switch (kind) {
    case 'beaker':
      return <Beaker liquidColor={variant?.liquid} fill={variant?.fill ?? (variant?.liquid ? 0.5 : 0)} {...props} />;
    case 'erlenmeyer':
      return <ErlenmeyerFlask liquidColor={variant?.liquid} fill={variant?.fill ?? (variant?.liquid ? 0.4 : 0)} {...props} />;
    case 'testTube':
      return <TestTube liquidColor={variant?.liquid} fill={variant?.fill ?? 0} {...props} />;
    case 'testTubeRack':
      return <TestTubeRack {...props} />;
    case 'graduatedCylinder':
      return <GraduatedCylinder liquidColor={variant?.liquid} fill={variant?.fill ?? 0.5} {...props} />;
    case 'reagentBottle':
      return <ReagentBottle label={variant?.label} {...props} />;
    case 'bunsenBurner':
      return <BunsenBurner {...props} />;
    case 'pipette':
      return <Pipette {...props} />;
    case 'scale':
      return <Scale {...props} />;
    case 'thermometer':
      return <Thermometer {...props} />;
    case 'goggles':
      return <Goggles {...props} />;
    case 'fireExtinguisher':
      return <FireExtinguisherModel {...props} />;
  }
}
