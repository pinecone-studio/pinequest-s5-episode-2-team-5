import type {GuideStep} from './plans';
export type Operation='none'|'connect-electric'|'connect-gas'|'stir'|'heat'|'cool'|'magnet'|'wind'|'compress'|'assemble'|'measure'|'power';
export function operationFor(kind:string,step:GuideStep):Operation{
 if(step.type==='record')return 'measure';
 if(step.type==='configure'){
  if(step.change.operation==='magnet')return 'magnet';if(step.change.operation==='draw')return 'wind';
  if(step.change.bonds)return 'assemble';if(step.change.volumeMl!==undefined||step.change.pressure!==undefined)return 'compress';
  if(step.change.connected!==undefined)return step.change.connected?'connect-electric':'power';if(step.change.heating!==undefined)return 'heat';if(step.change.cooling!==undefined)return 'cool';
  if(step.change.voltage!==undefined||step.change.current!==undefined)return 'power';
 }
 if(step.type==='start'){
  if(kind==='molecularKit')return 'assemble';
  if(kind==='interfacialBath')return 'measure';
  if(['balanceBench','densityBench','materialsBench','fallingBallViscometer','chromatographyTank','fractionatingColumn','enzymeRack','exposureRack'].includes(kind))return 'measure';
  if(['galvanicCell','electrolysisCell','migrationTube','conductivityTester'].includes(kind))return 'connect-electric';
  if(['gasTrain','refluxReactor','refluxBath','dehydrationFlask','crackingTube','fermenter','gasWashTrain','gasSyringe'].includes(kind))return 'connect-gas';
  return ['beaker','erlenmeyer','graduatedCylinder','testTube','evaporatingDish','reactionTile','multiReactionRack','equilibriumCell','opticalBench','diffusionCell'].includes(kind)?'stir':'power';
 }
 return 'none';
}
export const operationLabel:Record<Operation,string>={none:'', 'connect-electric':'Утасны хавчаарыг электродод холбоод хэлхээний унтраалгыг ажиллуулж байна','connect-gas':'Хоолойн үзүүрийг гаралт ба хүлээн авагчид холбож байна',stir:'Шилэн саваагаар дээжийг хольж байна',heat:'Халаалтын удирдлагыг эргүүлж байна',cool:'Хөргөгчийн урсгалыг тохируулж байна',magnet:'Соронзыг дээжид ойртуулж ялгаж байна',wind:'Үеийн заагаас найлон утсыг татаж ороож байна',compress:'Поршенийг хөдөлгөж хийн эзлэхүүнийг өөрчилж байна',assemble:'Загварын холбоосуудыг угсарч байна',measure:'Бодит заалтыг уншиж байна',power:'Цахилгаан үүсгэгчийн удирдлагыг тохируулж байна'};
