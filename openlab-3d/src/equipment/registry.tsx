/** Maps a catalog kind (+ optional variant) to its procedural 3D model component. */
import type { GroupProps } from '@react-three/fiber';
import type { EquipmentKind } from './equipmentCatalog';
import type { ItemVariant } from '../world/itemsLayout';
import { MillikanApparatus } from './MillikanApparatus';
import { Microscope } from './Microscope';
import { Beaker } from './Beaker';
import { ErlenmeyerFlask } from './ErlenmeyerFlask';
import { TestTube } from './TestTube';
import { TestTubeRack } from './TestTubeRack';
import { GraduatedCylinder } from './GraduatedCylinder';
import { AtomizerBottle } from './AtomizerBottle';
import { CreamBottle, ReagentBottle } from './ReagentBottle';
import { BunsenBurner } from './BunsenBurner';
import { PetriDish } from './PetriDish';
import { Pipette } from './Pipette';
import { Laptop } from './Laptop';
import { Multimeter } from './Multimeter';
import { PowerSupply } from './PowerSupply';
import { Scale } from './Scale';
import { Thermometer } from './Thermometer';
import { Goggles } from './Goggles';
import { SpecimenJar } from './SpecimenJar';
import { SlideBox } from './SlideBox';
import { FireExtinguisherModel } from '../world/furniture/FireExtinguisher';

export interface EquipmentModelProps extends GroupProps {
  kind: EquipmentKind;
  variant?: ItemVariant;
}

export function EquipmentModel({ kind, variant, ...props }: EquipmentModelProps) {
  switch (kind) {
    case 'millikan':
      return <MillikanApparatus {...props} />;
    case 'microscope':
      return <Microscope {...props} />;
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
    case 'atomizer':
      return <AtomizerBottle {...props} />;
    case 'reagentBottle':
      return <ReagentBottle label={variant?.label} {...props} />;
    case 'creamBottle':
      return <CreamBottle {...props} />;
    case 'bunsenBurner':
      return <BunsenBurner {...props} />;
    case 'petriDish':
      return <PetriDish {...props} />;
    case 'pipette':
      return <Pipette {...props} />;
    case 'laptop':
      return <Laptop {...props} />;
    case 'multimeter':
      return <Multimeter {...props} />;
    case 'powerSupply':
      return <PowerSupply {...props} />;
    case 'scale':
      return <Scale {...props} />;
    case 'thermometer':
      return <Thermometer {...props} />;
    case 'goggles':
      return <Goggles {...props} />;
    case 'specimenJar':
      return <SpecimenJar label={variant?.label} {...props} />;
    case 'slideBox':
      return <SlideBox {...props} />;
    case 'fireExtinguisher':
      return <FireExtinguisherModel {...props} />;
  }
}
