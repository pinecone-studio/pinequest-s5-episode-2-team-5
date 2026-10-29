/**
 * Сурах бичгийн туршилт (JSON-ийн id, жишээ нь "7-26") → 3D лабын алхамчилсан заавар (жишээ нь "g7-indicators").
 *
 * Холбоосыг src/data/textbook-experiments/lab-links.json-д ГАРААР шалгаж хадгалсан: анги + сурах бичгийн
 * хуудас таарч, гол бодис, үзэгдэл нь ижил байвал л холбоно. Эргэлзээтэйг ХОЛБОХГҮЙ — сурагчид буруу
 * туршилт нээхээс, холбоосгүй байх нь дээр.
 *
 * Холбоосгүй туршилт чөлөөт лабораторид нээгдэж, Star JSON-д байгаа бодис, хэрэгслийг хэлнэ.
 * Шинэ холбоос нэмэх: lab-links.json-д `"7-12": "g7-..."` гэж нэг мөр нэмнэ.
 */
import links from '../data/textbook-experiments/lab-links.json';

const LINKS: Readonly<Record<string, string>> = links;

/** 3D лабын заавар байвал түүний id, үгүй бол null */
export function labIdFor(textbookId: string): string | null {
  return Object.prototype.hasOwnProperty.call(LINKS, textbookId) ? LINKS[textbookId] : null;
}
