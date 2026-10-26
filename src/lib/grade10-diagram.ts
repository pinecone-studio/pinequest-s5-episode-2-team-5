import type { DiagramShape } from './investigation-diagram';
import type { InvestigationDefinition, Trial } from './textbook-investigations';

/** Shared SVG scene description for native lessons and the OpenLab notebook. */
export function grade10Diagram(def: InvestigationDefinition, trial: Trial): DiagramShape[] {
  const shapes: DiagramShape[] = [];
  const text = (x: number, y: number, value: string, fill = '#94a3b8') => shapes.push({ kind: 'text', x, y, text: value, fill });
  const rect = (x: number, y: number, width: number, height: number, fill: string) => shapes.push({ kind: 'rect', x, y, width, height, fill, stroke: '#94a3b8' });
  const line = (x: number, y: number, x2: number, y2: number, stroke = '#38bdf8') => shapes.push({ kind: 'line', x, y, x2, y2, stroke });
  const circle = (x: number, y: number, r: number, fill: string) => shapes.push({ kind: 'circle', x, y, r, fill });
  const p = trial.parameters, rs = trial.readings;
  const value = (label: string) => rs.find(r => r.label === label)?.value ?? 0;
  const vessel = (x: number, color: string) => { rect(x, 65, 70, 85, 'none'); rect(x + 2, 95, 66, 53, color); };
  text(8, 18, 'Виртуал загвар · хэмжилт биш');
  if (['g10-electrolysis', 'g10-galvanic', 'g10-migration'].includes(def.model)) {
    vessel(30, '#bfdbfe'); vessel(180, '#bfdbfe');
    rect(48, 60, 9, 65, '#94a3b8'); rect(222, 60, 9, 65, '#b77950');
    line(52, 60, 52, 38); line(52, 38, 226, 38); line(226, 38, 226, 60);
    rect(120, 25, 40, 26, '#1e3a5f');
    text(128, 43, def.model === 'g10-galvanic' ? 'V' : 'DC', '#f8fafc');
    line(90, 88, 190, 88); text(108, 80, 'ион');
    if (def.model === 'g10-electrolysis') {
      text(20, 165, 'Катод: M²⁺ → M'); text(170, 165, 'Анод: исэлдэх');
      const mass = value('Катодын масс нэмэгдсэн');
      if (mass > 0) rect(57, 85, Math.min(15, 2 + mass * 100), 40, '#c18b55');
      if (!p.anode && value('O₂') > 0) for (let i = 0; i < 5; i++) circle(213, 125 - i * 8, 2, '#f8fafc');
    } else {
      text(25, 165, def.model === 'g10-galvanic' ? 'Zn: e⁻ өгнө' : 'Cu²⁺ → катод');
      text(170, 165, def.model === 'g10-galvanic' ? 'Cu²⁺: e⁻ авна' : 'CrO₄²⁻ → анод');
    }
    return shapes;
  }
  if (def.model === 'g10-distillation') {
    rect(110, 35, 55, 125, '#384c63');
    ['Хий', 'Бензин', 'Керосин', 'Дизель', 'Тос'].forEach((label, i) => {
      rect(112, 37 + i * 24, 51, 22, ['#bae6fd', '#fef08a', '#facc15', '#d97706', '#78350f'][i]);
      line(165, 48 + i * 24, 200, 48 + i * 24); text(204, 51 + i * 24, label);
    });
    text(8, 55, 'сэрүүн ↑'); text(8, 150, 'халуун ↓'); return shapes;
  }
  if (def.model === 'g10-isomers') {
    const branches: number[][] = [[], [1], [2], [1, 1], [1, 2]];
    const branch = branches[p.isomer], length = 6 - branch.length;
    for (let i = 0; i < length; i++) {
      const x = 30 + i * 42;
      if (i) line(x - 42, 95, x, 95);
      circle(x, 95, 10, '#475569'); text(x - 4, 99, 'C', '#f8fafc');
    }
    branch.forEach((index, i) => {
      const x = 30 + index * 42, y = i === 1 && branch[0] === index ? 142 : 48;
      line(x, 95, x, y); circle(x, y, 10, '#475569'); text(x - 4, y + 4, 'C', '#f8fafc');
    });
    text(12, 178, 'C₆H₁₄ · C-ийн холбоос; H-ийг орхив'); return shapes;
  }
  if (['g10-melting', 'g10-boiling', 'g10-hydrate', 'g10-thiosulfate', 'g10-starch'].includes(def.model)) {
    const starch = value('Иодын өнгөний индекс');
    const color = def.model === 'g10-starch' ? (starch > .2 ? '#312e81' : '#d4a75b') : def.model === 'g10-hydrate' ? (value('Гидратын өнгөний индекс') ? '#2563eb' : '#e2e8f0') : '#bae6fd';
    vessel(100, color); rect(150, 40, 5, 82, '#e2e8f0'); circle(152.5, 125, 6, '#ef4444');
    text(25, 172, def.model === 'g10-starch' ? 'Иодын сорилын схем' : def.model === 'g10-hydrate' ? 'Усгүй ⇌ гидрат' : 'Банн · термометр · дээж');
    if (def.model === 'g10-boiling' && value('Буцлах нөхцөл')) for (let i = 0; i < 5; i++) circle(120 + i * 7, 137 - (i % 3) * 15, 3, '#f8fafc');
    return shapes;
  }
  if (def.model === 'g10-nylon') {
    vessel(100, '#bae6fd'); rect(102, 95, 66, 23, '#fef3c7');
    line(103, 118, 167, 118, '#22c55e'); line(135, 118, 210, 55, '#22c55e');
    text(175, 45, 'найлон-6,10'); text(15, 174, 'Хоёр фазын зааг · амидын холбоо'); return shapes;
  }
  if (def.model === 'g10-viscosity') {
    rect(115, 35, 45, 120, '#fef3c7'); circle(137, 95, 5, '#64748b');
    line(180, 45, 180, 145); line(175, 140, 180, 145); line(185, 140, 180, 145);
    text(15, 175, value('Re') >= 1 ? 'Re ≥ 1 · Стоксын мужийн гадна' : 'Ижил зай · ижил бөмбөлөг'); return shapes;
  }
  // Compare amounts as separate, labelled bars; unlike units never share a scale.
  const unit = rs[0]?.unit, comparable = rs.filter(r => r.unit === unit).slice(0, 3);
  const maximum = Math.max(...comparable.map(r => r.value), 1e-12);
  comparable.forEach((r, i) => {
    text(8, 47 + i * 44, r.label);
    rect(10, 53 + i * 44, Math.max(0, 245 * r.value / maximum), 13, ['#38bdf8', '#f59e0b', '#a78bfa'][i]);
    text(10, 80 + i * 44, `${r.value < .001 && r.value > 0 ? r.value.toExponential(2) : Number(r.value.toPrecision(4))} ${r.unit}`);
  });
  return shapes;
}
