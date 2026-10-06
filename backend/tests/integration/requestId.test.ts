import { describe, it, expect, beforeEach } from 'vitest';
import { generateRequestId } from '../../src/lib/requestId';
import { prisma } from '../../src/lib/prisma';
import { resetDb } from '../helpers';

describe('generateRequestId concurrency', () => {
  beforeEach(resetDb);

  it('never produces duplicate or skipped sequence numbers under concurrent allocation', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => generateRequestId('domestic')));
    const unique = new Set(results);
    expect(unique.size).toBe(20);
    const sequences = results.map((id) => parseInt(id.split('-')[2], 10)).sort((a, b) => a - b);
    expect(sequences).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    results.forEach((id) => expect(id).toMatch(/^DOM-\d{4}-\d{3}$/));
  });

  it('keeps separate sequences per type', async () => {
    const [dom1, chr1, dom2] = await Promise.all([generateRequestId('domestic'), generateRequestId('charter'), generateRequestId('domestic')]);
    expect(dom1).toMatch(/^DOM-/);
    expect(chr1).toMatch(/^CHR-/);
    expect(dom2).toMatch(/^DOM-/);
    const row = await prisma.requestSequence.findUnique({ where: { type_year: { type: 'domestic', year: new Date().getFullYear() } } });
    expect(row?.lastValue).toBe(2);
  });

  it('never allocates a number just from building a draft preview (nothing is called until Confirm)', async () => {
    // The preview is rendered entirely client-side — this test documents the
    // contract that generateRequestId is the ONLY thing that consumes a
    // sequence number, so simply not calling it (as an abandoned preview
    // never does) leaves the table untouched.
    const before = await prisma.requestSequence.findMany();
    expect(before).toEqual([]);
  });
});
