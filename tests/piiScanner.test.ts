import { describe, it, expect } from 'vitest';
import { scanField } from '../src/lib/piiScanner';

describe('piiScanner', () => {
  it('flags email fields', () => {
    const r = scanField({ name: 'EmailAddress', dataType: 'Email' });
    expect(r.isPII).toBe(true);
    expect(r.piiType).toBe('Email');
  });
  it('non PII field', () => {
    const r = scanField({ name: 'Clicks', dataType: 'Number' });
    expect(r.isPII).toBe(false);
  });
});
