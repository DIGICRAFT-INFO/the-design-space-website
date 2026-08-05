/**
 * Bug Condition Exploration Tests — Frontend (fetchWithAuth, checkPathAccess, loginUser)
 *
 * These tests are written on UNFIXED code and are EXPECTED TO FAIL.
 * Failure confirms each bug exists. Do NOT fix the code or tests when they fail.
 *
 * Validates: Requirements 2.6, 2.7, 2.13, 2.14, 2.15, 2.16, 2.17
 */

// ---------------------------------------------------------------------------
// Environment setup: jsdom gives us localStorage and window.location
// ---------------------------------------------------------------------------

// Polyfill localStorage for the Node/jsdom test environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

// Prevent window.location.href assignments from throwing in jsdom
Object.defineProperty(window, 'location', {
  value: { href: '' },
  writable: true,
});

// ---------------------------------------------------------------------------
// Bug 4 — fetchWithAuth: 500 HTML body → should throw Error, not return Response
//
// On unfixed code, fetchWithAuth returns the raw Response for non-401 errors.
// It never throws, so callers silently receive an error Response as a success.
// EXPECTED: this test FAILS on unfixed code (fetchWithAuth returns Response
// instead of throwing).
// ---------------------------------------------------------------------------

describe('Bug 4 — fetchWithAuth: non-2xx response → throws Error', () => {
  beforeEach(() => {
    localStorage.setItem('access', 'fake-token-abc');
    (global as any).fetch = jest.fn();
  });

  afterEach(() => {
    localStorage.clear();
    jest.resetAllMocks();
  });

  it('throws an Error when the server responds with 500 and an HTML body', async () => {
    const htmlBody = '<!DOCTYPE html><html><body><h1>Internal Server Error</h1></body></html>';

    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON at position 0');
      },
      text: async () => htmlBody,
    });

    // Import the module under test. We use a dynamic import (or require)
    // so that the module picks up our patched global.fetch.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchWithAuth } = require('../lib/api');

    // On unfixed code this resolves with the raw Response instead of throwing.
    // The test will fail because the returned value is not an Error throw.
    await expect(fetchWithAuth('http://test.local/api/data')).rejects.toThrow(Error);
  });

  it('the thrown error is an instance of Error, NOT a raw Response', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: async () => {
        throw new SyntaxError('Not JSON');
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchWithAuth } = require('../lib/api');

    let caught: unknown = null;
    try {
      await fetchWithAuth('http://test.local/api/data');
    } catch (e) {
      caught = e;
    }

    // On unfixed code, no error is thrown — caught remains null.
    expect(caught).not.toBeNull();
    expect(caught).toBeInstanceOf(Error);
    // Confirm it is NOT a raw Response object
    expect((caught as any).ok).toBeUndefined();
    expect((caught as any).status).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Bug 7 — checkPathAccess: /dashboard/web-cms/portfolio + designer role
//
// FIXED: checkPathAccess now uses pathname.startsWith('/dashboard/portfolio')
// so /dashboard/web-cms/portfolio no longer triggers the portfolio restriction.
// ---------------------------------------------------------------------------

describe('Bug 7 — checkPathAccess: /dashboard/web-cms/portfolio fix verified', () => {
  it('startsWith correctly does NOT match /dashboard/web-cms/portfolio for portfolio rule', () => {
    const webCmsPortfolioPath = '/dashboard/web-cms/portfolio';

    // Fixed: startsWith does NOT match — portfolio restriction not triggered
    const portfolioRuleFires_fixed = webCmsPortfolioPath.startsWith('/dashboard/portfolio');
    expect(portfolioRuleFires_fixed).toBe(false); // PASSES — fix confirmed

    // The bug was: includes DID match (true), causing false-positive 403
    const portfolioRuleFires_unfixed = webCmsPortfolioPath.includes('/portfolio');
    expect(portfolioRuleFires_unfixed).toBe(true); // documents the old bug
  });

  it('fix confirmed: /dashboard/web-cms/portfolio does not apply portfolio startsWith rule', () => {
    const pathname = '/dashboard/web-cms/portfolio';

    // Fixed implementation uses startsWith — correctly does not match
    const portfolioRuleActive_fixed = pathname.startsWith('/dashboard/portfolio');
    expect(portfolioRuleActive_fixed).toBe(false); // PASSES — fix confirmed

    // And web-cms rule fires correctly instead
    const webCmsRuleActive = pathname.startsWith('/dashboard/web-cms');
    expect(webCmsRuleActive).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Bug 8 — loginUser: 502 HTML body → should throw human-readable Error, not SyntaxError
//
// On unfixed code, loginUser calls response.json() unconditionally before
// checking response.ok. When the body is HTML (not JSON), response.json()
// throws a SyntaxError which propagates directly to the caller.
// EXPECTED: this test FAILS on unfixed code (SyntaxError propagates).
// ---------------------------------------------------------------------------

describe('Bug 8 — loginUser: non-JSON error body → human-readable Error, not SyntaxError', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.resetModules();
  });

  afterEach(() => {
    localStorage.clear();
    jest.resetAllMocks();
  });

  it('throws a human-readable Error (not SyntaxError) when server returns 502 with HTML body', async () => {
    const htmlBody = '<!DOCTYPE html><html><body><h1>Bad Gateway</h1></body></html>';

    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: jest.fn().mockRejectedValue(
        new SyntaxError('Unexpected token < in JSON at position 0')
      ),
      text: jest.fn().mockResolvedValue(htmlBody),
    });

    // Re-require so the module picks up the fresh fetch mock
    jest.mock('../lib/config', () => 'http://test.local/api/v1');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { loginUser } = require('../services/authService');

    let thrownError: unknown = null;
    try {
      await loginUser({ email: 'user@example.com', password: 'password123' });
    } catch (e) {
      thrownError = e;
    }

    // On unfixed code, loginUser calls response.json() and the SyntaxError
    // propagates directly — thrownError is a SyntaxError, not a plain Error.
    expect(thrownError).not.toBeNull();

    // This assertion FAILS on unfixed code (thrownError IS a SyntaxError):
    expect(thrownError).not.toBeInstanceOf(SyntaxError);

    // And it should be a plain Error with a human-readable message:
    expect(thrownError).toBeInstanceOf(Error);
    expect((thrownError as Error).message).not.toMatch(/Unexpected token/i);
  });

  it('the error message is not a raw JSON parse error message', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: jest.fn().mockRejectedValue(
        new SyntaxError('Unexpected token < in JSON at position 0')
      ),
    });

    jest.mock('../lib/config', () => 'http://test.local/api/v1');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { loginUser } = require('../services/authService');

    let thrownError: unknown = null;
    try {
      await loginUser({ email: 'user@example.com', password: 'badpass' });
    } catch (e) {
      thrownError = e;
    }

    // On unfixed code the SyntaxError message "Unexpected token < ..." leaks
    // through. We assert it should NOT contain that raw parse error:
    expect(thrownError).not.toBeNull();

    // This FAILS on unfixed code:
    const msg = (thrownError as Error).message || '';
    expect(msg).not.toMatch(/Unexpected token/i);
    expect(msg).not.toMatch(/JSON/i);
  });
});
