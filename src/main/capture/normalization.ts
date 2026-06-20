import { randomUUID } from 'node:crypto';
import type { InputEventType, MouseButton, NormalizedInputEvent } from '../../shared/types';
import type { RawKeyboardEvent, RawMouseEvent } from './types';

const printableNames = new Set<string>([
  'space',
  'tab',
  'enter',
  'escape',
  'backspace',
  'delete',
  'arrowup',
  'arrowdown',
  'arrowleft',
  'arrowright'
]);

const uiohookKeyLabels = new Map<number, string>([
  [0x000e, 'Backspace'],
  [0x000f, 'Tab'],
  [0x001c, 'Enter'],
  [0x003a, 'CapsLock'],
  [0x0001, 'Escape'],
  [0x0039, 'Space'],
  [0x0e49, 'PageUp'],
  [0x0e51, 'PageDown'],
  [0x0e4f, 'End'],
  [0x0e47, 'Home'],
  [0xe04b, 'ArrowLeft'],
  [0xe048, 'ArrowUp'],
  [0xe04d, 'ArrowRight'],
  [0xe050, 'ArrowDown'],
  [0x0e52, 'Insert'],
  [0x0e53, 'Delete'],
  [0x000b, '0'],
  [0x0002, '1'],
  [0x0003, '2'],
  [0x0004, '3'],
  [0x0005, '4'],
  [0x0006, '5'],
  [0x0007, '6'],
  [0x0008, '7'],
  [0x0009, '8'],
  [0x000a, '9'],
  [0x001e, 'A'],
  [0x0030, 'B'],
  [0x002e, 'C'],
  [0x0020, 'D'],
  [0x0012, 'E'],
  [0x0021, 'F'],
  [0x0022, 'G'],
  [0x0023, 'H'],
  [0x0017, 'I'],
  [0x0024, 'J'],
  [0x0025, 'K'],
  [0x0026, 'L'],
  [0x0032, 'M'],
  [0x0031, 'N'],
  [0x0018, 'O'],
  [0x0019, 'P'],
  [0x0010, 'Q'],
  [0x0013, 'R'],
  [0x001f, 'S'],
  [0x0014, 'T'],
  [0x0016, 'U'],
  [0x002f, 'V'],
  [0x0011, 'W'],
  [0x002d, 'X'],
  [0x0015, 'Y'],
  [0x002c, 'Z'],
  [0x0052, 'Numpad0'],
  [0x004f, 'Numpad1'],
  [0x0050, 'Numpad2'],
  [0x0051, 'Numpad3'],
  [0x004b, 'Numpad4'],
  [0x004c, 'Numpad5'],
  [0x004d, 'Numpad6'],
  [0x0047, 'Numpad7'],
  [0x0048, 'Numpad8'],
  [0x0049, 'Numpad9'],
  [0x0037, 'NumpadMultiply'],
  [0x004e, 'NumpadAdd'],
  [0x004a, 'NumpadSubtract'],
  [0x0053, 'NumpadDecimal'],
  [0x0e35, 'NumpadDivide'],
  [0x0e1c, 'NumpadEnter'],
  [0x003b, 'F1'],
  [0x003c, 'F2'],
  [0x003d, 'F3'],
  [0x003e, 'F4'],
  [0x003f, 'F5'],
  [0x0040, 'F6'],
  [0x0041, 'F7'],
  [0x0042, 'F8'],
  [0x0043, 'F9'],
  [0x0044, 'F10'],
  [0x0057, 'F11'],
  [0x0058, 'F12'],
  [0x0027, 'Semicolon'],
  [0x000d, 'Equal'],
  [0x0033, 'Comma'],
  [0x000c, 'Minus'],
  [0x0034, 'Period'],
  [0x0035, 'Slash'],
  [0x0029, 'Backquote'],
  [0x001a, 'BracketLeft'],
  [0x002b, 'Backslash'],
  [0x001b, 'BracketRight'],
  [0x0028, 'Quote'],
  [0x001d, 'Ctrl'],
  [0x0e1d, 'CtrlRight'],
  [0x0038, 'Alt'],
  [0x0e38, 'AltRight'],
  [0x002a, 'Shift'],
  [0x0036, 'ShiftRight'],
  [0x0e5b, 'Meta'],
  [0x0e5c, 'MetaRight'],
  [0x0045, 'NumLock'],
  [0x0046, 'ScrollLock'],
  [0x0e37, 'PrintScreen']
]);

export function normalizeKeyboardEvent(
  raw: RawKeyboardEvent,
  type: Extract<InputEventType, 'key_down' | 'key_up'>,
  now = Date.now(),
  source = 'uiohook'
): NormalizedInputEvent {
  const rawIdentity = raw.code ?? raw.key ?? raw.keycode ?? raw.rawcode ?? 'unknown';
  const mappedLabel = typeof raw.keycode === 'number' ? uiohookKeyLabels.get(raw.keycode) : undefined;
  const keyCode = mappedLabel ? `key:${mappedLabel.toLowerCase()}` : `key:${String(rawIdentity).toLowerCase()}`;
  const label = safeKeyLabel(raw);

  return {
    id: randomUUID(),
    ts: now,
    type,
    device: 'keyboard',
    keyCode,
    keyLabel: label,
    repeat: Boolean(raw.repeat),
    noise: false,
    source
  };
}

export function normalizeMouseButtonEvent(
  raw: RawMouseEvent,
  type: Extract<InputEventType, 'mouse_down' | 'mouse_up'>,
  now = Date.now(),
  source = 'uiohook'
): NormalizedInputEvent {
  return {
    id: randomUUID(),
    ts: now,
    type,
    device: 'mouse',
    button: normalizeMouseButton(raw.button),
    repeat: false,
    noise: false,
    source
  };
}

export function normalizeWheelEvent(
  raw: RawMouseEvent,
  now = Date.now(),
  source = 'uiohook'
): NormalizedInputEvent {
  const deltaY = raw.deltaY ?? raw.delta ?? raw.rotation ?? 0;
  const deltaX = raw.deltaX ?? 0;

  return {
    id: randomUUID(),
    ts: now,
    type: 'wheel',
    device: 'mouse',
    wheelDeltaX: Number(deltaX) || 0,
    wheelDeltaY: Number(deltaY) || 0,
    repeat: false,
    noise: false,
    source
  };
}

export function normalizeMouseButton(button: number | undefined): MouseButton {
  switch (button) {
    case 1:
    case 0:
      return 'left';
    case 2:
      return 'right';
    case 3:
      return 'middle';
    case 4:
      return 'back';
    case 5:
      return 'forward';
    default:
      return 'unknown';
  }
}

function safeKeyLabel(raw: RawKeyboardEvent): string {
  if (typeof raw.keycode === 'number') {
    const mapped = uiohookKeyLabels.get(raw.keycode);
    if (mapped) {
      return mapped;
    }
  }

  const candidate = String(raw.code ?? raw.key ?? raw.keycode ?? raw.rawcode ?? 'unknown');
  const normalized = candidate.toLowerCase();

  if (printableNames.has(normalized)) {
    return normalized;
  }

  if (/^(key|digit|numpad|f)\w+/i.test(candidate)) {
    return candidate;
  }

  if (/^\d+$/.test(candidate)) {
    return `code-${candidate}`;
  }

  if (candidate.length === 1) {
    return 'printable';
  }

  return candidate.replace(/[^\w:-]/g, '').slice(0, 32) || 'unknown';
}
