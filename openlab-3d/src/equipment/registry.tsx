import {useShowcase} from '../experiments/workbench/guidance/showcase';
import {GuideStockMarker} from '../experiments/workbench/guidance/GuideMarker';
import { GasCylinder } from './GasCylinder';
import {Grade9Apparatus} from '../experiments/grade9/Apparatus';
import {isGrade9Rig} from '../experiments/grade9/kinds';
/** Maps a catalog kind (+ variant, live contents and tool state) to its procedural 3D model. */
import { useMemo } from 'react';
import type { GroupProps } from '@react-three/fiber';
import { useHolderChanged, useWakeHolder } from '../interaction/still';
import { isContainer, type EquipmentKind } from './equipmentCatalog';
import type { ItemVariant } from '../world/itemsLayout';
import { mixtureLook, type MixtureLook } from '../chemistry/color';
import { REAGENTS } from '../chemistry/reagents';
import { pureReagentColor, reagentColor } from '../chemistry/real-color';
import { FLAME_COLORS, type Cation } from '../chemistry/species';
import type { Mixture } from '../chemistry/mixture';
import { seedMixture, type ToolState } from '../store/useChemStore';
import { Beaker } from './Beaker';
import { ErlenmeyerFlask } from './ErlenmeyerFlask';
import { TestTube } from './TestTube';
import { TestTubeRack } from './TestTubeRack';
import { GraduatedCylinder } from './GraduatedCylinder';
import { ReagentBottle } from './ReagentBottle';
import { DropperBottle } from './DropperBottle';
import { ReagentJar } from './ReagentJar';
import { BunsenBurner } from './BunsenBurner';
import { Tripod } from './Tripod';
import { Pipette } from './Pipette';
import { Scale } from './Scale';
import { Thermometer } from './Thermometer';
import { PhPaper } from './PhPaper';
import { Burette } from './Burette';
import { Goggles } from './Goggles';
import { Gloves } from './Gloves';
import { Spatula } from './Spatula';
import { Tongs } from './Tongs';
import { GlassRod } from './GlassRod';
import { WireLoop } from './WireLoop';
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
  /** Live contents; defaults to the item's seed. */
  mixture?: Mixture;
  /** Live item id: enables bubbles, steam and flames. */
  itemId?: string;
  /** Bunsen burner flame and its flame-test tint. */
  lit?: boolean;
  flameColor?: string;
  /** Balance display. */
  reading?: string;
  /** Test tube standing (rack / hand) instead of lying. */
  upright?: boolean;
  tool?: ToolState;
  /** Thumbnail mode: racks show tubes, bottles use the cheap alpha glass. */
  decorative?: boolean;
}

function sampleColor(tool?: ToolState): string | undefined {
  const sample = tool?.sample;
  if (!sample) return undefined;
  let best: string | undefined;
  let w = 0;
  for (const [c, v] of Object.entries(sample) as [Cation, number][]) {
    if (v > w && FLAME_COLORS[c]) {
      w = v;
      best = c === 'Cu' ? '#4fa3e6' : '#f2f2ee';
    }
  }
  return best;
}

export function EquipmentModel({ kind, variant, mixture, itemId, lit, flameColor, reading, upright, tool, decorative, ...props }: EquipmentModelProps) {
  const open=useShowcase(s=>!!itemId&&s.source===itemId&&s.cap!==null);
  useWakeHolder();
  const contents = mixture ?? seedMixture(variant);
  const look: MixtureLook | undefined = useMemo(() => {
    if (!isContainer(kind)) return undefined;
    const base = mixtureLook(contents);
    // A vessel holding one undiluted reagent shows its real color, not the simulated stock
    // (indicators, dyes and iodine come out black or off-hue under Beer–Lambert at stock strength).
    const real = pureReagentColor(contents);
    return real && base.liquid ? { ...base, liquid: real } : base;
  }, [kind, contents, decorative, variant]);
  // In a drawer: rebuild the merged copy only when what is drawn changes, not on every
  // re-render (focus) or every equal mixture the simulation hands back.
  useHolderChanged([kind, variant, look ? JSON.stringify(look) : '', open, tool ? JSON.stringify(tool) : '', upright]);
  const reagent = variant?.reagent ? REAGENTS[variant.reagent] : undefined;
  const fx = { look, itemId };
  if(isGrade9Rig(kind))return <Grade9Apparatus kind={kind} itemId={itemId} {...props}/>;
  // The label band is painted in the substance's real color, so a bottle reads the same in the
  // drawer, on a shelf and on the worktop (stock color is fixed: it does not flicker while pouring).
  const stripe = variant?.reagent ? reagentColor(variant.reagent) : undefined;
  if(kind==='gasCylinder')return <group {...props}><GuideStockMarker id={itemId}/><GasCylinder itemId={itemId} label={reagent?.label??'Хий'} name={reagent?.name??'Баллон'} color={stripe??'#8bb0be'}/></group>;
  switch (kind) {
    case 'paperStrip':return <group {...props}><mesh position={[0,.001,0]}><boxGeometry args={[.03,.0005,.2]}/><meshStandardMaterial color={variant?.reagent==='s_litmus_red'?'#dd5470':variant?.reagent==='s_litmus_blue'?'#5566d9':'#fcf4db'} roughness={.9}/></mesh></group>;
    case 'beaker':
      return <Beaker {...fx} {...props} />;
    case 'erlenmeyer':
      return <ErlenmeyerFlask {...fx} {...props} />;
    case 'testTube':
      return <TestTube {...fx} upright={upright} {...props} />;
    case 'testTubeRack':
      return <TestTubeRack decorative={decorative} {...props} />;
    case 'graduatedCylinder':
      return <GraduatedCylinder {...fx} {...props} />;
    case 'reagentBottle':
      return <group {...props}><GuideStockMarker id={itemId}/><ReagentBottle itemId={itemId} open={open} look={look} decorative={decorative} label={reagent?.label ?? variant?.label} name={reagent?.name} stripe={stripe} /></group>;
    case 'dropperBottle':
      return <group {...props}><GuideStockMarker id={itemId}/><DropperBottle open={open} look={look} decorative={decorative} label={reagent?.label ?? variant?.label} name={reagent?.name} stripe={stripe} /></group>;
    case 'reagentJar':
      return <group {...props}><GuideStockMarker id={itemId}/><ReagentJar open={open} {...fx} label={reagent?.label ?? variant?.label} name={reagent?.name} stripe={stripe} /></group>;
    case 'bunsenBurner':
      return <BunsenBurner lit={lit} flameColor={flameColor} {...props} />;
    case 'tripod':
      return <Tripod {...props} />;
    case 'pipette':
      return <Pipette liquid={look?.liquid ?? undefined} {...props} />;
    case 'scale':
      return <Scale reading={reading} {...props} />;
    case 'thermometer':
      return <Thermometer temperature={tool?.reading ?? 22} {...props} />;
    case 'phPaper':
      return <PhPaper strip={tool?.strip} {...props} />;
    case 'burette':
      return <Burette {...fx} flow={tool?.flow ?? 0} dropColor={look?.liquid ?? undefined} {...props} />;
    case 'goggles':
      return <Goggles {...props} />;
    case 'gloves':
      return <Gloves {...props} />;
    case 'fireExtinguisher':
      return <FireExtinguisherModel {...props} />;
    case 'spatula':
      return <Spatula load={look?.solidColor ?? undefined} {...props} />;
    case 'tongs':
      return <Tongs {...props} />;
    case 'glassRod':
      return <GlassRod {...props} />;
    case 'wireLoop':
      return <WireLoop sampleColor={sampleColor(tool)} {...props} />;
    case 'funnel':
      return <Funnel residue={tool?.residue} {...props} />;
    case 'washBottle':
      return <WashBottle {...props} />;
    case 'watchGlass':
      return <WatchGlass {...fx} {...props} />;
    case 'petriDish':
      return <PetriDish {...fx} {...props} />;
    case 'evaporatingDish':
      return <EvaporatingDish {...fx} {...props} />;
    case 'volumetricFlask':
      return <VolumetricFlask {...fx} {...props} />;
    case 'testTubeHolder':
      return <TestTubeHolder {...props} />;
    case 'mortar':
      return <Mortar {...fx} {...props} />;
  }
}
