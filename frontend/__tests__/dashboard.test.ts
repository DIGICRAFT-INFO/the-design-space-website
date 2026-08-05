/**
 * Unit Tests — Dashboard SVG <defs> stray text node (Bug 1 fix)
 * Validates: Requirements 2.1, 2.2, 3.1, 3.2
 *
 * Uses fs.readFileSync to check the source file directly.
 */

import * as fs from 'fs';
import * as path from 'path';

const DASHBOARD_PAGE_PATH = path.resolve(
  __dirname,
  '..',
  'app',
  '(admin)',
  'dashboard',
  'page.tsx',
);

describe('Bug 1 fix — Dashboard SVG <defs> contains no stray "sdf" text node', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(DASHBOARD_PAGE_PATH, 'utf-8');
  });

  it('source file is readable', () => {
    expect(source.length).toBeGreaterThan(100);
  });

  it('does NOT contain "</linearGradient>sdf" anywhere in the file', () => {
    expect(source).not.toContain('</linearGradient>sdf');
  });

  it('<defs> block does NOT contain bare "sdf" text', () => {
    const defsStart = source.indexOf('<defs>');
    const defsEnd = source.indexOf('</defs>', defsStart);
    expect(defsStart).toBeGreaterThan(-1);
    expect(defsEnd).toBeGreaterThan(defsStart);

    const defsBlock = source.slice(defsStart, defsEnd + '</defs>'.length);
    expect(defsBlock).not.toContain('sdf');
  });

  it('still contains both linearGradient elements (invoicedGrad and collectedGrad)', () => {
    const defsStart = source.indexOf('<defs>');
    const defsEnd = source.indexOf('</defs>', defsStart);
    const defsBlock = source.slice(defsStart, defsEnd + '</defs>'.length);

    expect(defsBlock).toContain('id="invoicedGrad"');
    expect(defsBlock).toContain('id="collectedGrad"');
  });

  it('the two linearGradients are adjacent with no stray text between closing and opening tags', () => {
    // After the fix, </linearGradient> immediately precedes whitespace and then
    // the next <linearGradient — there should be no "sdf" in between
    const between = source.match(/<\/linearGradient>([\s\S]*?)<linearGradient id="collectedGrad"/);
    expect(between).not.toBeNull();
    if (between) {
      // The content between the two tags should only be whitespace (newlines/spaces)
      expect(between[1].trim()).toBe('');
    }
  });
});
