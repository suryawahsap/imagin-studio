import { generateText } from "./ai-bridge";
import { SUBJECT_TYPES, CAMERA_ANGLES, ACTIVITY_CONTEXTS, FRAMING_STYLES } from "../registry/presets";
import { pickUnique } from "../utils";
import type { SystemSettings } from "../types";

export interface CompositionSlot {
  role: string;
  excludesPeople: boolean;
  inject: string;
}

export interface CompositionSession {
  usedSubjects: Set<any>;
  usedAngles: Set<string>;
  usedActivities: Set<string>;
}

export function createCompositionSession(): CompositionSession {
  return { usedSubjects: new Set(), usedAngles: new Set(), usedActivities: new Set() };
}

export function generateDynamicSlot(compSession: CompositionSession): CompositionSlot {
  const subject = pickUnique(SUBJECT_TYPES as any, compSession.usedSubjects as any) as any;
  const angle = pickUnique<string>(CAMERA_ANGLES as string[], compSession.usedAngles as any);
  const activity = subject.excludesPeople ? "" : pickUnique<string>(ACTIVITY_CONTEXTS as string[], compSession.usedActivities as any);
  const framing = FRAMING_STYLES[Math.floor(Math.random() * FRAMING_STYLES.length)];
  const inject = activity
    ? `${subject.desc} | Camera: ${angle} | Scene: ${activity} | Framing: ${framing}.`
    : `${subject.desc} | Camera: ${angle} | Framing: ${framing}.`;
  return { role: subject.label, excludesPeople: subject.excludesPeople, inject };
}

export function getBatchSlots(count: number): CompositionSlot[] {
  const compSession = createCompositionSession();
  return Array.from({ length: count }, () => generateDynamicSlot(compSession));
}

export async function getBatchSlotsAI(
  count: number,
  baseInput: string,
  systemSettings: SystemSettings | null
): Promise<CompositionSlot[]> {
  const textModel = systemSettings?.aiConfig?.textModel || "gemini-2.5-flash";
  const payload = {
    contents: [{ parts: [{ text:
      `You are an art director for Adobe Stock commercial vector illustrations.\n` +
      `Theme: "${baseInput}"\n\n` +
      `Generate exactly ${count} composition ideas that are VISUALLY AND CONCEPTUALLY DISTINCT from each other.\n` +
      `Each idea must differ in: subject type, camera angle, scene context, and framing.\n` +
      `All must be:\n` +
      `- Suitable for Adobe Stock (commercial, no text, no brand, no copyright)\n` +
      `- Culturally accurate and contextually relevant to the theme\n` +
      `- Actionable visual instructions (max 40 words each)\n\n` +
      `DO NOT include decorative border or empty frame concepts.\n` +
      `DO NOT repeat subject types across the ${count} ideas.\n\n` +
      `Return ONLY a valid JSON array of exactly ${count} strings, no markdown, no preamble.\n` +
      `Example: ["Single woman in traditional attire, waist-up, three-quarter angle, in a moment of quiet reflection, generous negative space", ...]`
    }] }],
  };

  try {
    const text = await generateText(textModel, payload, true);
    const compositions = JSON.parse(text.replace(/```json|```/g, "").trim());
    if (!Array.isArray(compositions) || compositions.length < count) {
      throw new Error(`AI returned ${Array.isArray(compositions) ? compositions.length : "non-array"}, expected ${count}`);
    }
    return compositions.slice(0, count).map((inject: string, i: number) => ({
      role: `AI_COMP_${i + 1}`,
      excludesPeople: /\b(no people|no human|no figure|still.life|emblem|badge|architecture|landmark|object|symbol|craft|detail|close.up)\b/i.test(String(inject)),
      inject: String(inject),
    }));
  } catch (err: any) {
    console.warn("[CompositionAI] Gagal, fallback ke combinatorial:", err?.message || err);
    return getBatchSlots(count);
  }
}
