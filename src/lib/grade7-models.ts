import type { InvestigationDefinition, Trial } from './textbook-investigations';

/** Grade 7 teaching scenarios. These outputs are never physical bench measurements. */
export function grade7Model(d: InvestigationDefinition, p: Record<string, number>): Pick<Trial, 'readings' | 'observation'> {
  const readings: Trial['readings'] = [];
  const add = (label: string, value: number, unit: string) => {
    if (!Number.isFinite(value)) throw new Error(`Invalid Grade 7 model reading: ${label}`);
    readings.push({ label, value, unit });
  };
  let observation = '';
  switch (d.model) {
    case 'g7-layers': {
      const mixed = 1 - Math.exp(-p.time / 90);
      add('Нийт шингэн', p.water + p.oil + p.syrup, 'мл (эзлэхүүн нэмэгдэх схем)');
      add('Тусдаа тос', p.oil, 'мл'); add('Ус–сиропын холилдолт', p.water && p.syrup ? mixed * 100 : 0, '% (загвар)');
      observation = 'Тос устай холилдохгүй, усан үеийн дээр байна гэж үзэв. Сироп эхлээд нягтаас шалтгаалж доор байрлаж, дараа нь устай холилдоно. 90 с хугацааны тогтмол нь жишээ; бодит нягт, эмульс ба эзлэхүүний агшилтыг тооцоогүй.'; break;
    }
    case 'g7-diffusion': {
      const coefficient = p.medium ? .003 : .02;
      const extent = 1 - Math.exp(-(coefficient + (!p.medium && p.airflow ? .04 : 0)) * p.time);
      add('Тархалтын индекс', extent * 100, '% (загвар)'); add('Хугацаа', p.time, 'с');
      observation = `${p.medium ? 'Шингэний' : 'Хийн'} жижиг хэсгүүдийн санамсаргүй хөдөлгөөний схем. ${!p.medium && p.airflow ? 'Агаарын урсгал бүхэл зөөвөрлөлт нэмнэ; цэвэр диффуз биш.' : 'Урсгалгүй хяналтын жишээ.'} Энэ нь өрөөний зай, үнэрлэх босго эсвэл бодит диффузийн коэффициентийг тооцоогүй.`; break;
    }
    case 'g7-phase': {
      const density = p.material ? (p.liquid ? .80 : .90) : (p.liquid ? 1 : .917);
      add('Масс', p.mass, 'г'); add('Нягт', density, 'г/мл'); add('Эзлэхүүн', p.mass / density, 'мл');
      observation = p.material ? 'Парафины нягтын жишээ: хатуу 0.90, шингэн 0.80 г/мл. Хольц ба температураас хамаардаг; масс хадгалагдана.' : 'Мөс шингэн уснаас бага нягттай. Ижил масс хөлдөхөд илүү эзлэхүүн эзэлнэ. Температурын тасралтгүй хамаарлыг тооцоогүй.'; break;
    }
    case 'g7-vapour': {
      const fraction = Math.max(0, Math.min(1, (p.temperature - 10) / 80));
      add('Үлдсэн шингэн спирт', p.amount * (1 - fraction), 'г (схем)'); add('Уур төлөвт спирт', p.amount * fraction, 'г (схем)');
      observation = 'Этанол шингэн ⇌ уур. Шугаман хувирлын хувь нь дүрслэлийн сонголт; уутны даралт, шингэн–уурын тэнцвэр ба хугацааны тооцоо биш. Бодит битүү уутанд шатамхай спирт халаах заавар биш.'; break;
    }
    case 'g7-oxidation': {
      const molarMass = p.metal ? 24.305 : 63.546;
      const reacted = Math.min(p.mass / molarMass, p.oxygen / 1000 * 2) * p.extent / 100;
      const oxygenMass = reacted * 15.999;
      add('Үлдсэн металл', Math.max(0, p.mass - reacted * molarMass), 'г');
      add('Оксид', reacted * (molarMass + 15.999), 'г'); add('Нэгдсэн хүчилтөрөгч', oxygenMass, 'г'); add('Нийт хатуу бүтээгдэхүүн ба үлдэгдэл', p.mass + oxygenMass, 'г');
      observation = p.metal ? 'Магни + хүчилтөрөгч → магнийн оксид. 2Mg + O₂ → 2MgO. Хүчилтөрөгчийн нөөц ба сонгосон хувирлаар хязгаарлав; Mg₃N₂ зэрэг дагалдах бүтээгдэхүүнийг тооцоогүй.' : 'Зэс + хүчилтөрөгч → зэсийн оксид. 2Cu + O₂ → 2CuO. Хар оксид үүсэхэд агаараас хүчилтөрөгч нэгдэнэ. Загвар хувирлын хувийг өгсөн; халаах бодит хурд тооцоогүй.'; break;
    }
    case 'g7-properties': {
      const names = ['Төмөр', 'Хүхэр', 'Хөнгөнцагаан', 'Цайр', 'Фосфор', 'Графит'];
      const metal = [1, 0, 1, 1, 0, 0][p.material];
      add('Металл', metal, '0/1'); add('Цахилгаан дамжуулах', p.material === 5 ? 1 : metal, '0=муу,1=дамжуулна'); add('Соронзонд илт татагдах', p.material === 0 ? 1 : 0, '0/1');
      observation = `${names[p.material]}: ${metal ? 'металл; ерөнхийдөө гялтгана, давтагдана, дулаан сайн дамжуулна.' : p.material === 5 ? 'металл биш боловч цахилгаан дамжуулна; хэврэг.' : 'металл биш; ихэвчлэн цахилгаан муу дамжуулна, хатуу дээж нь хэврэг.'} Энэ нь лавлах ангилал, механик ба дулаан дамжуулах тоон хэмжилт биш. Аллотроп ба дээжийн гадаргуу шинжид нөлөөлнө.`; break;
    }
    case 'g7-density': {
      const volume = p.final - p.initial;
      if (volume <= 0 || p.mass <= 0) {
        add('Заалт хүчинтэй', 0, '0/1');
        observation = 'Нягт тооцохын тулд масс эерэг, дээжтэй усны заалт эхнийхээс их байх ёстой. Хоосон эсвэл зөрүүтэй хэмжилтийг зас.';
      } else {
        add('Дээжийн эзлэхүүн', volume, 'мл'); add('Нягт', p.mass / volume, 'г/мл');
        observation = 'Нягт = масс / (эцсийн − эхний эзлэхүүн). Дээж усанд уусдаггүй, ус шингээдэггүй, бүрэн дүрэгдсэн, хөөсгүй, ус асгараагүй гэж үзэв.';
      }
      break;
    }
    case 'g7-metal-acid': {
      const molarMass = [24.305, 65.38, 55.845, 58.6934, 63.546, 32.06, 12.011][p.material];
      const rate = [.06, .025, .012, .006, 0, 0, 0][p.material];
      const mmol = Math.min(p.mass / molarMass * 1000, p.acid / 2) * (1 - Math.exp(-rate * p.time));
      add('H₂', mmol * 24, 'мл (24 л/моль жишиг)'); add('Үлдсэн HCl', p.acid - 2 * mmol, 'ммоль'); add('Урвалд орсон дээж', mmol * molarMass / 1000, 'г');
      observation = p.material < 4 ? 'Металл + давсны хүчил → металлын хлорид + устөрөгч. Хурдны коэффициентүүд нь жишээ; Ni-ийн пассивац ба металл гадаргуугийн нөхцөлийг тооцоогүй. Хийний гарц металлын моль ба HCl-оор хязгаарлагдана.' : 'Cu, S ба графит шингэрүүлсэн HCl-ээс ийм нөхцөлд H₂ түрж гаргахгүй. Энэ нь бүх төрлийн хүчилтэй ямар ч урвал явагдахгүй гэсэн үг биш.'; break;
    }
    case 'g7-iron-sulfur': {
      const reacted = p.action === 2 ? Math.min(p.iron / 55.845, p.sulfur / 32.06) * p.extent / 100 : 0;
      const iron = Math.max(0, p.iron - reacted * 55.845), sulfur = Math.max(0, p.sulfur - reacted * 32.06);
      add('Үлдсэн Fe', iron, 'г'); add('Үлдсэн S', sulfur, 'г'); add('FeS', reacted * (55.845 + 32.06), 'г'); add('Соронзоор ялгах боломжтой Fe', iron, 'г (идеал)');
      observation = p.action === 2 ? 'Төмөр + хүхэр → төмрийн сульфид. Fe + S → FeS. Илүүдэл төмөр байвал бүтээгдэхүүнтэй хамт үлдэж соронз татна. Цэвэр стехиометрийн FeS-ийг төмрийн хүчтэй соронзон шинжтэй адилтгаагүй; сульфидын бүх фазын соронзон шинжийг загварчлаагүй.' : 'Төмөр ба хүхэр тусдаа эсвэл холимогт өөрийн шинжээ хадгална. Зүгээр холиход FeS үүсээгүй. Усанд хөвөх нь ширхэгийн хэмжээ ба норголтоос бас хамаарна.'; break;
    }
    case 'g7-candle': {
      const burned = p.burn ? Math.min(p.time, p.oxygen ? 60 : 15) : 0;
      add('Загварын шатсан хугацаа', burned, 'с'); add('Шаталтын бүтээгдэхүүн ажиглагдах', burned > 0 ? 1 : 0, '0/1');
      observation = p.burn ? 'Парафин + хүчилтөрөгч → нүүрстөрөгчийн (IV) оксид + ус гэсэн бүрэн шаталтын үгэн тэгшитгэл. O₂ багасахад дөл унтарч болно; 15 с нь сонгосон жишээ, бодит шилний унтрах хугацаа биш. CO/тортгийн гарцыг тооцоогүй.' : 'Хайлсан парафин хөрөхөд буцаан хатуурна; шинэ химийн бодис үүсэхгүй. Халаах болон шатахыг ялга.'; break;
    }
    case 'g7-hydroxide': {
      const charge = p.metal ? 2 : 3;
      const formed = Math.min(p.amount, p.hydroxide / charge);
      const dissolved = p.metal ? 0 : Math.min(formed, Math.max(0, p.hydroxide - 3 * formed));
      add('Тунадас дахь металл', formed - dissolved, 'ммоль'); add('Үлдсэн чөлөөт металл ион', p.amount - formed, 'ммоль');
      add('Ууссан Al комплекс', dissolved, 'ммоль'); add('Үлдсэн OH⁻', p.hydroxide - charge * formed - dissolved, 'ммоль');
      observation = p.metal ? 'Зэсийн хлорид + натрийн гидроксид → зэсийн гидроксид + натрийн хлорид. Cu²⁺ + 2OH⁻ → Cu(OH)₂↓ хөх. Тунадасжих стехиометрийн дээд хэмжээ.' : 'Хөнгөнцагааны хлорид + натрийн гидроксид → хөнгөнцагааны гидроксид + натрийн хлорид. Al³⁺ + 3OH⁻ → Al(OH)₃↓ цагаан. Илүүдэл OH⁻-д Al(OH)₃ + OH⁻ → [Al(OH)₄]⁻. Уусахын тэнцвэрийн нарийн тооцоо биш.'; break;
    }
    case 'g7-rust': {
      const extent = 100 * (1 - Math.exp(-.18 * p.days));
      add('Агааргүй усан дахь индекс', p.dissolved ? Math.min(12, extent * .15) : 0, '% (жишээ)');
      add('Ус ба агаарт буй индекс', extent, '% (жишээ)'); add('Хуурай агаар дахь индекс', 0, '% (жишээ)');
      observation = 'Төмөр зэврэхэд ус ба O₂ хэрэгтэй. Усанд өмнө нь ууссан O₂ байвал тосон үе дангаараа түүнийг арилгахгүй. Хуурай агаарын загварт чийггүй гэж үзэв. Индекс нь бодит зэвний масс эсвэл баталгаат хугацаа биш.'; break;
    }
    case 'g7-corrosion': {
      const rates = [.008, .04, .02, .004];
      add('Гадаргын өөрчлөлтийн индекс', 100 * (1 - Math.exp(-rates[p.metal] * p.days * (p.salt ? 1.8 : 1))), '% (жишээ)');
      observation = ['Ag: харлалт нь агаарт буй хүхрийн нэгдлээс бас хамаарна.', 'Zn: гадаргын оксид/карбонатын үе үүсэж болно.', 'Cu: гадаргын өнгөр төмрийн зэв биш.', 'Al: оксидын хамгаалах үе пассивац үүсгэнэ.'][p.metal] + ' Коэффициентүүд зохиомол; бүх нөхцөлд коррозын эрэмбэ гэж хэрэглэхгүй.'; break;
    }
    case 'g7-protection': {
      for (let salt = 0; salt < 2; salt++) for (let coating = 0; coating < 3; coating++) {
        const factor = coating ? (p.scratched ? .7 : .01) : 1;
        add(`${salt ? 'Давстай ус' : 'Цэвэр ус'} · ${['бүрхүүлгүй', 'тос', 'будаг'][coating]}`, 100 * (1 - Math.exp(-.18 * p.days * (salt ? 1.8 : 1) * factor)), '% (жишээ)');
      }
      observation = 'Зургаан нөхцөл: хоёр ус × гурван бүрхүүл. Бүтэн бүрхүүл тусгаарлаж, сэв нь хамгаалалтыг бууруулна. Тос/будагт ижил жишээ коэффициент сонгосон; бодит эдэлгээ, зэвний масс тооцоогүй.'; break;
    }
    case 'g7-soil-settling': {
      const fractions = [[.8, .15, .05], [.4, .4, .2], [.2, .3, .5]][p.soil];
      const settled = fractions.map((f, i) => f * (1 - Math.exp(-[8, .5, .04][i] * p.hours)));
      settled.forEach((f, i) => add(['Тунасан элс', 'Тунасан лаг', 'Тунасан шавар'][i], f * 100, '% (эхний хатуу хэсгийн схем)'));
      add('Тунаагүй үлдсэн хэсэг', Math.max(0, 1 - settled.reduce((s, v) => s + v, 0)) * 100, '%');
      observation = 'Элс, лаг, шаврын хэмжээ ба тунах коэффициентүүд нь жишээ. Тунасан + тунаагүй = эхний хатуу хэсэг. Энэ нь бодит химийн найрлага эсвэл бүх хөрсний эзлэхүүний шинжилгээ биш.'; break;
    }
    case 'g7-soil-composition': {
      const total = p.mineral + p.organic + p.water;
      if (total > 100) { add('Оруулсан нийт хувь', total, '%'); observation = 'Хэсгүүдийн нийлбэр 100%-аас их байна. Эзлэхүүний бүрдлийн өгөгдлөө зас; сөрөг агаарын хувь харуулаагүй.'; }
      else {
        add('Эрдэс', p.mineral, '%'); add('Органик', p.organic, '%'); add('Ус', p.water, '%'); add('Агаар', 100 - total, '%');
        observation = 'Эзлэхүүний хувиудын жишээ; 45:5:25:25 бүх хөрсөнд тогтмол биш. Харагдах өнгө ба чийгийн сорил дангаараа эдгээр хувийг хэмжсэн гэж үзэхгүй.';
      }
      break;
    }
    case 'g7-growth': {
      const response = Math.exp(-(((p.ph - 6.5) / 2.5) ** 2));
      add('Соёолсон үрийн жишээ тоо', p.weeks === 0 ? 0 : Math.floor(p.seeds * .9 * response), 'ширхэг (загвар)');
      add('Өндрийн жишээ', p.seeds ? p.weeks * 2 * response : 0, 'см (загвар)');
      observation = 'Нэг зохиомол ургамалд pH 6.5 орчимд өсөлтийн индекс өндөр байх муруй сонгов. Бүх ургамалд хамаарах оновчтой pH эсвэл газар тариалангийн зөвлөмж биш. Үрийн төрөл, шим тэжээл, гэрэл ба усалгааг тогтмол гэж үзэв.'; break;
    }
    case 'g7-retention': {
      const capacity = [.3, .8, 1.5][p.soil] * p.mass;
      const retained = Math.min(p.volume, capacity), passing = p.volume - retained;
      const collected = passing * (1 - Math.exp(-p.seconds / [8, 20, 50][p.soil]));
      add('Хөрсөнд баригдах боломжит хэмжээ', retained, 'мл (жишээ)'); add('Шүүгдэс', collected, 'мл'); add('Түр үлдсэн шингэн', passing - collected, 'мл'); add('Нэмсэн шингэн', p.volume, 'мл');
      observation = 'Барих багтаамж ба шүүх хугацааны коэффициентүүд жишээ. Хөрсөнд баригдах + шүүгдэс + түр үлдсэн = нэмсэн хэмжээ. Эхний 0.25 г / 250 мл харьцаа номынх; бодит шатахуунтай туршихгүй. Шүүлтүүр/савны хоосон хяналтыг тооцоогүй тул бодит сорбцын хэмжилт биш.'; break;
    }
    case 'g7-survey': {
      add('Хяналтын pH', p.control, 'pH (жишээ)'); add('Дээжийн pH', p.site, 'pH (жишээ)'); add('pH-ийн ялгаа', p.site - p.control, 'pH');
      observation = 'Өөрийн оруулсан эсвэл зохиомол pH утгууд; бодит шатахуун түгээгүүрийн өгөгдөл биш. pH логарифмын хэмжүүр тул ялгааг хүчиллэгийн хувиар тайлбарлахгүй. Байршлын ялгаа дангаараа шалтгаан эсвэл аюулгүй байдлыг батлахгүй.'; break;
    }
    case 'g7-freezing': {
      const molality = p.salt / 58.44 / (p.water / 1000);
      const freezing = -2 * 1.86 * molality;
      add('Хөлдөх эхлэлийн ойролцоо', freezing, '°C'); add('Орчин эхлэлээс хүйтэн', p.temperature < freezing ? 1 : 0, '0/1');
      observation = 'NaCl-ийн идеал шингэрүүлсэн уусмал: ΔT≈iKf·m, i=2. Их концентрацад бодит идэвх ба фазын диаграмм хэрэгтэй. Орчин хангалттай хүйтэн гэдэг нь дээж тэр даруй бүрэн хөлдөнө гэсэн үг биш; хугацааг тооцоогүй.'; break;
    }
    default: throw new Error(`Unknown Grade 7 model: ${d.model}`);
  }
  return { readings, observation };
}
