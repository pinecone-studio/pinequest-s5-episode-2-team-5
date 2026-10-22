import type { KeyboardControlsEntry } from '@react-three/drei';

/** Every remappable action. Bindings are KeyboardEvent.code values. */
export type ActionName =
  | 'forward'
  | 'backward'
  | 'left'
  | 'right'
  | 'sprint'
  | 'jump'
  | 'interact'
  | 'inspect'
  | 'drop'
  | 'grab'
  | 'pour'
  | 'throw'
  | 'cursor'
  | 'closeup'
  | 'tools'
  | 'notes'
  | 'map'
  | 'turnLeft'
  | 'turnRight'
  | 'lookUp'
  | 'lookDown';

export type Bindings = Record<ActionName, string[]>;

export type LookMode = 'mouse' | 'keyboard';

/** Continuous actions read every frame by the player controller. */
export type MoveAction = 'forward' | 'backward' | 'left' | 'right' | 'sprint' | 'jump' | 'turnLeft' | 'turnRight' | 'lookUp' | 'lookDown';

export const DEFAULT_BINDINGS: Bindings = {
  forward: ['KeyW', 'ArrowUp'],
  backward: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  jump: ['Space'],
  interact: ['KeyE'],
  inspect: ['KeyF'],
  drop: ['KeyQ'],
  grab: ['KeyG'],
  pour: ['KeyR'],
  throw: ['KeyT'],
  cursor: ['KeyC'],
  closeup: ['KeyV'],
  tools: ['Tab'],
  notes: ['KeyN'],
  map: ['KeyM'],
  turnLeft: ['KeyQ'],
  turnRight: ['KeyE'],
  lookUp: ['PageUp'],
  lookDown: ['PageDown'],
};

export const ACTION_LABELS: Record<ActionName, string> = {
  forward: 'Урагшаа',
  backward: 'Хойшоо',
  left: 'Зүүн тийш',
  right: 'Баруун тийш',
  sprint: 'Гүйх',
  jump: 'Үсрэх',
  interact: 'Ашиглах / авах',
  inspect: 'Ойроос харах',
  drop: 'Тавих',
  grab: 'Шууд авах (горелк, жин)',
  pour: 'Ашиглах: асгах, хэмжих, хутгах (дарсаар)',
  throw: 'Шидэх (удаан дарвал хүчтэй)',
  cursor: 'Хулганыг чөлөөлөх / буцаах',
  closeup: 'Ширээний ажлын харагдац / буцах',
  tools: 'Багажны шургуулга',
  notes: 'Лабын тэмдэглэл',
  map: 'Газрын зураг',
  turnLeft: 'Зүүн тийш эргэх (товчлуураар)',
  turnRight: 'Баруун тийш эргэх (товчлуураар)',
  lookUp: 'Дээш харах (товчлуураар)',
  lookDown: 'Доош харах (товчлуураар)',
};

/** Alternate keys that always work, so keyboard-turn mode can reuse Q/E for turning. */
export const ALT_INTERACT = 'Enter';
export const ALT_DROP = 'Backspace';

const ARROW_LABELS: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
};

/** Human readable label for a KeyboardEvent.code. */
export function keyLabel(code: string | undefined): string {
  if (!code) return '—';
  if (ARROW_LABELS[code]) return ARROW_LABELS[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Shift')) return 'Shift';
  if (code.startsWith('Control')) return 'Ctrl';
  if (code.startsWith('Alt')) return 'Alt';
  if (code === 'Escape') return 'Esc';
  if (code === 'Backspace') return '⌫';
  return code;
}

/** Map for drei <KeyboardControls>. In keyboard-turn mode ←/→ turn instead of strafing. */
export function buildMovementMap(bindings: Bindings, lookMode: LookMode): KeyboardControlsEntry<MoveAction>[] {
  const keyboard = lookMode === 'keyboard';
  const without = (keys: string[], drop: string[]) => keys.filter((k) => !drop.includes(k));
  const arrowsLR = ['ArrowLeft', 'ArrowRight'];
  return [
    { name: 'forward', keys: bindings.forward },
    { name: 'backward', keys: bindings.backward },
    { name: 'left', keys: keyboard ? without(bindings.left, arrowsLR) : bindings.left },
    { name: 'right', keys: keyboard ? without(bindings.right, arrowsLR) : bindings.right },
    { name: 'sprint', keys: bindings.sprint },
    { name: 'jump', keys: bindings.jump },
    { name: 'turnLeft', keys: keyboard ? [...bindings.turnLeft, 'ArrowLeft'] : [] },
    { name: 'turnRight', keys: keyboard ? [...bindings.turnRight, 'ArrowRight'] : [] },
    { name: 'lookUp', keys: keyboard ? bindings.lookUp : [] },
    { name: 'lookDown', keys: keyboard ? bindings.lookDown : [] },
  ];
}

/**
 * One-shot actions triggered by a key press. In keyboard-turn mode, keys used for
 * turning are removed from interact/drop; Enter and Backspace always work instead.
 */
export function actionsForKey(code: string, bindings: Bindings, lookMode: LookMode): ActionName[] {
  const oneShot: ActionName[] = ['interact', 'inspect', 'drop', 'grab', 'pour', 'throw', 'cursor', 'closeup', 'tools', 'notes', 'map'];
  const turnKeys = lookMode === 'keyboard' ? [...bindings.turnLeft, ...bindings.turnRight] : [];
  const result: ActionName[] = [];
  for (const action of oneShot) {
    const keys = bindings[action];
    if (keys.includes(code) && !turnKeys.includes(code)) result.push(action);
  }
  if (code === ALT_INTERACT && !result.includes('interact')) result.push('interact');
  if (code === ALT_DROP && !result.includes('drop')) result.push('drop');
  return result;
}

/** Key label used in on-screen prompts for an action, given the current look mode. */
export function promptKey(action: 'interact' | 'drop' | 'inspect', bindings: Bindings, lookMode: LookMode): string {
  const turnKeys = lookMode === 'keyboard' ? [...bindings.turnLeft, ...bindings.turnRight] : [];
  const usable = bindings[action].filter((k) => !turnKeys.includes(k));
  if (usable.length > 0) return keyLabel(usable[0]);
  if (action === 'interact') return 'Enter';
  if (action === 'drop') return keyLabel(ALT_DROP);
  return '—';
}
