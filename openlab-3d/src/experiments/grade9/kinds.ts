export const RIG_NAMES = {
 convectionCell:'Конвекцийн хос сав',heatingBath:'Мөс хайлуулах халаагуур',gasSyringe:'Хийн тариур ба термостат',diffusionCell:'Диффузийн ажиглах сав',diffusionTube:'Хийн диффузийн хоолой',conductivityTester:'Цахилгаан дамжуулах соригч',reactionTile:'Тусгаарлагдсан сорилын хавтан',chromatographyTank:'Хроматографийн камер',gasTrain:'Хий үүсгэх ба хураах угсралт',calorimeter:'Спиртэн дэнтэй калориметр',corrosionRack:'Зэврэлтийн харьцуулах тавиур',fractionatingColumn:'Агаарын фракцлах багана',
} as const;
export type RigKind=keyof typeof RIG_NAMES;
export const isGrade9Rig=(kind:string):kind is RigKind=>Object.prototype.hasOwnProperty.call(RIG_NAMES,kind);
