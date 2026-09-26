export type AnimV2Property = "transform" | "opacity" | "fill" | "stroke-width";
export interface AnimV2Keyframe { time: number; value: string; easing?: string; }
export interface AnimV2Track { target: string; property: AnimV2Property; easing?: string; keyframes: AnimV2Keyframe[]; }
export interface AnimV2Emitter { id: string; type: "particle"; origin: { x: number; y: number }; count: number; staggerMs: number; loop: boolean; particleSpec: { shape: "circle" | "line"; radius?: number; length?: number; color: string; opacity: number; trajectory: { dx: number; dy: number }; duration: number; easing: string; fadeOut: boolean; }; }
export interface AnimV2Package { schemaVersion: "2.0"; label: string; canvas: { width: number; height: number; viewBox: string }; totalDuration: number; loop: boolean; tracks: AnimV2Track[]; emitters: AnimV2Emitter[]; }
export interface AnimV2Manifest { schemaVersion: "2.0"; [key: string]: unknown; }
export interface ImportedAnimV2Package { id: string; baseName: string; sceneSvg: string; animation: AnimV2Package; manifest: AnimV2Manifest; runtimeIgnored: true; }
