import { describe, expect, it } from 'vitest';
import {
  normalizeKeyboardEvent,
  normalizeMouseButtonEvent,
  normalizeWheelEvent
} from '../src/main/capture/normalization';

describe('input normalization', () => {
  it('normalizes keyboard events without storing printable text content', () => {
    const normalized = normalizeKeyboardEvent({ key: 'x', repeat: true }, 'key_down', 1000, 'test');

    expect(normalized.type).toBe('key_down');
    expect(normalized.device).toBe('keyboard');
    expect(normalized.keyCode).toBe('key:x');
    expect(normalized.keyLabel).toBe('printable');
    expect(normalized.repeat).toBe(true);
  });

  it('maps uiohook numeric keycodes to readable key labels', () => {
    const normalized = normalizeKeyboardEvent({ keycode: 36 }, 'key_down', 1000, 'test');

    expect(normalized.keyCode).toBe('key:j');
    expect(normalized.keyLabel).toBe('J');
  });

  it('normalizes mouse button events and ignores pointer coordinates', () => {
    const normalized = normalizeMouseButtonEvent({ button: 1, x: 100, y: 200 }, 'mouse_down', 1000, 'test');

    expect(normalized.type).toBe('mouse_down');
    expect(normalized.button).toBe('left');
    expect(normalized).not.toHaveProperty('x');
    expect(normalized).not.toHaveProperty('y');
  });

  it('normalizes wheel deltas', () => {
    const normalized = normalizeWheelEvent({ deltaY: -3, deltaX: 1 }, 1000, 'test');

    expect(normalized.type).toBe('wheel');
    expect(normalized.wheelDeltaX).toBe(1);
    expect(normalized.wheelDeltaY).toBe(-3);
  });
});
