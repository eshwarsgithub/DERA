import type { PiiResult } from './piiScanner';

type RiskOpts = {
  lastModified?: Date | string | null;
  accessibility?: 'low' | 'medium' | 'high';
  usageCount?: number; // optional future signal
};

// PRD weighting: Risk = (PII 40%) + (Accessibility 30%) + (Usage 20%) + (Age 10%)
export function computeRisk(fields: Array<PiiResult>, isOrphan: boolean, opts: RiskOpts = {}): number {
  const sumSens = fields.reduce((acc, f) => acc + (f.sensitivityScore || 0), 0);
  const piiRaw = Math.min(100, sumSens); // cap
  const piiScore = normalize(piiRaw) * 100; // 0..100

  // Accessibility heuristic: if explicit provided, map; else infer from presence of high-risk fields
  let accessibilityRaw: number;
  if (opts.accessibility) {
    accessibilityRaw = opts.accessibility === 'high' ? 100 : opts.accessibility === 'medium' ? 60 : 30;
  } else {
    const has = (t: string) => fields.some((f) => f.piiType === (t as any));
    accessibilityRaw = has('Email') || has('Phone') ? 70 : 40;
  }

  // Usage: treat orphaned as low (0), non-orphan as high (100); future: factor usageCount
  const usageRaw = isOrphan ? 10 : 90;

  // Age: if lastModified older => higher risk; unknown -> neutral mid
  let ageRaw = 50;
  if (opts.lastModified) {
    const lm = new Date(opts.lastModified).getTime();
    if (!isNaN(lm)) {
      const days = (Date.now() - lm) / (24 * 60 * 60 * 1000);
      ageRaw = days >= 365 ? 100 : days >= 180 ? 75 : days >= 90 ? 60 : 30;
    }
  }

  const risk = 0.4 * piiScore + 0.3 * accessibilityRaw + 0.2 * usageRaw + 0.1 * ageRaw;
  return clamp(risk, 0, 100);
}

function normalize(x: number): number {
  return clamp(x, 0, 100) / 100;
}

function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(x)));
}
