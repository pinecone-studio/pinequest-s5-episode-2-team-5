/**
 * "Туршилтын карт": анги, бүлэг, сэдэв, гарчиг, сурах бичгийн хуудас, хугацаа, аюулгүй байдал, хийх дараалал, "Туршилтыг эхлэх" товч.
 * Хийх дараалал нь JSON-ийн `procedure` баганаас (химичийн бичсэн). Бичээгүй туршилтад энэ хэсэг огт харагдахгүй.
 * Товч нь доор тогтмол байрлана (агуулга урт байвал дотроо гүйлгэнэ), ингэснээр нам дэлгэцтэй утсанд ч үргэлж харагдана.
 */
import { sounds } from '../utils/sounds';
import type { TextbookExperiment } from './chapterBuild';

interface ExperimentScreenProps {
  experiment: TextbookExperiment;
  /** 3D лабт алхамчилсан заавартай эсэх. false бол "удахгүй" гэж харуулж, чөлөөт лабт нээнэ */
  guided: boolean;
  onStart: () => void;
}

export function ExperimentScreen({ experiment, guided, onStart }: ExperimentScreenProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scrollbar-thin flex-1 overflow-y-auto px-4 pb-4 pt-2">
        <p className="text-sm text-t-ink-soft">
          {experiment.grade}-р анги · {experiment.chapter}
        </p>
        <p className="mt-1 text-sm font-bold">{experiment.section}</p>
        <h1 className="mt-3 font-heading text-xl font-extrabold leading-snug">
          {experiment.showcase && (
            <span className="mr-2 text-t-accent" role="img" aria-label="Онцлох туршилт">
              ★
            </span>
          )}
          {experiment.title}
        </h1>

        <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
          {experiment.page && <span className="rounded-full bg-t-card px-3 py-1.5">Сурах бичиг х.{experiment.page}</span>}
          {experiment.duration && <span className="rounded-full bg-t-card px-3 py-1.5">⏱ {experiment.duration}</span>}
        </div>

        {experiment.safety && (
          <div className="mt-4 flex gap-3 rounded-2xl bg-t-card p-4">
            <span aria-hidden="true" className="text-t-accent">
              ⚠
            </span>
            <p className="text-sm leading-relaxed">
              <span className="font-bold">Аюулгүй байдал: </span>
              {experiment.safety}
            </p>
          </div>
        )}

        {experiment.procedure.length > 0 && (
          <section className="mt-4 rounded-2xl bg-t-card p-4" aria-labelledby="procedure-title">
            <h2 id="procedure-title" className="font-heading text-sm font-bold">
              Хэрхэн хийх
            </h2>
            <ol className="mt-3 grid gap-3">
              {experiment.procedure.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-t-accent font-heading text-xs font-extrabold text-t-accent-ink">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {!guided && (
          <p className="mt-4 rounded-2xl bg-t-card p-4 text-sm leading-relaxed text-t-ink-soft">
            Энэ туршилтын алхамчилсан заавар удахгүй нэмэгдэнэ. Одоохондоо чөлөөт лабораторид өөрөө туршиж үзэхэд Pip бодис, хэрэгслийг хэлж өгнө.
          </p>
        )}
      </div>

      <div className="shrink-0 px-4 pb-4 pt-2">
        <button
          type="button"
          onClick={() => {
            sounds.play('ui');
            onStart();
          }}
          className="min-h-14 w-full rounded-2xl bg-t-accent px-8 font-heading text-lg font-extrabold text-t-accent-ink shadow-[0_6px_0_rgba(0,0,0,0.22)] transition active:translate-y-[3px] active:shadow-[0_3px_0_rgba(0,0,0,0.22)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          ▶ Туршилтыг эхлэх
        </button>
      </div>
    </div>
  );
}
