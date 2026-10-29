/**
 * "Туршилтыг эхлэх" — сонгосон сурах бичгийн туршилтыг 3D лабт эхлүүлнэ.
 * Хуучин цэсний "▶ Энэ туршилтыг эхлүүлэх" товчтой ЯГ ИЖИЛ дарааллаар ажиллана (selectBenchExperiment → resumeWalk → Star),
 * ингэснээр лабын одоо байгаа, шалгагдсан урсгал өөрчлөгдөхгүй.
 */
import { resumeWalk } from '../controls/useGameKeys';
import { experimentById, type Experiment } from '../lab/experiments';
import { clearTextbookSupplies, demonstratePreparation, leaveBenchExperiment, selectBenchExperiment, suppliesFor, useWorkbench } from '../experiments/workbench/session';
import { playerApi, useGameStore } from '../store/useGameStore';
import { useLabStore } from '../store/useLabStore';
import { sounds } from '../utils/sounds';
import type { TextbookExperiment } from './chapterBuild';
import { labIdFor } from './labLinks';
import { guidedMessage, unguidedMessage } from './launchText';
import { useLaunchedProcedure, type TextbookPrep } from './launchedProcedure';
import { bookSupplies, setLaunchedBook } from '../experiments/workbench/bookSupplies';
import { bench, enterBench } from '../experiments/nacl/bench';
import { requestShowcase } from '../experiments/workbench/guidance/launch-store';
import { physicalShowcasePlan } from '../experiments/workbench/guidance/plans';

/** Энэ туршилтын 3D лабын алхамчилсан заавар. Холбоогүй эсвэл лабын жагсаалтад байхгүй бол undefined */
export function guideFor(experiment: TextbookExperiment): Experiment | undefined {
  const labId = labIdFor(experiment.id);
  return labId ? experimentById(labId) : undefined;
}

/** «Бэлтгэлээ хийе» жагсаалт: сурах бичгийн JSON-ийн бодис, хэрэгсэл, аюулгүй байдал */
function prepFor(experiment: TextbookExperiment): TextbookPrep {
  return { id: experiment.id, substances: experiment.substances, equipment: experiment.equipment, safety: experiment.safety };
}

/** Цэснээс сүүлд эхлүүлсэн туршилт: нэг лабын заавартай хэд хэдэн туршилт өөр өөр жагсаалттай */
let launchedId: string | null = null;

export function startTextbookExperiment(experiment: TextbookExperiment): void {
  const lab = guideFor(experiment);
  const sameBook = launchedId === experiment.id;
  launchedId = experiment.id;
  // Өмнөх заавар-гүй туршилтын гаргасан зүйлс ширээн дээр хуримтлагдахгүй
  clearTextbookSupplies();
  // Everything the book lists joins the lab guide's own recipe on the bench (bookSupplies.ts).
  setLaunchedBook(lab?.id ?? null, lab ? bookSupplies(experiment).supplies : []);
  if (!lab) {
    // Алхамчилсан заавар байхгүй: өмнөх туршилтын карт, багаж үлдэхгүйн тулд цэвэрлэж, чөлөөт лабт үргэлжлүүлнэ
    leaveBenchExperiment();
    // Эхлээд «Туршилтын бэлтгэл» (бодис, хэрэгслийн жагсаалт), дараа нь «Туршилт» карт нэр + алхмаараа гарна
    useLaunchedProcedure.getState().showUnlinked(experiment.title, experiment.procedure, prepFor(experiment));
    sounds.play('ui', 0.5);
    resumeWalk();
    useGameStore.getState().say(unguidedMessage(experiment), 'wave');
    return;
  }
  // Лабын "Туршилт" самбар дээр сурах бичгийн "Хэрхэн хийх" алхмыг харуулахын тулд хадгална
  // Лаб ширээн дээрх хэрэгслийг өөрөө хянадаг (3D бэлтгэлтэй) бол жагсаалт хэрэггүй, үгүй бол сурах бичгийн жагсаалтыг гаргана
  const tracked = suppliesFor(lab.id).length > 0;
  useLaunchedProcedure.getState().show(lab.id, experiment.procedure, experiment.title, tracked ? null : prepFor(experiment));
  // Шинэ эхлэл (өмнө нь хийж эхлээгүй, эсвэл ижил заавартай өөр туршилт) бол цэвэр эхлүүлнэ, хийж байсан бол үргэлжлүүлнэ
  selectBenchExperiment(lab.id, !sameBook || !useWorkbench.getState().sessions[lab.id]);
  sounds.play('success', 0.5);
  resumeWalk();
  const done = useLabStore.getState().progress[lab.id] ?? [];
  if (lab.steps.some((step) => !done.includes(step.id))) useGameStore.getState().say(guidedMessage(lab.title), 'wave');
}

/** Энэ туршилтад бүтэн 3D үзүүлбэр (алхам бүрийг өөрөө хийж үзүүлэх) байгаа эсэх */
export function hasDemo(experiment: TextbookExperiment): boolean {
  const lab = guideFor(experiment);
  return !!lab && !!physicalShowcasePlan(lab.id);
}

/**
 * "3D үзүүлбэр үзэх" — туршилтыг эхлүүлээд ажлын ширээнд суулгаж, бүтэн үзүүлбэрийг тоглуулна.
 * Ширээний 3D хөдөлгүүр ачаалж дуусаагүй бол (удаан утсанд) хэдэн секунд хүлээнэ.
 */
export function watchTextbookDemo(experiment: TextbookExperiment): void {
  const lab = guideFor(experiment);
  if (!lab) return;
  startTextbookExperiment(experiment);
  requestShowcase(lab.id);
  let frames = 0;
  const sit = () => {
    if (useGameStore.getState().mode !== 'walk') return;
    if (!bench.engine) {
      if (++frames < 600) window.requestAnimationFrame(sit);
      return;
    }
    playerApi.teleport(8.25, -13.6, 0);
    enterBench();
    // Бэлтгэлийн жагсаалт харагдаж байхад үзүүлбэрийн заавар ширээнд гардаггүй: багшийн адил бэлтгэлийг гүйцээнэ
    demonstratePreparation();
  };
  sit();
}
