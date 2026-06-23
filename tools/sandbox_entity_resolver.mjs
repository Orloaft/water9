const CURATED_ALIASES = new Map([
  ['gulper', ['abyssal-gulper']],
  ['old-gulper', ['abyssal-gulper']],
  ['abyssal-gulper-v1', ['abyssal-gulper']],
  ['new-gulper', ['gulper-eel-maw']],
  ['gulper-maw', ['gulper-eel-maw']],
  ['source-gulper', ['source-gulper-eel-maw']],
]);

export function normalizedSandboxQuery(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function sandboxReviewStage(entry) {
  if (entry?.reviewStage) return entry.reviewStage;
  if (entry?.kind === 'articulated') return entry.qualityStatus === 'accepted' ? 'accepted' : 'prototype';
  if (entry?.kind === 'source') return entry.qualityStatus === 'approved' || entry.qualityStatus === 'rigged' ? 'source-approved' : 'source-review';
  return 'reference';
}

function entryText(entry) {
  return `${entry?.id ?? ''} ${entry?.name ?? ''} ${entry?.kind ?? ''} ${entry?.notes ?? ''}`;
}

export function scoreSandboxSuggestion(entry, query) {
  const haystack = normalizedSandboxQuery(entryText(entry));
  const needle = normalizedSandboxQuery(query);
  if (!needle) return 0;
  if (normalizedSandboxQuery(entry?.id) === needle) return 100;
  if (normalizedSandboxQuery(entry?.name) === needle) return 95;
  if (haystack.includes(needle)) return 60 + Math.min(20, needle.length);
  let score = 0;
  for (const char of new Set([...needle])) if (haystack.includes(char)) score += 1;
  return score;
}

export function sandboxSuggestions(entries, query, limit = 8) {
  return entries
    .map((entry) => ({ entry, score: scoreSandboxSuggestion(entry, query) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.entry.id.localeCompare(right.entry.id))
    .slice(0, limit);
}

function exactEntry(entries, query) {
  const normalizedQuery = normalizedSandboxQuery(query);
  return entries.find((entry) => entry.id === query)
    ?? entries.find((entry) => normalizedSandboxQuery(entry.id) === normalizedQuery)
    ?? entries.find((entry) => normalizedSandboxQuery(entry.name) === normalizedQuery)
    ?? null;
}

function sourceAlias(entries, query) {
  if (String(query).startsWith('source-')) return null;
  return exactEntry(entries, `source-${query}`);
}

function curatedAlias(entries, query) {
  const ids = CURATED_ALIASES.get(normalizedSandboxQuery(query)) ?? [];
  for (const id of ids) {
    const entry = exactEntry(entries, id);
    if (entry) return entry;
  }
  return null;
}

export function resolveSandboxEntry(entries, query, options = {}) {
  const filteredEntries = options.kindFilter?.length
    ? entries.filter((entry) => options.kindFilter.includes(entry.kind))
    : entries;
  const requestedId = String(query ?? '').trim();
  if (!requestedId) {
    return {
      found: false,
      requestedId,
      reason: 'missing-id',
      entries: filteredEntries,
      suggestions: [],
    };
  }

  const exact = exactEntry(filteredEntries, requestedId);
  if (exact) return { found: true, entry: exact, requestedId, method: 'exact', entries: filteredEntries, suggestions: [] };

  const source = sourceAlias(filteredEntries, requestedId);
  if (source) return { found: true, entry: source, requestedId, method: 'source-alias', entries: filteredEntries, suggestions: [] };

  const alias = curatedAlias(filteredEntries, requestedId);
  if (alias) return { found: true, entry: alias, requestedId, method: 'curated-alias', entries: filteredEntries, suggestions: [] };

  const suggestions = sandboxSuggestions(filteredEntries, requestedId, options.limit ?? 8);
  if (options.best && suggestions.length) {
    return { found: true, entry: suggestions[0].entry, requestedId, method: 'best-match', entries: filteredEntries, suggestions };
  }

  return {
    found: false,
    requestedId,
    reason: suggestions.length > 1 ? 'ambiguous-or-unknown' : 'unknown-id',
    entries: filteredEntries,
    suggestions,
  };
}
