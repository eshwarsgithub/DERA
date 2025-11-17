import { describe, it, expect } from 'vitest';
import { computeRisk } from '../src/lib/riskScoring';

describe('riskScoring', () => {
  it('computes higher risk for PII + orphan', () => {
    const fields = [
      { isPII: true, piiType: 'Email', sensitivityScore: 50 },
      { isPII: false, sensitivityScore: 0 },
    ];
    const risk = computeRisk(fields as any, true);
    expect(risk).toBeGreaterThan(40);
    expect(risk).toBeLessThanOrEqual(100);
  });
});
