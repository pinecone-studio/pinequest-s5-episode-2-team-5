import type { DiagramShape } from './investigation-diagram';
import type { InvestigationDefinition, Trial } from './textbook-investigations';

/** Shared scene descriptions: native SVG in lessons and browser SVG in OpenLab. */
export function grade7Diagram(def: InvestigationDefinition, trial: Trial): DiagramShape[] {
  const out: DiagramShape[] = [];
  const text = (x: number, y: number, text: string) => out.push({ kind: 'text', x, y, text, fill: '#cbd5e1' });
  const rect = (x: number, y: number, width: number, height: number, fill: string) => out.push({ kind: 'rect', x, y, width, height, fill, stroke: '#94a3b8' });
  const circle = (x: number, y: number, r: number, fill: string) => out.push({ kind: 'circle', x, y, r, fill });
  const p = trial.parameters;
  text(10, 18, 'Виртуал схем · бодит хэмжилт биш');
  if (def.model === 'g7-layers') {
    rect(90, 35, 100, 115, 'none');
    const total = p.water + p.oil + p.syrup;
    if (total > 0) {
      const mix = 1 - Math.exp(-p.time / 90), syrup = p.water ? p.syrup * (1 - mix) : p.syrup;
      let bottom = 148;
      for (const [amount, color] of [[syrup, '#b45309'], [p.water + p.syrup - syrup, '#38bdf8'], [p.oil, '#facc15']] as const) {
        const height = amount / total * 110; bottom -= height; rect(92, bottom, 96, height, color);
      }
    }
    text(32, 172, 'Тос ↑ · ус/сироп аажим холилдоно'); return out;
  }
  if (def.model === 'g7-diffusion') {
    rect(35, 40, 210, 108, '#172554');
    const extent = trial.readings[0].value / 100;
    for (let i = 0; i < 32; i++) circle(50 + (i * 43 % 180) * extent, 55 + i * 23 % 78, 3, '#a78bfa');
    text(25, 172, p.medium ? 'Шингэн дэх тархалтын индекс' : p.airflow ? 'Хий + агаарын урсгал' : 'Хийн тархалтын индекс'); return out;
  }
  if (def.model === 'g7-iron-sulfur') {
    const iron = trial.readings[0].value, sulfur = trial.readings[1].value, product = trial.readings[2].value;
    const amounts = [iron, sulfur, product], sum = amounts.reduce((a, b) => a + b, 0);
    amounts.forEach((mass, j) => {
      text(20 + j * 85, 48, ['Fe', 'S', 'FeS'][j]);
      for (let i = 0; i < (sum ? Math.round(mass / sum * 30) : 0); i++) circle(30 + j * 85 + i % 4 * 10, 72 + Math.floor(i / 4) * 10, 4, ['#94a3b8', '#facc15', '#475569'][j]);
    });
    text(15, 174, p.action === 2 ? 'Fe үлдвэл соронзонд татагдана' : 'Холиход шинэ нэгдэл үүсээгүй'); return out;
  }
  if (def.model === 'g7-soil-settling' || def.model === 'g7-soil-composition') {
    rect(100, 35, 80, 115, 'none');
    const percentages = trial.readings.length === 4 ? trial.readings.map(r => Math.max(0, r.value)) : [];
    let bottom = 148;
    percentages.forEach((value, i) => { const height = value / 100 * 110; bottom -= height; rect(102, bottom, 76, height, ['#d6b887', '#7c6654', '#38bdf8', '#cbd5e1'][i]); });
    text(18, 172, 'Өгөгдсөн бүрдлийн хувийн схем'); return out;
  }
  if (def.model === 'g7-density') {
    [p.initial, p.final].forEach((value, i) => { rect(55 + i * 115, 40, 48, 110, 'none'); rect(57 + i * 115, 148 - value, 44, value, '#38bdf8'); });
    text(40, 172, 'Эхний ус'); text(156, 172, 'Дээжтэй ус'); return out;
  }
  if (def.model === 'g7-growth') {
    rect(105, 120, 70, 35, '#7c6654');
    const height = Math.min(80, (trial.readings[1]?.value ?? 0) * 10);
    rect(138, 120 - height, 4, height, '#4ade80');
    if (height > 0) { circle(128, 120 - height / 2, 9, '#4ade80'); circle(151, 125 - height / 2, 9, '#4ade80'); }
    text(18, 174, 'Зохиомол ургамал · ижил нөхцөл'); return out;
  }
  // Bar scales always group one physical unit. Negative quantities use a zero axis.
  const unit = trial.readings[0]?.unit, rows = trial.readings.filter(r => r.unit === unit).slice(0, 4);
  const maximum = Math.max(1e-12, ...rows.map(r => Math.abs(r.value)));
  rows.forEach((r, i) => {
    text(8, 42 + i * 34, r.label);
    rect(10, 48 + i * 34, Math.abs(r.value) / maximum * 245, 10, ['#38bdf8', '#f59e0b', '#a78bfa', '#4ade80'][i]);
    text(10, 70 + i * 34, `${Number(r.value.toPrecision(4))} ${r.unit}`);
  });
  return out;
}
