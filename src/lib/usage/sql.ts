// Very lightweight SQL parser for SFMC-like SQL to infer DE sources/targets.
// Heuristics only: looks for FROM/JOIN as sources; INSERT INTO/UPDATE/INTO as targets.

// Pre-compiled regex patterns for better performance
const WHITESPACE_RX = /\s+/g;
const FROM_JOIN_RX = /\b(from|join)\s+([a-zA-Z0-9_\-\.\[\]]+)/gi;
const INTO_UPDATE_RX = /\b(insert\s+into|into|update)\s+([a-zA-Z0-9_\-\.\[\]]+)/gi;

export type SqlRelations = {
  sources: string[];
  targets: string[];
};

export function parseSqlRelationships(sql?: string): SqlRelations {
  if (!sql) return { sources: [], targets: [] };
  const s = sql.replace(WHITESPACE_RX, ' ').trim();

  const sources = new Set<string>();
  const targets = new Set<string>();

  // Reset regex lastIndex since we're reusing global patterns
  FROM_JOIN_RX.lastIndex = 0;
  INTO_UPDATE_RX.lastIndex = 0;

  // Capture table-like tokens after FROM and JOIN
  let m: RegExpExecArray | null;
  while ((m = FROM_JOIN_RX.exec(s))) {
    const raw = m[2];
    const name = normalizeTable(raw);
    if (name) sources.add(name);
  }

  // Capture INSERT INTO / INTO patterns
  while ((m = INTO_UPDATE_RX.exec(s))) {
    const raw = m[2];
    const name = normalizeTable(raw);
    if (name) targets.add(name);
  }

  return { sources: Array.from(sources), targets: Array.from(targets) };
}

export function normalizeTable(name?: string): string | null {
  if (!name) return null;
  let n = name.trim();
  if (n.startsWith('[') && n.endsWith(']')) n = n.slice(1, -1);
  return n || null;
}
