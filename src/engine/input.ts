export interface DirectionVector {
  x: number;
  y: number;
}

export interface InputState {
  move: DirectionVector;
  keyboard: DirectionVector;
  pointer: DirectionVector;
  dragging: boolean;
  upPressed: boolean;
  downPressed: boolean;
  leftPressed: boolean;
  rightPressed: boolean;
}

export interface InputController {
  readonly direction: DirectionVector;
  destroy(): void;
  dispose(): void;
}

const EPSILON = 0.000001;

export function createInputState(): InputState {
  return {
    move: { x: 0, y: 0 },
    keyboard: { x: 0, y: 0 },
    pointer: { x: 0, y: 0 },
    dragging: false,
    upPressed: false,
    downPressed: false,
    leftPressed: false,
    rightPressed: false,
  };
}

export function normalizeDirection(x: number, y: number): DirectionVector {
  const out = { x: 0, y: 0 };
  writeNormalizedDirection(out, x, y);
  return out;
}

export function resolveMoveDirection(keyboard: DirectionVector, pointer: DirectionVector): DirectionVector {
  return normalizeDirection(keyboard.x + pointer.x, keyboard.y + pointer.y);
}

export function writeDragDirectionFromPoint(
  out: DirectionVector,
  clientX: number,
  clientY: number,
  rectLeft: number,
  rectTop: number,
  rectWidth: number,
  rectHeight: number,
): void {
  const centerX = rectLeft + rectWidth * 0.5;
  const centerY = rectTop + rectHeight * 0.5;
  writeNormalizedDirection(out, clientX - centerX, clientY - centerY);
}

export function updateKeyboardDirection(state: InputState): void {
  const x = Number(state.rightPressed) - Number(state.leftPressed);
  const y = Number(state.downPressed) - Number(state.upPressed);
  writeNormalizedDirection(state.keyboard, x, y);
  writeCombinedMoveDirection(state.move, state.keyboard, state.pointer);
}

export function createInputController(canvas: HTMLCanvasElement, state: InputState = createInputState()): InputController {
  const direction = state.move;

  const onKeyDown = (event: KeyboardEvent): void => {
    if (!setKeyState(state, event.code, true)) return;
    event.preventDefault();
    updateKeyboardDirection(state);
  };

  const onKeyUp = (event: KeyboardEvent): void => {
    if (!setKeyState(state, event.code, false)) return;
    event.preventDefault();
    updateKeyboardDirection(state);
  };

  const onPointerDown = (event: PointerEvent): void => {
    state.dragging = true;
    canvas.setPointerCapture(event.pointerId);
    updatePointerDirection(canvas, state, event.clientX, event.clientY);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!state.dragging) return;
    updatePointerDirection(canvas, state, event.clientX, event.clientY);
  };

  const onPointerUp = (): void => {
    stopDragging(state);
  };

  const onPointerCancel = (): void => {
    stopDragging(state);
  };

  const onBlur = (): void => {
    state.upPressed = false;
    state.downPressed = false;
    state.leftPressed = false;
    state.rightPressed = false;
    stopDragging(state);
    updateKeyboardDirection(state);
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('lostpointercapture', onPointerCancel);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  return {
    direction,
    destroy(): void {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('lostpointercapture', onPointerCancel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    },
    dispose(): void {
      this.destroy();
    },
  };
}

function writeNormalizedDirection(out: DirectionVector, x: number, y: number): void {
  const length = Math.hypot(x, y);
  if (length <= EPSILON) {
    out.x = 0;
    out.y = 0;
    return;
  }

  out.x = x / length;
  out.y = y / length;
}

function writeCombinedMoveDirection(out: DirectionVector, keyboard: DirectionVector, pointer: DirectionVector): void {
  writeNormalizedDirection(out, keyboard.x + pointer.x, keyboard.y + pointer.y);
}

function updatePointerDirection(canvas: HTMLCanvasElement, state: InputState, clientX: number, clientY: number): void {
  const rect = canvas.getBoundingClientRect();
  writeDragDirectionFromPoint(state.pointer, clientX, clientY, rect.left, rect.top, rect.width, rect.height);
  writeCombinedMoveDirection(state.move, state.keyboard, state.pointer);
}

function stopDragging(state: InputState): void {
  state.dragging = false;
  state.pointer.x = 0;
  state.pointer.y = 0;
  writeCombinedMoveDirection(state.move, state.keyboard, state.pointer);
}

function setKeyState(state: InputState, code: string, pressed: boolean): boolean {
  switch (code) {
    case 'ArrowUp':
    case 'KeyW':
      state.upPressed = pressed;
      return true;
    case 'ArrowDown':
    case 'KeyS':
      state.downPressed = pressed;
      return true;
    case 'ArrowLeft':
    case 'KeyA':
      state.leftPressed = pressed;
      return true;
    case 'ArrowRight':
    case 'KeyD':
      state.rightPressed = pressed;
      return true;
    default:
      return false;
  }
}
