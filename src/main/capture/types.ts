import type { EventEmitter } from 'node:events';
import type { NormalizedInputEvent, PermissionStatus, TrackingState } from '../../shared/types';

export interface InputCaptureAdapter extends EventEmitter {
  readonly source: string;
  checkPermissions(): Promise<PermissionStatus>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface CaptureEvents {
  input: [event: NormalizedInputEvent];
  state: [state: TrackingState, message?: string];
  error: [error: Error];
}

export interface RawKeyboardEvent {
  keycode?: number;
  rawcode?: number;
  key?: string;
  code?: string;
  type?: string;
  repeat?: boolean;
}

export interface RawMouseEvent {
  button?: number;
  clicks?: number;
  x?: number;
  y?: number;
  delta?: number;
  deltaX?: number;
  deltaY?: number;
  rotation?: number;
}
