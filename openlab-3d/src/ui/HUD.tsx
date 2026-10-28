import {useGuideCue} from '../experiments/workbench/guidance/runtime';
import { LabLaunch } from '../experiments/workbench/LabLaunch';
import { InquiryPanel } from '../experiments/workbench/InquiryPanel';
import { ExperimentSuccess } from './ExperimentSuccess';
import { MoleculeViewerPanel } from './MoleculeViewer';
/**
 * Heads-up display, laid out like the reference: yellow round menu (top left), notes +
 * End (top right), yellow tools tab (right edge), robot assistant (bottom left),
 * interaction prompt (bottom center). Everything is hidden while inspecting an object.
 */
import { useGameStore } from '../store/useGameStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { Crosshair } from './Crosshair';
import { InteractionPrompt } from './InteractionPrompt';
import { MenuButton } from './MenuButton';
import { MenuPanel } from './MenuPanel';
import { NotesButton } from './NotesButton';
import { NotesPanel } from './NotesPanel';
import { EndButton, EndConfirm } from './EndButton';
import { ToolTab } from './ToolTab';
import { RobotAssistant } from './RobotAssistant';
import { ControlsHelp } from './ControlsHelp';
import { PauseMenu } from './PauseMenu';
import { SummaryScreen } from './SummaryScreen';
import { ClickToLookHint, FpsCounter, RoomToast } from './RoomToast';
import { isTouchDevice } from '../utils/device';
import { InspectMode } from '../interaction/InspectMode';
import { NaClHUD } from '../experiments/nacl/NaClHUD';
import { ActionGauge, ExperimentCard, SafetyBadges, ThrowMeter } from './LabHud';
import { PreparationLabels } from '../experiments/workbench/PreparationHints';
import { ReactionLens } from '../experiments/workbench/ReactionLens';

export function HUD() {
  const mode = useGameStore((s) => s.mode);
  const equipmentGuide=useGuideCue(s=>!!s.target);
  const showFps = useSettingsStore((s) => s.showFps);
  const inGame = mode !== 'loading' && mode !== 'start' && mode !== 'ended';
  const bench = mode === 'bench';
  const showChrome = inGame && mode !== 'inspect' && !bench;
  const touch = isTouchDevice();
  return (
    <>
      {showChrome && mode === 'walk' && <Crosshair />}
      {showChrome && mode === 'walk' && <InteractionPrompt />}
      {showChrome && mode === 'walk' && <ActionGauge />}
      {showChrome && mode === 'walk' && <ThrowMeter />}
      {showChrome && !touch && <ClickToLookHint />}
      {showChrome && (
        <>
          <div className="pointer-events-none fixed left-4 top-4 z-30">
            <MenuButton />
          </div>
          <div className="pointer-events-none fixed right-4 top-4 z-30 flex gap-2">
            <NotesButton />
            <EndButton />
          </div>
          <SafetyBadges />
          <ExperimentCard />
        </>
      )}
      {(mode === 'walk' || bench) && <NaClHUD />}
      {inGame && <ToolTab />}
      {inGame && <RoomToast />}
      {inGame && <RobotAssistant hidden={!showChrome} />}
      {showFps && <FpsCounter />}
      <MenuPanel />
      <NotesPanel />
      <ControlsHelp />
      <EndConfirm />
      <PauseMenu />
      <PreparationLabels />
      <InspectMode />
      {inGame && !equipmentGuide && <ReactionLens />}
      <MoleculeViewerPanel />
      <LabLaunch />
      <InquiryPanel />
      <ExperimentSuccess />
      <SummaryScreen />
    </>
  );
}
