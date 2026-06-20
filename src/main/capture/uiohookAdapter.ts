import { EventEmitter } from 'node:events';
import { systemPreferences } from 'electron';
import type { PermissionStatus } from '../../shared/types';
import type { InputCaptureAdapter, RawKeyboardEvent, RawMouseEvent } from './types';
import {
  normalizeKeyboardEvent,
  normalizeMouseButtonEvent,
  normalizeWheelEvent
} from './normalization';

type UiohookModule = {
  uIOhook: {
    on(event: string, listener: (payload: unknown) => void): void;
    off(event: string, listener: (payload: unknown) => void): void;
    start(): void;
    stop(): void;
  };
};

export class UiohookInputCaptureAdapter extends EventEmitter implements InputCaptureAdapter {
  readonly source = 'uiohook';
  private hook: UiohookModule['uIOhook'] | null = null;
  private readonly hookListeners = new Map<string, (payload: unknown) => void>();

  async checkPermissions(): Promise<PermissionStatus> {
    const missing: string[] = [];

    if (process.platform === 'darwin') {
      const trusted = systemPreferences.isTrustedAccessibilityClient(false);
      if (!trusted) {
        return {
          ok: false,
          missing: ['macOS Accessibility'],
          message:
            'Missing macOS Accessibility permission. Grant Accessibility access to Electron, then click Start again.'
        };
      }
    }

    try {
      await this.loadHook();
    } catch (error) {
      missing.push('native input hook');
      return {
        ok: false,
        missing,
        message: `Input hook unavailable: ${error instanceof Error ? error.message : String(error)}`
      };
    }

    if (missing.length > 0) {
      return {
        ok: false,
        missing,
        message: `Missing required input permission: ${missing.join(', ')}`
      };
    }

    return { ok: true };
  }

  async start(): Promise<void> {
    const hook = await this.loadHook();
    this.attach(hook, 'keydown', (raw) =>
      this.emit('input', normalizeKeyboardEvent(raw as RawKeyboardEvent, 'key_down'))
    );
    this.attach(hook, 'keyup', (raw) =>
      this.emit('input', normalizeKeyboardEvent(raw as RawKeyboardEvent, 'key_up'))
    );
    this.attach(hook, 'mousedown', (raw) =>
      this.emit('input', normalizeMouseButtonEvent(raw as RawMouseEvent, 'mouse_down'))
    );
    this.attach(hook, 'mouseup', (raw) =>
      this.emit('input', normalizeMouseButtonEvent(raw as RawMouseEvent, 'mouse_up'))
    );
    this.attach(hook, 'wheel', (raw) => this.emit('input', normalizeWheelEvent(raw as RawMouseEvent)));
    hook.start();
  }

  async stop(): Promise<void> {
    if (!this.hook) {
      return;
    }

    for (const [event, listener] of this.hookListeners.entries()) {
      this.hook.off(event, listener);
    }
    this.hookListeners.clear();
    this.hook.stop();
  }

  private async loadHook(): Promise<UiohookModule['uIOhook']> {
    if (this.hook) {
      return this.hook;
    }

    const mod = (await import('uiohook-napi')) as UiohookModule;
    this.hook = mod.uIOhook;
    return this.hook;
  }

  private attach(
    hook: UiohookModule['uIOhook'],
    event: string,
    listener: (payload: unknown) => void
  ): void {
    if (this.hookListeners.has(event)) {
      return;
    }

    hook.on(event, listener);
    this.hookListeners.set(event, listener);
  }
}
