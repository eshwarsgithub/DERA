// Very lightweight SQL parser for SFMC-like SQL to infer DE sources/targets.
// Heuristics only: looks for FROM/JOIN as sources; INSERT INTO/UPDATE/INTO as targets.

// keep reserved for future improvements (tokenization)
// const TOKEN_RX = /[a-zA-Z0-9_\-\.\[\]]+/g;

export type SqlRelations = {
  sources: string[];
  targets: string[];
};

export function parseSqlRelationships(sql?: string): SqlRelations {
  if (!sql) return { sources: [], targets: [] };
  const s = sql.replace(/\s+/g, ' ').trim();
  // const lower = s.toLowerCase();

  const sources = new Set<string>();
  const targets = new Set<string>();

  // Capture table-like tokens after FROM and JOIN
  const fromJoin = /\b(from|join)\s+([a-zA-Z0-9_\-\.\[\]]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = fromJoin.exec(s))) {
    const raw = m[2];
    const name = normalizeTable(raw);
    if (name) sources.add(name);
  }

  // Capture INSERT INTO / INTO patterns
  const into = /\b(insert\s+into|into|update)\s+([a-zA-Z0-9_\-\.\[\]]+)/gi;
  while ((m = into.exec(s))) {
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
