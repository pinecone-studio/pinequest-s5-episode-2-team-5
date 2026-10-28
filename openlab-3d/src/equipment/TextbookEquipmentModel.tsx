/** Lightweight procedural models for Grade 8 textbook apparatus. */
import type { ReactNode } from 'react';
import { metalAluminum, metalBrushed, metalDark, metalSteel } from '../materials/metal';
import { plastic, plasticBlack, plasticBlue, plasticGreen, plasticWhite, wood } from '../materials/plastic';
import { decorGlass } from '../materials/glass';
import { ModelOr, type ModelProps } from './ModelOr';
import type { TextbookEquipmentKind } from './equipmentCatalog';

const glassBlue = decorGlass('#b9dfe8');
const glassDark = plastic('#59808b', 0.35);
const rubber = plastic('#242a2e', 0.85);
const red = plastic('#d63a37', 0.5);
const brown = plastic('#79472e', 0.8);
const soil = plastic('#493525', 0.95);
const paper = plastic('#fffdf3', 0.95);
const sand = plastic('#c69b62', 0.95);

export interface TextbookEquipmentModelProps extends ModelProps {
  kind: TextbookEquipmentKind;
}

export function TextbookEquipmentModel({ kind, modelUrl, ...props }: TextbookEquipmentModelProps) {
  let model: ReactNode;
  switch (kind) {
    case 'stopwatch':
      model = <>
        <mesh material={rubber} position={[0, 0.012, 0]}><cylinderGeometry args={[0.045, 0.045, 0.022, 32]} /></mesh>
        <mesh material={plasticWhite} position={[0, 0.024, 0]}><cylinderGeometry args={[0.036, 0.036, 0.003, 32]} /></mesh>
        <mesh material={glassDark} position={[0, 0.026, 0]}><cylinderGeometry args={[0.0018, 0.0018, 0.001, 12]} /></mesh>
        {Array.from({ length: 12 }, (_, i) => {
          const angle = i * Math.PI / 6;
          return <mesh key={i} material={metalDark} position={[Math.sin(angle) * 0.028, 0.027, Math.cos(angle) * 0.028]} rotation={[0, angle, 0]}><boxGeometry args={[0.002, 0.001, i % 3 === 0 ? 0.006 : 0.003]} /></mesh>;
        })}
        <mesh material={red} position={[0, 0.028, 0.008]} rotation={[0, 0.12, 0]}><boxGeometry args={[0.0015, 0.001, 0.021]} /></mesh>
        <mesh material={metalBrushed} position={[0, 0.031, -0.049]}><cylinderGeometry args={[0.007, 0.007, 0.012, 12]} /></mesh>
        <mesh material={metalBrushed} position={[0.018, 0.027, -0.042]} rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[0.014, 0.006, 0.006]} /></mesh>
      </>;
      break;
    case 'gasDeliveryTube':
      model = <>
        <mesh material={glassBlue} position={[0, 0.045, -0.028]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.006, 0.006, 0.085, 10]} /></mesh>
        <mesh material={glassBlue} position={[-0.035, 0.082, -0.028]}><cylinderGeometry args={[0.006, 0.006, 0.075, 10]} /></mesh>
        <mesh material={glassBlue} position={[0.035, 0.045, -0.028]}><cylinderGeometry args={[0.006, 0.006, 0.085, 10]} /></mesh>
        <mesh material={glassBlue} position={[-0.035, 0.12, -0.028]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.006, 0.006, 0.07, 10]} /></mesh>
        {[[ -0.035, 0.082, -0.028 ], [ 0.035, 0.082, -0.028 ]].map((position, i) => <mesh key={i} material={glassBlue} position={position as [number, number, number]} scale={1.4}><sphereGeometry args={[0.006, 10, 8]} /></mesh>)}
      </>;
      break;
    case 'retortStand':
      model = <>
        <mesh material={metalDark} position={[0, 0.012, 0]}><boxGeometry args={[0.2, 0.024, 0.12]} /></mesh>
        <mesh material={metalSteel} position={[-0.07, 0.15, 0]}><cylinderGeometry args={[0.007, 0.007, 0.27, 12]} /></mesh>
        <mesh material={metalBrushed} position={[-0.015, 0.21, 0]}><boxGeometry args={[0.11, 0.012, 0.016]} /></mesh>
        <mesh material={metalDark} position={[0.035, 0.21, 0]}><boxGeometry args={[0.018, 0.035, 0.04]} /></mesh>
        <mesh material={metalBrushed} position={[-0.015, 0.13, 0]}><boxGeometry args={[0.11, 0.01, 0.016]} /></mesh>
        <mesh material={metalDark} position={[0.035, 0.13, 0]}><boxGeometry args={[0.018, 0.035, 0.04]} /></mesh>
      </>;
      break;
    case 'crystallizingDish':
      model = <>
        <mesh material={glassBlue} position={[0, 0.013, 0]}><cylinderGeometry args={[0.071, 0.071, 0.026, 32]} /></mesh>
        <mesh material={glassDark} position={[0, 0.027, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.068, 0.003, 6, 32]} /></mesh>
        <mesh material={plasticWhite} position={[0, 0.028, 0]}><cylinderGeometry args={[0.062, 0.062, 0.002, 32]} /></mesh>
      </>;
      break;
    case 'splint':
      model = <>
        <mesh material={wood} position={[0, 0.003, 0]}><boxGeometry args={[0.009, 0.006, 0.17]} /></mesh>
        <mesh material={rubber} position={[0, 0.004, -0.083]}><boxGeometry args={[0.009, 0.007, 0.018]} /></mesh>
      </>;
      break;
    case 'sandpaper':
      model = <>
        <mesh material={sand} position={[0, 0.001, 0]}><boxGeometry args={[0.1, 0.002, 0.14]} /></mesh>
        {Array.from({ length: 24 }, (_, i) => <mesh key={i} material={brown} position={[-0.042 + (i % 6) * 0.016, 0.0025, -0.055 + Math.floor(i / 6) * 0.03]}><sphereGeometry args={[0.0014, 5, 4]} /></mesh>)}
      </>;
      break;
    case 'cottonWool':
      model = <>{Array.from({ length: 8 }, (_, i) => {
        const angle = i * Math.PI / 4;
        return <mesh key={i} material={paper} position={[Math.cos(angle) * 0.018, 0.018 + (i % 3) * 0.004, Math.sin(angle) * 0.018]} scale={[1.25, 1, 1]}><sphereGeometry args={[0.019, 9, 7]} /></mesh>;
      })}</>;
      break;
    case 'syringe':
      model = <>
        <mesh material={glassBlue} position={[0, 0.02, -0.02]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.014, 0.014, 0.105, 16]} /></mesh>
        <mesh material={plasticWhite} position={[0, 0.02, -0.02]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.012, 0.012, 0.098, 16]} /></mesh>
        <mesh material={plasticBlue} position={[0, 0.02, 0.044]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.004, 0.004, 0.045, 10]} /></mesh>
        <mesh material={plasticBlue} position={[0, 0.02, 0.071]}><boxGeometry args={[0.032, 0.005, 0.008]} /></mesh>
        <mesh material={metalSteel} position={[0, 0.02, 0.097]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.0015, 0.0015, 0.02, 8]} /></mesh>
        {Array.from({ length: 5 }, (_, i) => <mesh key={i} material={metalDark} position={[0.014, 0.027, -0.05 + i * 0.014]}><boxGeometry args={[0.005, 0.001, 0.001]} /></mesh>)}
      </>;
      break;
    case 'matches':
      model = <>
        <mesh material={red} position={[0, 0.009, 0]}><boxGeometry args={[0.052, 0.018, 0.07]} /></mesh>
        <mesh material={plasticWhite} position={[0, 0.019, 0]}><boxGeometry args={[0.05, 0.003, 0.068]} /></mesh>
        {Array.from({ length: 4 }, (_, i) => <group key={i} position={[-0.025 + i * 0.016, 0.026, -0.012]} rotation={[0, i * 0.18, 0]}>
          <mesh material={wood} position={[0, 0, 0.025]}><boxGeometry args={[0.003, 0.003, 0.045]} /></mesh>
          <mesh material={red} position={[0, 0, 0.001]}><sphereGeometry args={[0.004, 8, 6]} /></mesh>
        </group>)}
      </>;
      break;
    case 'handPump':
      model = <>
        <mesh material={plasticBlue} position={[0, 0.055, 0]}><cylinderGeometry args={[0.031, 0.036, 0.11, 16]} /></mesh>
        <mesh material={metalBrushed} position={[0, 0.13, 0]}><cylinderGeometry args={[0.008, 0.008, 0.1, 10]} /></mesh>
        <mesh material={plasticBlack} position={[0, 0.18, 0]}><boxGeometry args={[0.075, 0.012, 0.018]} /></mesh>
        <mesh material={plasticBlue} position={[0.043, 0.06, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.008, 0.008, 0.07, 10]} /></mesh>
        <mesh material={rubber} position={[0, 0.012, 0]}><cylinderGeometry args={[0.043, 0.043, 0.024, 16]} /></mesh>
      </>;
      break;
    case 'uTube':
      model = <>
        <mesh material={glassBlue} position={[-0.04, 0.07, 0]}><cylinderGeometry args={[0.009, 0.009, 0.13, 12]} /></mesh>
        <mesh material={glassBlue} position={[0.04, 0.07, 0]}><cylinderGeometry args={[0.009, 0.009, 0.13, 12]} /></mesh>
        <mesh material={glassBlue} position={[0, 0.012, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.009, 0.009, 0.09, 12]} /></mesh>
        {[-0.04, 0.04].map((x) => <mesh key={x} material={glassBlue} position={[x, 0.025, 0]}><sphereGeometry args={[0.009, 10, 8]} /></mesh>)}
      </>;
      break;
    case 'aluminumCan':
      model = <>
        <mesh material={metalAluminum} position={[0, 0.062, 0]}><cylinderGeometry args={[0.032, 0.032, 0.112, 24]} /></mesh>
        <mesh material={metalSteel} position={[0, 0.12, 0]}><cylinderGeometry args={[0.029, 0.029, 0.004, 24]} /></mesh>
        <mesh material={metalDark} position={[0, 0.123, 0.008]} rotation={[0, 0, -0.18]}><boxGeometry args={[0.018, 0.002, 0.01]} /></mesh>
        <mesh material={metalAluminum} position={[0, 0.006, 0]}><cylinderGeometry args={[0.028, 0.031, 0.006, 24]} /></mesh>
      </>;
      break;
    case 'plasticCup':
      model = <>
        <mesh material={plasticBlue} position={[0, 0.041, 0]}><cylinderGeometry args={[0.04, 0.029, 0.078, 24, 1, true]} /></mesh>
        <mesh material={plasticWhite} position={[0, 0.004, 0]}><cylinderGeometry args={[0.03, 0.03, 0.004, 24]} /></mesh>
        <mesh material={plasticBlue} position={[0, 0.081, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.039, 0.0025, 6, 24]} /></mesh>
      </>;
      break;
    case 'knife':
      model = <>
        <mesh material={wood} position={[0, 0.006, 0.045]}><boxGeometry args={[0.018, 0.012, 0.085]} /></mesh>
        <mesh material={metalSteel} position={[0, 0.006, -0.04]} rotation={[0, 0.06, 0]}><boxGeometry args={[0.022, 0.005, 0.09]} /></mesh>
        <mesh material={metalBrushed} position={[0, 0.007, -0.087]}><boxGeometry args={[0.0015, 0.006, 0.005]} /></mesh>
        <mesh material={metalDark} position={[0, 0.006, 0.004]}><boxGeometry args={[0.024, 0.014, 0.009]} /></mesh>
      </>;
      break;
    case 'magnifyingGlass':
      model = <>
        <mesh material={glassBlue} position={[0, 0.004, -0.035]}><cylinderGeometry args={[0.036, 0.036, 0.004, 24]} /></mesh>
        <mesh material={metalDark} position={[0, 0.007, -0.035]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.038, 0.004, 8, 24]} /></mesh>
        <mesh material={wood} position={[0, 0.007, 0.045]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.008, 0.01, 0.09, 12]} /></mesh>
        <mesh material={metalDark} position={[0, 0.007, 0.008]}><torusGeometry args={[0.009, 0.002, 6, 12]} /></mesh>
      </>;
      break;
    case 'disposableDish':
      model = <>
        <mesh material={plasticWhite} position={[0, 0.008, 0]}><cylinderGeometry args={[0.069, 0.061, 0.014, 32]} /></mesh>
        <mesh material={plasticBlue} position={[0, 0.016, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.066, 0.003, 6, 32]} /></mesh>
        <mesh material={plasticWhite} position={[0, 0.016, 0]}><cylinderGeometry args={[0.057, 0.057, 0.002, 32]} /></mesh>
      </>;
      break;
    case 'plasticBottle':
      model = <>
        <mesh material={plasticBlue} position={[0, 0.075, 0]}><cylinderGeometry args={[0.032, 0.034, 0.12, 20]} /></mesh>
        <mesh material={plasticBlue} position={[0, 0.143, 0]}><cylinderGeometry args={[0.02, 0.032, 0.025, 20]} /></mesh>
        <mesh material={plasticBlue} position={[0, 0.163, 0]}><cylinderGeometry args={[0.012, 0.018, 0.025, 16]} /></mesh>
        <mesh material={red} position={[0, 0.18, 0]}><cylinderGeometry args={[0.014, 0.014, 0.014, 16]} /></mesh>
        <mesh material={plasticWhite} position={[0, 0.09, 0.033]}><boxGeometry args={[0.026, 0.04, 0.002]} /></mesh>
        <mesh material={plasticBlue} position={[0, 0.006, 0]}><cylinderGeometry args={[0.031, 0.032, 0.008, 20]} /></mesh>
      </>;
      break;
    case 'seedPot':
      model = <>
        <mesh material={brown} position={[0, 0.03, 0]}><cylinderGeometry args={[0.047, 0.037, 0.06, 20]} /></mesh>
        <mesh material={soil} position={[0, 0.062, 0]}><cylinderGeometry args={[0.044, 0.044, 0.006, 20]} /></mesh>
        <mesh material={plasticGreen} position={[0, 0.095, 0]}><cylinderGeometry args={[0.0025, 0.003, 0.065, 8]} /></mesh>
        <mesh material={plasticGreen} position={[-0.012, 0.104, 0]} rotation={[0, 0, -0.5]} scale={[1.6, 0.65, 0.45]}><sphereGeometry args={[0.012, 10, 7]} /></mesh>
        <mesh material={plasticGreen} position={[0.013, 0.117, 0]} rotation={[0, 0, 0.5]} scale={[1.6, 0.65, 0.45]}><sphereGeometry args={[0.012, 10, 7]} /></mesh>
        <mesh material={plasticGreen} position={[0, 0.128, 0]} scale={[0.8, 1.5, 0.7]}><sphereGeometry args={[0.01, 10, 7]} /></mesh>
      </>;
      break;
    case 'tissue':
      model = <>
        <mesh material={paper} position={[0, 0.003, 0]}><boxGeometry args={[0.078, 0.004, 0.078]} /></mesh>
        <mesh material={plasticWhite} position={[0.006, 0.006, -0.003]} rotation={[0, 0.03, -0.06]}><boxGeometry args={[0.071, 0.002, 0.072]} /></mesh>
        <mesh material={paper} position={[-0.007, 0.008, 0.005]} rotation={[0, -0.05, 0.08]}><boxGeometry args={[0.064, 0.002, 0.064]} /></mesh>
      </>;
      break;
    case 'waterFilter':
      model = <>
        <mesh material={plasticBlue} position={[0, 0.075, 0]}><cylinderGeometry args={[0.031, 0.031, 0.13, 16]} /></mesh>
        <mesh material={plasticWhite} position={[0, 0.04, 0]}><cylinderGeometry args={[0.032, 0.032, 0.025, 16]} /></mesh>
        <mesh material={sand} position={[0, 0.07, 0]}><cylinderGeometry args={[0.031, 0.031, 0.035, 16]} /></mesh>
        <mesh material={brown} position={[0, 0.105, 0]}><cylinderGeometry args={[0.031, 0.031, 0.025, 16]} /></mesh>
        <mesh material={plasticBlue} position={[0, 0.15, 0]}><cylinderGeometry args={[0.03, 0.03, 0.025, 16]} /></mesh>
        <mesh material={plasticWhite} position={[0, 0.015, 0]}><cylinderGeometry args={[0.008, 0.008, 0.035, 10]} /></mesh>
      </>;
      break;
    case 'corkStopper':
      model = <>
        <mesh material={brown} position={[0, 0.022, 0]}><cylinderGeometry args={[0.014, 0.022, 0.042, 12]} /></mesh>
        <mesh material={plastic('#d5ac78', 0.9)} position={[0, 0.044, 0]}><cylinderGeometry args={[0.014, 0.014, 0.004, 12]} /></mesh>
        <mesh material={plastic('#a2764f', 0.9)} position={[0, 0.015, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.018, 0.0015, 5, 12]} /></mesh>
      </>;
      break;
    case 'penCap':
      model = <>
        <mesh material={plasticBlue} position={[0, 0.009, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.009, 0.01, 0.05, 12]} /></mesh>
        <mesh material={plasticBlue} position={[0, 0.009, -0.027]}><boxGeometry args={[0.014, 0.004, 0.008]} /></mesh>
        <mesh material={plasticBlue} position={[0.008, 0.014, -0.006]} rotation={[0, 0, 0.14]}><boxGeometry args={[0.003, 0.012, 0.035]} /></mesh>
        <mesh material={plasticWhite} position={[0, 0.009, 0.026]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.006, 0.006, 0.004, 12]} /></mesh>
      </>;
      break;
    case 'modellingClay':
      model = <>{Array.from({ length: 7 }, (_, i) => {
        const angle = i * Math.PI * 2 / 7;
        return <mesh key={i} material={plastic('#b65749', 0.85)} position={[Math.cos(angle) * 0.016, 0.018 + (i % 2) * 0.006, Math.sin(angle) * 0.016]} scale={[1.2, 0.8, 1]}><sphereGeometry args={[0.018, 9, 7]} /></mesh>;
      })}</>;
      break;
    case 'dripAdjuster':
      model = <>
        <mesh material={glassBlue} position={[0, 0.035, 0]}><cylinderGeometry args={[0.012, 0.012, 0.055, 12]} /></mesh>
        <mesh material={plasticWhite} position={[0, 0.036, 0]}><cylinderGeometry args={[0.008, 0.008, 0.035, 12]} /></mesh>
        <mesh material={red} position={[0.026, 0.035, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.009, 0.009, 0.028, 12]} /></mesh>
        <mesh material={plasticBlue} position={[0, 0.071, 0]}><cylinderGeometry args={[0.005, 0.005, 0.035, 10]} /></mesh>
        <mesh material={plasticBlue} position={[0, 0.002, 0]}><cylinderGeometry args={[0.005, 0.005, 0.04, 10]} /></mesh>
      </>;
      break;
    case 'wireGauze':
      model = <>
        <mesh material={metalDark} position={[0, 0.002, 0]}><boxGeometry args={[0.14, 0.003, 0.14]} /></mesh>
        {Array.from({ length: 9 }, (_, i) => <group key={i}>
          <mesh material={metalSteel} position={[-0.056 + i * 0.014, 0.004, 0]}><boxGeometry args={[0.0018, 0.002, 0.14]} /></mesh>
          <mesh material={metalSteel} position={[0, 0.004, -0.056 + i * 0.014]}><boxGeometry args={[0.14, 0.002, 0.0018]} /></mesh>
        </group>)}
        <mesh material={metalAluminum} position={[0, 0.005, 0]}><boxGeometry args={[0.07, 0.002, 0.07]} /></mesh>
      </>;
      break;
    case 'wellPlate':
      model = <>
        <mesh material={plasticWhite} position={[0, 0.007, 0]}><boxGeometry args={[0.14, 0.014, 0.1]} /></mesh>
        {Array.from({ length: 12 }, (_, i) => {
          const x = -0.05 + (i % 4) * 0.033;
          const z = -0.03 + Math.floor(i / 4) * 0.03;
          return <group key={i}>
            <mesh material={plasticBlue} position={[x, 0.015, z]}><cylinderGeometry args={[0.011, 0.011, 0.003, 12]} /></mesh>
            <mesh material={rubber} position={[x, 0.017, z]}><cylinderGeometry args={[0.007, 0.007, 0.001, 12]} /></mesh>
          </group>;
        })}
      </>;
      break;
    case 'filterPaper':
      model = <>
        <mesh material={paper} position={[0, 0.002, 0]}><cylinderGeometry args={[0.044, 0.044, 0.003, 32]} /></mesh>
        <mesh material={plasticWhite} position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.04, 32]} /></mesh>
        <mesh material={paper} position={[0, 0.006, 0]} rotation={[0.06, 0, 0]}><coneGeometry args={[0.035, 0.018, 32, 1, true]} /></mesh>
      </>;
      break;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
  return <ModelOr modelUrl={modelUrl} {...props}>{model}</ModelOr>;
}
