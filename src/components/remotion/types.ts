// Shared types & constants for the Remotion module.
import { LibraryAsset } from "../../types";

export type AnimSourceEngine = "svg" | "html" | "studioV2";
export type AnimOutputFormat = "MP4" | "WEBM" | "GIF" | "Lottie";

export interface CompositionPreset {
  id: string;
  name: string;
  ratio: string;
  width: number;
  height: number;
  label: string;
}

export interface MotionEffect {
  id: string;
  name: string;
  description: string;
  keyframeSets: number;
}

export interface Keyframe {
  timeMs: number;
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  opacity?: number;
}

export interface LayerState {
  id: string;
  name: string;
  sourceSelector?: string;
  enabled: boolean;
  easing: string;
  keyframes: Keyframe[];
}

export interface AnimTemplate {
  id: string;
  name: string;
  sourceEngine: AnimSourceEngine;
  preview?: string;
  durationMs: number;
}

export interface JobState {
  tempId: string;
  status: string;
  progress?: number;
  error?: string;
  outputUrls?: Record<string, string>;
  originalName?: string;
}
