export const MIN_APPROVAL_NOTE_LENGTH = 24;
export const MIN_VISUAL_NOTE_LENGTH = 18;

const TEMPLATE_PATTERNS = [
  /<[^>]+>/,
  /\bspecific rationale\b/i,
  /\bspecific source approval note\b/i,
  /\bspecific rig approval note\b/i,
  /\bspecific approval note\b/i,
  /\bhuman-reviewer\b/i,
  /\btodo\b/i,
  /\btbd\b/i,
];

export function meaningfulReviewText(value, minLength = MIN_APPROVAL_NOTE_LENGTH) {
  const text = String(value ?? '').trim();
  if (text.length < minLength) return false;
  return !TEMPLATE_PATTERNS.some((pattern) => pattern.test(text));
}

export function reviewTextFailure(label, minLength = MIN_APPROVAL_NOTE_LENGTH) {
  return `${label} must be at least ${minLength} characters and cannot be placeholder/template text`;
}

export function distinctReviewNotes(notes, requiredKeys) {
  const seen = new Map();
  const duplicates = [];
  for (const key of requiredKeys) {
    const normalized = String(notes?.[key] ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!normalized) return { ok: false, duplicates };
    const previous = seen.get(normalized);
    if (previous) duplicates.push(`${previous}/${key}`);
    else seen.set(normalized, key);
  }
  return { ok: duplicates.length === 0, duplicates };
}

export function reviewNoteHasEvidenceTerms(value, terms, minMatches = 1) {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return false;
  const hits = new Set();
  for (const term of terms ?? []) {
    const normalized = String(term ?? '').trim().toLowerCase();
    if (normalized && text.includes(normalized)) hits.add(normalized);
  }
  return hits.size >= minMatches;
}

export function reviewEvidenceFailure(label, terms, minMatches = 1) {
  const options = (terms ?? []).map((term) => `"${term}"`).join(', ');
  return `${label} must cite at least ${minMatches} relevant evidence term(s): ${options}`;
}
