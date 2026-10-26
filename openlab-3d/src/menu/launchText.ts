/** Туршилт эхлэхэд Pip-ийн хэлэх үг (цэвэр функц — тест хийхэд хялбар). */
import type { TextbookExperiment } from './chapterBuild';

const list = (items: string[], max = 6): string => (items.length > max ? `${items.slice(0, max).join(', ')} гэх мэт` : items.join(', '));

/** Төгсгөлийн цэгийг хасна — өгүүлбэр дундаа "..", ".." давхардахгүй */
const clean = (text: string): string => text.trim().replace(/[.\s]+$/, '');

/** 3D лабын алхамчилсан заавартай туршилт эхэлсэн үед */
export function guidedMessage(title: string): string {
  return `«${title}» эхэллээ. Зүүн дээд талын “Бэлтгэлээ хийе” картыг дагаарай. Тэнд дараагийн хэрэгсэл болон байршил нь гарна.`;
}

/** Алхамчилсан заавар байхгүй үед: чөлөөт лабораторид JSON-д байгаа бодис, хэрэгслийг хэлнэ */
export function unguidedMessage(experiment: TextbookExperiment): string {
  const page = experiment.page ? ` (х.${experiment.page})` : '';
  const parts = [`«${experiment.title}»${page} туршилтын алхамчилсан заавар хараахан бэлэн болоогүй. Чөлөөт лабораторид өөрөө туршиж үзээрэй.`];
  if (experiment.substances.length > 0) parts.push(`Бодис: ${list(experiment.substances)}.`);
  if (experiment.equipment.length > 0) parts.push(`Хэрэгсэл: ${list(experiment.equipment)}.`);
  if (experiment.safety) parts.push(`Анхаар: ${clean(experiment.safety)}.`);
  return parts.join(' ');
}
