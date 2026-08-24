const SENSITIVE = [
  /\b(depressed|depression|suicid|self-harm|anxiety disorder|bipolar|trauma)\b/i,
  /\b(relationship problems?|divorce|affair|abuse|domestic)\b/i,
  /\b(ssn|social security|passport|aadhaar|credit card|cvv|password|bank account)\b/i,
  /\b(lazy|stupid|worthless|failure as a person)\b/i,
];

const INFERRED_TRAIT = [
  /\b(seems|probably|might be|likely)\b.+\b(lazy|depressed|anxious|unhappy)\b/i,
  /\buser is (lazy|depressed|stupid|broken)\b/i,
];

export function isSensitiveMemoryContent(content: string) {
  return SENSITIVE.some((pattern) => pattern.test(content));
}

export function isInferredTrait(content: string) {
  return INFERRED_TRAIT.some((pattern) => pattern.test(content));
}

export function canAutoStore(content: string) {
  return !isSensitiveMemoryContent(content) && !isInferredTrait(content);
}

export function sanitizeMemoryContent(content: string) {
  return content.replace(/\s+/g, " ").trim().slice(0, 280);
}
