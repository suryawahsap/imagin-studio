/**
 * Tipe animasi untuk frontend — mirror dari electron/services/animation-types.ts.
 * (Backend punya file sendiri; file ini agar frontend tidak perlu import lintas root.)
 */

export type AnimEasing =
  | "linear"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out";

export type AnimBackground = "transparent" | "white" | string;

export interface AnimLayerKeyframe {
  timeMs: number;
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  opacity?: number;
}

export interface AnimLayer {
  id: string;
  name: string;
  sourceSelector: string;
  enabled: boolean;
  keyframes: AnimLayerKeyframe[];
  easing: AnimEasing;
}

export interface AnimationDefinition {
  layers: AnimLayer[];
  durationMs: number;
  fps: number;
  width: number;
  height: number;
  background: AnimBackground;
  loop: boolean;
  sourceSvg: string; // raw SVG content (mode svg)
  sourceMode?: "svg" | "html";
  sourceHtml?: string;
  sourceCss?: string;
  sourceTempId?: string;
  formatList?: string[];
}

export type { AnimV2Package, AnimV2Track, AnimV2Emitter, AnimV2Keyframe, ImportedAnimV2Package } from "./animation-v2";

export const ANIM_PRESETS: Record<
  string,
  (durMs: number) => AnimLayerKeyframe[]
> = {
  "Fade In": (d) => [
    { timeMs: 0, opacity: 0 },
    { timeMs: d, opacity: 1 },
  ],
  "Fade Out": (d) => [
    { timeMs: 0, opacity: 1 },
    { timeMs: d, opacity: 0 },
  ],
  "Slide In Left": (d) => [
    { timeMs: 0, x: -100, opacity: 0 },
    { timeMs: d, x: 0, opacity: 1 },
  ],
  "Slide In Right": (d) => [
    { timeMs: 0, x: 100, opacity: 0 },
    { timeMs: d, x: 0, opacity: 1 },
  ],
  "Slide In Up": (d) => [
    { timeMs: 0, y: -100, opacity: 0 },
    { timeMs: d, y: 0, opacity: 1 },
  ],
  "Scale Up": (d) => [
    { timeMs: 0, scaleX: 0.5, scaleY: 0.5 },
    { timeMs: d, scaleX: 1, scaleY: 1 },
  ],
  "Scale Down": (d) => [
    { timeMs: 0, scaleX: 1, scaleY: 1 },
    { timeMs: d, scaleX: 0.5, scaleY: 0.5 },
  ],
  Rotate: (d) => [
    { timeMs: 0, rotation: 0 },
    { timeMs: d, rotation: 360 },
  ],
  Bounce: (d) => [
    { timeMs: 0, scaleX: 0.8, scaleY: 0.8 },
    { timeMs: d * 0.5, scaleX: 1.15, scaleY: 1.15 },
    { timeMs: d, scaleX: 1, scaleY: 1 },
  ],
  Float: (d) => [
    { timeMs: 0, y: 0 },
    { timeMs: d * 0.5, y: -16 },
    { timeMs: d, y: 0 },
  ],
  Pulse: (d) => [
    { timeMs: 0, opacity: 1 },
    { timeMs: d * 0.5, opacity: 0.35 },
    { timeMs: d, opacity: 1 },
  ],
};
