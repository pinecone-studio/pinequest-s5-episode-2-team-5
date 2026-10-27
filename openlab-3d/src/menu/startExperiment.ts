/**
 * "Туршилтыг эхлэх" — сонгосон сурах бичгийн туршилтыг 3D лабт эхлүүлнэ.
 * Хуучин цэсний "▶ Энэ туршилтыг эхлүүлэх" товчтой ЯГ ИЖИЛ дарааллаар ажиллана (selectBenchExperiment → resumeWalk → Pip),
 * ингэснээр лабын одоо байгаа, шалгагдсан урсгал өөрчлөгдөхгүй.
 */
import { resumeWalk } from '../controls/useGameKeys';
import { experimentById, type Experiment } from '../lab/experiments';
import { selectBenchExperiment, suppliesFor, useWorkbench } from '../experiments/workbench/session';
import { useGameStore } from '../store/useGameStore';
import { useLabStore } from '../store/useLabStore';
import { sounds } from '../utils/sounds';
import type { TextbookExperiment } from './chapterBuild';
import { labIdFor } from './labLinks';
import { guidedMessage, unguidedMessage } from './launchText';
import { useLaunchedProcedure, type TextbookPrep } from './launchedProcedure';

/** Энэ туршилтын 3D лабын алхамчилсан заавар. Холбоогүй эсвэл лабын жагсаалтад байхгүй бол undefined */
export function guideFor(experiment: TextbookExperiment): Experiment | undefined {
  const labId = labIdFor(experiment.id);
  return labId ? experimentById(labId) : undefined;
}

/** «Бэлтгэлээ хийе» жагсаалт: сурах бичгийн JSON-ийн бодис, хэрэгсэл, аюулгүй байдал */
function prepFor(experiment: TextbookExperiment): TextbookPrep {
  return { substances: experiment.substances, equipment: experiment.equipment, safety: experiment.safety };
}

export function startTextbookExperiment(experiment: TextbookExperiment): void {
  const lab = guideFor(experiment);
  if (!lab) {
    // Алхамчилсан заавар байхгүй: өмнөх туршилтын карт үлдэхгүйн тулд сонголтыг цэвэрлэж, чөлөөт лабт үргэлжлүүлнэ
    useLabStore.getState().setActive(null);
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
  // Шинэ эхлэл (өмнө нь хийж эхлээгүй) бол цэвэр эхлүүлнэ, хийж байсан бол үргэлжлүүлнэ
  selectBenchExperiment(lab.id, !useWorkbench.getState().sessions[lab.id]);
  sounds.play('success', 0.5);
  resumeWalk();
  const done = useLabStore.getState().progress[lab.id] ?? [];
  if (lab.steps.some((step) => !done.includes(step.id))) useGameStore.getState().say(guidedMessage(lab.title), 'wave');
}
