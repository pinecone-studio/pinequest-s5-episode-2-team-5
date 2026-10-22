import { crystalMass, describe, partId, partKey, useSandbox } from './sandbox';

/** Measured progress guides the order, without locking equipment or changing its position. */
export function experimentGuide(override?: number) {
  const s = useSandbox.getState();
  const entries = Object.entries(s.contents).filter(([id]) => partKey(id) || s.participants.includes(id));
  const mixtures = entries.filter(([id, m]) => describe(id).role !== 'bottle' && describe(id).role !== 'reagentBottle' && m.salt > 0.001);
  const reacted = mixtures.length > 0 && mixtures.every(([, m]) => m.acid < 0.02) && s.rx !== 'acid';
  const crystals = entries.some(([, m]) => crystalMass(m) > 0.01);
  const collected = entries.filter(([id, m]) => ['paper', 'watch', 'crystals'].includes(describe(id).role) && m.salt > 0.001);
  const steps = [
    { letter: 'а', title: '50 см³ хүчил хэмжих', done: s.completed.includes('measure'), items: ['bottle', 'cyl'], hint: 'Хэмжээст цилиндрийг дарж хуваарийг ойроос хар. Хүчлийн шилийг аваад цилиндр рүү R дарж бага багаар цутга. Менискийн доод ирмэгийг 50 см³-д тааруул.' },
    { letter: 'б', title: 'Карбонат нэмэх, хутгах', done: reacted, items: ['beaker', 'jar', 'rod'], hint: 'Хэмжсэн хүчлээ аяганд хий. Na₂CO₃-ыг бага багаар нэмээд савхаар хутга. Сүүлийн нэмэлт хий ялгаруулахгүй болохыг хүлээ.' },
    { letter: 'в', title: 'Уусмалыг шүүх', done: s.completed.includes('filter'), items: ['stack', 'funnel', 'flask'], hint: 'Цаасыг юүлүүрт хий. Юүлүүрийг колбоны дээр байрлуулаад аяган дахь уусмалаа аажмаар цутга. Цаасны ирмэгээс бүү хэтрүүл.' },
    { letter: 'г', title: 'Ууршуулах', done: s.completed.includes('heat') && crystals, items: ['flask', 'dish', 'lamp'], hint: 'Шүүгдсээ ууршуулагч аяганд хий. Дэнг асааж халаа. Ирмэгт анхны талст гармагц дэнг унтраа; хуурай болтол бүү халаа.' },
    { letter: 'д', title: 'Хөргөж талстжуулах', done: crystals && entries.some(([, m]) => crystalMass(m) > 0.01 && m.temp < 30), items: ['dish'], hint: 'Дэнг унтрааж, аягыг хөдөлгөлгүй хөргө. Температур бууж, талст үүсэхийг ажигла.' },
    { letter: 'е', title: 'Талстыг ялгах', done: collected.length > 0, items: ['dish', 'paper', 'watch'], hint: 'Үүссэн талстаа шүүлтүүрийн цаас эсвэл цагны шил дээр цуглуул. Эх уусмалд үлдэх давс гарцыг багасгана.' },
    { letter: 'ж', title: 'Талстыг хатаах', done: collected.some(([, m]) => m.ml < 0.2), items: ['paper', 'watch'], hint: 'Нойтон талстыг цаас эсвэл цагны шил дээр дэлгэж хатаа. Үлдсэн шингэний хэмжээ буурахыг ажигла.' },
    { letter: 'з', title: 'Микроскопоор харах', done: s.completed.includes('microscope'), items: ['slide', 'scope'], hint: 'Талстаас шилэн хавтас дээр дээж тавиад микроскопын дэргэд байрлуул. Микроскопыг ашиглан фокусаа тохируул.' },
  ];
  const first = steps.findIndex((step) => !step.done);
  const index = override === undefined ? (first < 0 ? steps.length - 1 : first) : Math.max(0, Math.min(steps.length - 1, override));
  const current = steps[index];
  const cylinder = entries.find(([id, m]) => ['cyl', 'graduatedCylinder'].includes(describe(id).role) && m.ml > 0)?.[1] ?? s.contents[partId('cyl')];
  const dish = s.contents[partId('dish')];
  let warning = s.warning;
  if (s.rx === 'acid') warning = 'Хий ялгарч байна. Хүчлийг бүрэн урвалд оруулж дуусахаас өмнө шүүх, халаах алхам руу бүү яар.';
  else if (s.lit && dish && dish.ml < 1 && dish.temp > 50) warning = 'Хэт хуурай болтол халааж байна! Үсрэх, түлэгдэх эрсдэлтэй — дэнг унтраа.';
  else if (cylinder && cylinder.ml > 51 && !steps[0].done) warning = `Цилиндрт ${cylinder.ml.toFixed(1)} см³ байна — 50 см³-ээс их. Бага зэрэг буцааж асгаад дахин унш.`;
  else if (cylinder && cylinder.ml > 0 && cylinder.ml < 49 && !steps[0].done) warning = `Цилиндрт ${cylinder.ml.toFixed(1)} см³ байна. 50 см³ хүрэхэд бага багаар нэмж цутга; хуваарийг урдаас нь унш.`;
  return { steps, index, current, recommended: current.items.map((key) => partId(key as Parameters<typeof partId>[0])), warning, finished: steps.every((step) => step.done) };
}
