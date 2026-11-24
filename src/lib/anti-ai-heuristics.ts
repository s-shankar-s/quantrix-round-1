// Client and server-side heuristics to detect copy-pasting from ChatGPT, Claude, Gemini, etc.

export const AI_CLICHE_PHRASES = [
  'as an ai',
  'as a large language model',
  'in conclusion',
  'it is important to note',
  'furthermore, it is crucial',
  'delve into',
  'testament to',
  'multifaceted approach',
  'navigating the nuances',
  'tapestry of',
  'paramount importance',
  'beacon of',
  'crucial to consider',
  'fostering a',
  'game-changer',
  'holistic perspective',
  'serves as a',
  'in summary',
  'moreover',
  'underscores the need',
];

export function inspectTextForAiMarkers(text: string): { isSuspicious: boolean; matches: string[] } {
  if (!text) return { isSuspicious: false, matches: [] };
  const lower = text.toLowerCase();
  const found: string[] = [];

  for (const phrase of AI_CLICHE_PHRASES) {
    if (lower.includes(phrase)) {
      found.push(phrase);
    }
  }

  return {
    isSuspicious: found.length > 0,
    matches: found,
  };
}
