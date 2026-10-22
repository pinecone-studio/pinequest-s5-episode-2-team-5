/**
 * Heads-up display, laid out like the reference: yellow round menu (top left), notes +
 * End (top right), yellow tools tab (right edge), robot assistant (bottom left),
 * interaction prompt (bottom center) and minimap (bottom right). Everything except the
 * eyepiece's own Esc hint is hidden while looking through a microscope.
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
import { Minimap } from './Minimap';
import { ControlsHelp } from './ControlsHelp';
import { PauseMenu } from './PauseMenu';
import { MicroscopeView } from './MicroscopeView';
import { LaptopScreen } from './LaptopScreen';
import { LoadingScreen } from './LoadingScreen';
import { SummaryScreen } from './SummaryScreen';
import { ClickToLookHint, FpsCounter, RoomToast } from './RoomToast';
import { TouchControls } from './TouchControls';
import { isTouchDevice } from '../utils/device';
import { InspectMode } from '../interaction/InspectMode';

export function HUD() {
  const mode = useGameStore((s) => s.mode);
  const showFps = useSettingsStore((s) => s.showFps);
  const inGame = mode !== 'loading' && mode !== 'start' && mode !== 'ended';
  const immersive = mode === 'microscope' || mode === 'laptop' || mode === 'inspect';
  const showChrome = inGame && !immersive;
  const touch = isTouchDevice();
  return (
    <>
      {inGame && touch && <TouchControls />}
      {showChrome && mode === 'walk' && <Crosshair />}
      {showChrome && mode === 'walk' && <InteractionPrompt />}
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
          <RoomToast />
          <Minimap />
        </>
      )}
      {inGame && <ToolTab />}
      {inGame && <RobotAssistant hidden={!showChrome} />}
      {showFps && <FpsCounter />}
      <MenuPanel />
      <NotesPanel />
      <ControlsHelp />
      <EndConfirm />
      <PauseMenu />
      <InspectMode />
      <MicroscopeView />
      <LaptopScreen />
      <LoadingScreen />
      <SummaryScreen />
    </>
  );
}
