import type { InvestigationDefinition, Trial } from './textbook-investigations';

/** Deliberately bounded teaching models. Numeric outputs are not empirical readings.
 * Amounts are mmol unless a label says otherwise. No lab store is imported here. */
export function grade10Model(d: InvestigationDefinition, p: Record<string, number>): Pick<Trial, 'readings' | 'observation'> {
  const readings: Trial['readings'] = [];
  const add = (label: string, value: number, unit: string) => {
    if (!Number.isFinite(value)) throw new Error(`Non-finite Grade 10 reading: ${label}`);
    readings.push({ label, value, unit });
  };
  let observation = '';
  switch (d.model) {
    case 'g10-mole': {
      const n = p.mass / p.molarMass;
      add('Бодисын тоо хэмжээ', n, 'моль'); add('Жижиг хэсгийн тоо', n * 6.02214076e23, 'ширхэг');
      observation = 'n=m/M; N=nNₐ. Жижиг хэсгийн төрөл нь бодисоос хамаарч атом, молекул эсвэл томьёоны нэгж байна.'; break;
    }
    case 'g10-solution': {
      const n = p.concentration * p.volume / 1000;
      add('Шаардагдах моль', n, 'моль'); add('Жинлэх масс', n * p.molarMass, 'г');
      observation = 'Уусгаад хэмжүүрт колбонд тэмдэг хүртэл шингэрүүлнэ. Эцсийн уусмалын эзлэхүүнийг хэрэглэв; нэмэх усны эзлэхүүнийг шууд тэнцүүлээгүй.'; break;
    }
    case 'g10-melting': {
      const low = p.impure ? 118 : 122.4, high = p.impure ? 121 : 122.4;
      add('Хайлах эхлэл', low, '°C'); add('Хайлах төгсгөл', high, '°C');
      add('Хайлсан хэсэг', high === low ? (p.temperature >= high ? 100 : 0) : Math.max(0, Math.min(100, (p.temperature - low) / (high - low) * 100)), '% (схем)');
      observation = 'Бензойны хүчлийн номын жишээ муж. Термометрийн хоцролт, халаалтын хурд, бодит хольцын найрлагыг тооцоогүй.'; break;
    }
    case 'g10-boiling': {
      // Clausius–Clapeyron with constant approximate acetone ΔHvap = 29.1 kJ/mol.
      const boiling = 1 / (1 / 329.15 - 8.314 / 29100 * Math.log(p.pressure / 101.325)) - 273.15;
      add('Тооцоолсон буцлах цэг', boiling, '°C'); add('Буцлах нөхцөл', p.temperature >= boiling ? 1 : 0, '0/1');
      observation = 'Ацетон: тогтмол уурших энтальпийн ойролцоо загвар. Усан банны температур ба дээжийн буцлах цэгийг ялга; шууд дөл хэрэглэхгүй.'; break;
    }
    case 'g10-thiosulfate': {
      const t = 60 * .1 / p.concentration / 2 ** ((p.temperature - 25) / 10);
      add('Хэрээс далдрах хугацаа', t, 'с (жишээ)'); add('Харьцангуй хурд 1/t', 1 / t, 'с⁻¹');
      observation = 'Na₂S₂O₃ + 2HCl → 2NaCl + SO₂ + S↓ + H₂O. Хүчил илүүдэлтэй, ижил оптик босготой жишээ. SO₂ бодитоор үүсгээгүй.'; break;
    }
    case 'g10-hydrate': {
      const hydrated = p.water && p.temperature < 100 ? 1 : 0;
      add('Гидратын өнгөний индекс', hydrated, '0=цагаан, 1=хөх');
      observation = 'CuSO₄·5H₂O ⇌ CuSO₄ + 5H₂O. Хялбаршуулсан өнгөний схем; завсрын гидрат ба усны уурын даралтын тэнцвэрийг тооцоогүй.'; break;
    }
    case 'g10-equilibrium': {
      // Solve x = K(a-x)(b-x) in mmol/L; K/1000 = 1 here.
      let lo = 0, hi = Math.min(p.iron, p.scn);
      for (let i = 0; i < 70; i++) { const x = (lo + hi) / 2; if ((p.iron - x) * (p.scn - x) > x) lo = x; else hi = x; }
      const x = (lo + hi) / 2;
      add('FeSCN²⁺', x, 'ммоль/л'); add('Үлдсэн Fe³⁺', p.iron - x, 'ммоль/л'); add('Үлдсэн SCN⁻', p.scn - x, 'ммоль/л');
      observation = 'Fe³⁺ + SCN⁻ ⇌ FeSCN²⁺. K=1000 л/моль, идеал шингэрүүлсэн уусмалын жишээ; бусад комплексийг оруулаагүй. Улаан өнгө комплексийн хэмжээтэй холбоотой.'; break;
    }
    case 'g10-no2': {
      const temperature = p.temperature + 273.15;
      const k = .010 * Math.exp(-57000 / 8.314 * (1 / temperature - 1 / 298.15));
      const initial = .010 / p.volume;
      let lo = 0, hi = initial;
      for (let i = 0; i < 70; i++) { const x = (lo + hi) / 2; if (4 * x * x < k * (initial - x)) lo = x; else hi = x; }
      const x = (lo + hi) / 2;
      add('N₂O₄', (initial - x) * p.volume * 1000, 'ммоль'); add('NO₂', 2 * x * p.volume * 1000, 'ммоль');
      add('NO₂ концентраци', 2 * x, 'моль/л'); add('Нийт даралт', (initial + x) * 8.314 * temperature, 'кПа');
      observation = 'N₂O₄ ⇌ 2NO₂. Kc(25°C)=0.010 моль/л ба ΔH=57 кЖ/моль гэсэн сургалтын жишээ. Халаахад диссоциаци өснө; шахахад молекулын тоо цөөн тал дэмжигдэнэ. Өнгө нь концентрацаас хамаарна.'; break;
    }
    case 'g10-haber': {
      const temperature = p.temperature + 273.15;
      const k = 1e-4 * Math.exp(92400 / 8.314 * (1 / temperature - 1 / 700));
      let lo = 0, hi = 1;
      for (let i = 0; i < 80; i++) {
        const x = (lo + hi) / 2, total = 4 - 2 * x;
        const nitrogen = (1 - x) / total * p.pressure, hydrogen = 3 * nitrogen, ammonia = 2 * x / total * p.pressure;
        if (ammonia * ammonia < k * nitrogen * hydrogen ** 3) lo = x; else hi = x;
      }
      const x = (lo + hi) / 2;
      add('N₂ үлдсэн', 1 - x, 'моль'); add('H₂ үлдсэн', 3 - 3 * x, 'моль'); add('NH₃', 2 * x, 'моль'); add('N₂-ийн хувирал', x * 100, '%');
      observation = 'N₂ + 3H₂ ⇌ 2NH₃. Kp(700K)=10⁻⁴ ба ΔH=−92.4 кЖ/моль гэсэн идеал жишээ; стандарт даралт 1 бар. Өндөр даралтын бодит хийн үл идеал чанар, кинетик, дахин эргэлтийг тооцоогүй. Катализатор тэнцвэрийн байршлыг өөрчлөхгүй.'; break;
    }
    case 'g10-migration': {
      const distance = Math.min(5, p.voltage * p.time * .005);
      add('Cu²⁺ катодын зүг', distance, 'см (схем)'); add('CrO₄²⁻ анодын зүг', distance, 'см (схем)');
      observation = 'Эсрэг цэнэгтэй ионууд эсрэг электродын зүг шилжинэ. Ижил зөөгдөх коэффициент зөвхөн дүрслэлийн сонголт; бодит хөдөлгөөнт чанар ба электродын урвалыг тооцоогүй.'; break;
    }
    case 'g10-galvanic': {
      const e = 1.10 - .05916 / 2 * Math.log10(p.zinc / p.copper);
      add('Нэг хэлхээний хүчдэл', e, 'В'); add('Угсраа нийт хүчдэл', p.cells * e, 'В');
      observation = 'Zn + Cu²⁺ → Zn²⁺ + Cu. 25°C, идэвхийг концентрацаар орлуулсан нээлттэй хэлхээний Нернстийн загвар; дотоод эсэргүүцэл ба ачааллын гүйдлийг тооцоогүй.'; break;
    }
    case 'g10-electrolysis': {
      const requested = p.current * p.time / 96485.33212 / 2 * 1000;
      const deposited = p.anode ? requested : Math.min(p.amount, requested);
      const molarMass = p.nickel ? 58.6934 : 63.546;
      add('Металл ялгарсан хэмжээ', deposited, 'ммоль'); add('Катодын масс нэмэгдсэн', deposited * molarMass / 1000, 'г');
      add('Анодын масс буурсан', p.anode ? deposited * molarMass / 1000 : 0, 'г');
      add('Үлдсэн металл ион', p.anode ? p.amount : Math.max(0, p.amount - deposited), 'ммоль');
      add('O₂', p.anode ? 0 : deposited / 2 * 24.8, 'мл (25°C,100кПа)');
      observation = `${p.nickel ? 'Ni²⁺' : 'Cu²⁺'} + 2e⁻ → ${p.nickel ? 'Ni' : 'Cu'}. ${p.anode ? 'Уусдаг металл анод ионыг нөхөн өгнө; анодын нөөц илүүдэл гэж үзэв.' : 'Инерт анод: 2H₂O → O₂ + 4H⁺ + 4e⁻. Металл ион дуусмагц энэ загварын металл ялгаралт зогсоно.'} 100% гүйдлийн гарц; өрсөлдөх H₂-ийг тооцоогүй.`;
      if (p.amount === 0) {
        readings.splice(0); add('Металл ялгарсан хэмжээ', 0, 'ммоль');
        observation = 'Эхний металл ионгүй бол металл бүрэх ажиллагааг эхлүүлээгүй. Электролит, электродын нөхцөл хэрэгтэй.';
      }
      break;
    }
    case 'g10-limestone': {
      const x = p.amount * p.extent / 100;
      add('Хувирсан эх бодис', x, 'ммоль'); add('Үлдсэн эх бодис', p.amount - x, 'ммоль');
      if (p.stage === 0) { add('CO₂', x * 24.8, 'мл (25°C,100кПа)'); add('CaO', x * 56.077 / 1000, 'г'); }
      else if (p.stage === 1) add('Ca(OH)₂', x * 74.093 / 1000, 'г');
      else add('CaCO₃ тунадас', x * 100.086 / 1000, 'г');
      observation = ['CaCO₃ → CaO + CO₂. Өндөр температурын задрал; хөргөсөн хийн эзлэхүүн.', 'CaO + H₂O → Ca(OH)₂. Ус илүүдэл, дулаан ялгарна.', 'Ca(OH)₂ + CO₂ → CaCO₃↓ + H₂O. CO₂-ийн илүүдэлд дахин уусахыг тооцоогүй.'][p.stage]; break;
    }
    case 'g10-sulfur': {
      const x = p.heated ? Math.min(p.copper, p.acid / 2) : 0;
      add('CuSO₄', x, 'ммоль'); add('SO₂', x * 24.8, 'мл (25°C,100кПа)'); add('Үлдсэн Cu', p.copper - x, 'ммоль');
      observation = 'Cu + 2H₂SO₄(конц) → CuSO₄ + SO₂ + 2H₂O. Халуун үед бүрэн хувирсан гэж үзсэн стехиометрийн дээд хязгаар; хурд тооцоогүй. Шингэрүүлсэн хүчилд энэ үр дүнг хэрэглэхгүй.'; break;
    }
    case 'g10-combustion': {
      const x = Math.min(p.methane, p.oxygen / 2);
      add('Бүрэн шатах CH₄ дээд хэмжээ', x, 'ммоль'); add('CO₂', x, 'ммоль'); add('H₂O', 2 * x, 'ммоль'); add('Бүрэн шатахад дутсан O₂', Math.max(0, 2 * p.methane - p.oxygen), 'ммоль');
      observation = 'CH₄ + 2O₂ → CO₂ + 2H₂O. O₂ дутвал бодит CO, тортог ба CO₂-ийн тархалтыг энэ тооцоо гаргахгүй; зөвхөн бүрэн шаталтын дээд хязгаар.'; break;
    }
    case 'g10-distillation': {
      const index = p.temperature < 40 ? 0 : p.temperature < 180 ? 1 : p.temperature < 250 ? 2 : p.temperature < 350 ? 3 : 4;
      add('Фракцын муж', index, '0=хий,1=бензин,2=керосин,3=дизель,4=тос'); add('Температур', p.temperature, '°C');
      observation = ['Хий', 'Бензин', 'Керосин', 'Дизель', 'Хүнд тос'][index] + ' — хялбаршуулсан буцлах муж. Фракц нь холимог; бодит баганын температурын профиль, фракцын гарц ба давхцлыг тооцоогүй.'; break;
    }
    case 'g10-viscosity': {
      const mu = p.viscosity / 1000, r = p.radius / 1000;
      const velocity = 2 * (2500 - 900) * 9.80665 * r * r / (9 * mu);
      const reynolds = 900 * velocity * 2 * r / mu;
      add('Re', reynolds, '');
      if (reynolds < 1) { add('Терминал хурд', velocity, 'м/с'); add('Унах хугацаа', p.distance / 100 / velocity, 'с'); }
      observation = reynolds >= 1 ? 'Re≥1: сонгосон нөхцөл Стоксын удаан урсгалын мужид орохгүй. Радиусыг багасгах эсвэл зууралдлагыг өсгө; хугацааны таамаглал харуулаагүй.' : 'Стоксын загвар; хана ба эхний хурдатгалыг тооцоогүй. Ижил температурт харьцуул. Нягтууд 2500 ба 900 кг/м³ гэсэн жишээ.'; break;
    }
    case 'g10-cracking': case 'g10-ethene': {
      const x = p.amount * p.extent / 100;
      add('Үлдсэн эх бодис', p.amount - x, 'ммоль'); add('Этен', x, 'ммоль');
      observation = d.model === 'g10-cracking' ? 'C₁₀H₂₂ → C₈H₁₈ + C₂H₄. Нэг боломжит зам; хувирлыг хэрэглэгч сонгосон, кинетикийн таамаглал биш.' : 'C₂H₅OH → C₂H₄ + H₂O. Ус ялгаруулах хувирал; хүчтэй хүчил ба өндөр температурын ажиллагааг бодитоор гүйцэтгээгүй.';
      break;
    }
    case 'g10-isomers': {
      const names = ['Гексан', '2-метилпентан', '3-метилпентан', '2,2-диметилбутан', '2,3-диметилбутан'];
      const structures = ['CH₃–CH₂–CH₂–CH₂–CH₂–CH₃', 'CH₃–CH(CH₃)–CH₂–CH₂–CH₃', 'CH₃–CH₂–CH(CH₃)–CH₂–CH₃', 'CH₃–C(CH₃)₂–CH₂–CH₃', 'CH₃–CH(CH₃)–CH(CH₃)–CH₃'];
      add('Нүүрстөрөгчийн атом', 6, ''); add('Устөрөгчийн атом', 14, ''); add('Буцлах цэг (ойролцоо)', [68.7, 60.3, 63.3, 49.7, 58.0][p.isomer], '°C (1атм)');
      observation = `${names[p.isomer]}: ${structures[p.isomer]}. Молекул томьёо C₆H₁₄ хэвээр; холбоосын дараалал өөр.`; break;
    }
    case 'g10-alkene': {
      const x = Math.min(p.alkene, p.bromine);
      add('C₂H₄Br₂', x, 'ммоль'); add('Үлдсэн Br₂', p.bromine - x, 'ммоль'); add('Үлдсэн этен', p.alkene - x, 'ммоль');
      observation = 'CH₂=CH₂ + Br₂ → CH₂Br–CH₂Br. Зөвхөн сонгосон нэгдэх замын 1:1 баланс. Алкантай харанхуй нөхцөлд ийм нэгдэх урвал явагдахгүй.'; break;
    }
    case 'g10-oxidation': {
      const x = Math.min(p.ethanol / 3, p.dichromate / 2);
      add('CH₃COOH', 3 * x, 'ммоль'); add('Cr³⁺', 4 * x, 'ммоль'); add('Үлдсэн Cr₂O₇²⁻', p.dichromate - 2 * x, 'ммоль');
      observation = '3C₂H₅OH + 2Cr₂O₇²⁻ + 16H⁺ → 3CH₃COOH + 4Cr³⁺ + 11H₂O. Улбар шар → ногоон, H⁺ илүүдэл; альдегидийн завсрын шат ба бодит шинжилгээний калибровк биш.'; break;
    }
    case 'g10-fermentation': {
      const k = p.temperature >= 50 ? 0 : .035 * Math.exp(-(((p.temperature - 32) / 18) ** 2));
      const x = p.glucose * (1 - Math.exp(-k * p.time));
      add('Үлдсэн глюкоз', p.glucose - x, 'ммоль'); add('Этанол', 2 * x, 'ммоль'); add('CO₂', 2 * x * 24.8, 'мл (25°C,100кПа)');
      observation = 'C₆H₁₂O₆ → 2C₂H₅OH + 2CO₂. Энзимийн идэвхийн сонгосон муруй; исгэгчийн бодит өсөлт, этанолын дарангуйлал, ууссан CO₂-ийг тооцоогүй.'; break;
    }
    case 'g10-ester': {
      let lo = 0, hi = Math.min(p.acid, p.ethanol);
      for (let i = 0; i < 70; i++) { const x = (lo + hi) / 2; if (x * (p.water + x) < 4 * (p.acid - x) * (p.ethanol - x)) lo = x; else hi = x; }
      const x = (lo + hi) / 2;
      add('Этил этаноат', x, 'ммоль'); add('Үлдсэн хүчил', p.acid - x, 'ммоль'); add('Үлдсэн этанол', p.ethanol - x, 'ммоль'); add('Ус', p.water + x, 'ммоль');
      observation = 'CH₃COOH + C₂H₅OH ⇌ CH₃COOC₂H₅ + H₂O. K=4, тогтмол эзлэхүүнтэй идеал жишээ. Хүчиллэг катализатор тэнцвэрт хүрэх хугацааг өөрчилнө; байршлыг өөрчлөхгүй.'; break;
    }
    case 'g10-nylon': {
      const initial = p.diamine + p.diacyl;
      // Each amide bond consumes one amine and one acyl chloride and releases one HCl.
      const bonds = 2 * Math.min(p.diamine, p.diacyl) * p.extent / 100;
      add('Амидын холбоо', bonds, 'ммоль'); add('HCl', bonds, 'ммоль'); add('Үлдсэн –NH₂', 2 * p.diamine - bonds, 'ммоль'); add('Үлдсэн –COCl', 2 * p.diacyl - bonds, 'ммоль');
      add('Дундаж полимержилтийн зэрэг', initial ? initial / (initial - bonds) : 0, 'мономер/гинж');
      observation = 'Найлон-6,10; NH₂–(CH₂)₆–NH₂ ба ClCO–(CH₂)₈–COCl. Цикл үүсэхгүй идеал шаталсан полимержилт; төгсгөлийн бүлэг ба мономерийн харьцааг хадгалсан. Хоёр фазын диффузийг тооцоогүй.'; break;
    }
    case 'g10-starch': {
      const k = p.condition === 0 ? .003 * 2 ** ((p.temperature - 25) / 10) : p.condition === 1 ? 0 : p.temperature >= 60 ? 0 : .12 * Math.exp(-(((p.temperature - 37) / 20) ** 2));
      const remaining = Math.exp(-k * p.time);
      add('Үлдсэн цардуулын индекс', remaining * 100, '% (загвар)'); add('Иодын өнгөний индекс', remaining, '0–1 (хөх-хар)');
      observation = 'Хүчил, NaOH ба амилаза × температурын есөн нөхцөлийг харьцуул. Энзимийн денатурацийн босго ба хурдны коэффициент нь жишээ. Өнгө буурах нь дангаараа глюкозын сорил биш.'; break;
    }
    case 'g10-audit': {
      const total = p.bottles + p.bags, reused = Math.min(total, p.reused);
      add('Нийт масс', total, 'г'); add('Дахин ашиглах масс', reused, 'г'); add('Дахин ашиглах хувь', total ? reused / total * 100 : 0, '%');
      observation = p.reused > total ? 'Оруулсан дахин ашиглах масс нийтээс их тул нийт массаар хязгаарлав. Бүртгэлээ шалга.' : 'Оруулсан массын бүртгэл; бодит улсын дахин боловсруулалтын статистик биш.'; break;
    }
    default: throw new Error(`Unknown Grade 10 model: ${d.model}`);
  }
  return { readings, observation };
}
