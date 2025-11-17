import { describe, it, expect } from 'vitest';
import { parseSqlRelationships } from '../src/lib/usage/sql';

describe('parseSqlRelationships', () => {
  it('extracts sources from FROM and JOIN', () => {
    const sql = `SELECT a.* FROM Contacts a JOIN StagingContacts s ON a.Id = s.Id`;
    const rel = parseSqlRelationships(sql);
    expect(rel.sources).toContain('Contacts');
    expect(rel.sources).toContain('StagingContacts');
  });

  it('extracts targets from INSERT INTO', () => {
    const sql = `INSERT INTO MasterSubscribers (Email) SELECT Email FROM Contacts`;
    const rel = parseSqlRelationships(sql);
    expect(rel.targets).toContain('MasterSubscribers');
    expect(rel.sources).toContain('Contacts');
  });

  it('handles bracketed names and UPDATE', () => {
    const sql = `UPDATE [Leads_Archive] SET X=1 FROM [Leads_Archive] la JOIN Src ON la.Id=Src.Id`;
    const rel = parseSqlRelationships(sql);
    expect(rel.targets).toContain('Leads_Archive');
    expect(rel.sources).toContain('Leads_Archive');
    expect(rel.sources).toContain('Src');
  });
});
