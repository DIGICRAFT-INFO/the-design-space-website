/**
 * Bug Condition Exploration Tests — Dashboard SVG stray text node (Bug 1)
 *
 * This test is written on UNFIXED code and is EXPECTED TO FAIL.
 * Failure confirms the bug exists. Do NOT fix the code or tests when it fails.
 *
 * Approach: read the raw source file using Node's fs.readFileSync and assert
 * that the <defs> block does NOT contain the stray 'sdf' text node.
 * On unfixed code the string '</linearGradient>sdf' IS present → test fails.
 * On fixed code it is removed → test passes.
 *
 * Validates: Requirements 2.1, 2.2
 */

import * as fs from 'fs';
import * as path from 'path';

// Resolve the path to the dashboard page source file relative to this test
// file's location.  __dirname is frontend/__tests__/, so we go up two levels
// to the project root and then into app/(admin)/dashboard/page.tsx.
const DASHBOARD_PAGE_PATH = path.resolve(
  __dirname,
  '..',             // frontend/
  'app',
  '(admin)',
  'dashboard',
  'page.tsx',
);

describe('Bug 1 — Dashboard SVG <defs> block must NOT contain stray "sdf" text', () => {
  let sourceContent: string;

  beforeAll(() => {
    // Read the file once for all tests in this describe block
    sourceContent = fs.readFileSync(DASHBOARD_PAGE_PATH, 'utf-8');
  });

  it('source file exists and is readable', () => {
    expect(sourceContent).toBeTruthy();
    expect(sourceContent.length).toBeGreaterThan(0);
  });

  it('source file contains the <defs> block with linearGradient elements', () => {
    // Sanity check: the defs block should exist
    expect(sourceContent).toContain('<defs>');
    expect(sourceContent).toContain('linearGradient');
  });

  it('does NOT contain "</linearGradient>sdf" — stray text node after closing tag', () => {
    // On unfixed code this assertion FAILS because the source file contains:
    //   </linearGradient>sdf
    // immediately after the first <linearGradient> closing tag inside <defs>.
    //
    // Counterexample (what the unfixed file contains):
    //   <stop offset="95%" stopColor="#C8922A" stopOpacity={0} />
    //   </linearGradient>sdf          ← BUG: stray "sdf" text node
    //   <linearGradient id="collectedGrad" ...>
    //
    // After the fix: only </linearGradient> with no trailing characters.
    expect(sourceContent).not.toContain('</linearGradient>sdf');
  });

  it('does NOT contain the bare string "sdf" anywhere inside the <defs> block', () => {
    // Extract the <defs>...</defs> region for a more targeted check
    const defsStart = sourceContent.indexOf('<defs>');
    const defsEnd = sourceContent.indexOf('</defs>', defsStart);

    // If the markers are not found the file structure changed — fail loudly
    if (defsStart === -1 || defsEnd === -1) {
      throw new Error(
        'Could not locate <defs>...</defs> block in the dashboard source file. ' +
        'File may have been restructured.'
      );
    }

    const defsBlock = sourceContent.slice(defsStart, defsEnd + '</defs>'.length);

    // On unfixed code, defsBlock contains "sdf" as a bare text node → test FAILS
    // We strip JSX attribute values like stopColor, stopOpacity to avoid false
    // positives (none of them contain "sdf", but we want a clean check).
    // The simplest reliable check: look for "sdf" as a standalone text token —
    // i.e., "sdf" not preceded by a letter (not part of "stopColor": stop+sdf... no)
    // Actually "sdf" does not appear in any attribute name or value legitimately,
    // so a plain substring search is sufficient and correct:
    expect(defsBlock).not.toContain('sdf');
  });
});
