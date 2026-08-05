/**
 * Unit Tests — fetchWithAuth (Bug 4 fix)
 * Validates: Requirements 2.6, 2.7, 3.7, 3.8
 */

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
Object.defineProperty(global, 'window', { value: { location: { href: '' } }, writable: true });

describe('fetchWithAuth — Bug 4 fix: throws on non-2xx (non-401) responses', () => {
  beforeEach(() => {
    localStorage.setItem('access', 'valid-token');
    jest.resetModules();
    (global as any).window = { location: { href: '' } };
  });
  afterEach(() => {
    localStorage.clear();
    jest.resetAllMocks();
  });

  it('throws Error with detail message when server returns 500 with JSON body', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ detail: 'Database connection failed' }),
    });

    const { fetchWithAuth } = require('../lib/api');
    await expect(fetchWithAuth('http://test.local/api/data')).rejects.toThrow('Database connection failed');
  });

  it('throws Error with statusText when server returns 500 with HTML body (non-JSON)', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => { throw new SyntaxError('Unexpected token <'); },
    });

    const { fetchWithAuth } = require('../lib/api');
    await expect(fetchWithAuth('http://test.local/api/data')).rejects.toThrow('Internal Server Error');
  });

  it('throws Error for 503 with JSON message field', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: async () => ({ message: 'Service is down for maintenance' }),
    });

    const { fetchWithAuth } = require('../lib/api');
    await expect(fetchWithAuth('http://test.local/api/data')).rejects.toThrow('Service is down for maintenance');
  });

  it('throws Error for 404 (not just 500)', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ detail: 'Resource not found' }),
    });

    const { fetchWithAuth } = require('../lib/api');
    await expect(fetchWithAuth('http://test.local/api/resource/123')).rejects.toThrow('Resource not found');
  });

  it('thrown error is an Error instance, NOT a raw Response', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: async () => { throw new SyntaxError('Not JSON'); },
    });

    const { fetchWithAuth } = require('../lib/api');
    let caught: unknown = null;
    try {
      await fetchWithAuth('http://test.local/api/data');
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as any).ok).toBeUndefined();   // not a Response
    expect((caught as any).status).toBeUndefined(); // not a Response
  });
});

describe('fetchWithAuth — Preservation: 2xx returns raw Response unchanged', () => {
  beforeEach(() => {
    localStorage.setItem('access', 'valid-token');
    jest.resetModules();
  });
  afterEach(() => {
    localStorage.clear();
    jest.resetAllMocks();
  });

  it('returns the raw Response object for HTTP 200', async () => {
    const fakeResponse = { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: 'x' }) };
    (global as any).fetch = jest.fn().mockResolvedValue(fakeResponse);

    const { fetchWithAuth } = require('../lib/api');
    const result = await fetchWithAuth('http://test.local/api/data');

    expect(result).toBe(fakeResponse);
    expect(result.status).toBe(200);
  });

  it('returns the raw Response object for HTTP 201', async () => {
    const fakeResponse = { ok: true, status: 201, statusText: 'Created' };
    (global as any).fetch = jest.fn().mockResolvedValue(fakeResponse);

    const { fetchWithAuth } = require('../lib/api');
    const result = await fetchWithAuth('http://test.local/api/data', { method: 'POST' });

    expect(result).toBe(fakeResponse);
  });

  it('returns the raw Response object for HTTP 204', async () => {
    const fakeResponse = { ok: true, status: 204, statusText: 'No Content' };
    (global as any).fetch = jest.fn().mockResolvedValue(fakeResponse);

    const { fetchWithAuth } = require('../lib/api');
    const result = await fetchWithAuth('http://test.local/api/data', { method: 'DELETE' });

    expect(result).toBe(fakeResponse);
  });
});

describe('fetchWithAuth — Preservation: 401 clears localStorage and redirects', () => {
  beforeEach(() => {
    localStorage.setItem('access', 'expired-token');
    localStorage.setItem('token', 'old-token');
    localStorage.setItem('refresh', 'refresh-token');
    localStorage.setItem('user', '{"id":"1"}');
    jest.resetModules();
    (global as any).window = { location: { href: '' } };
  });
  afterEach(() => {
    localStorage.clear();
    jest.resetAllMocks();
  });

  it('clears all auth keys from localStorage on 401', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ detail: 'Token expired' }),
    });

    const { fetchWithAuth } = require('../lib/api');
    await fetchWithAuth('http://test.local/api/protected');

    expect(localStorage.getItem('access')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refresh')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('redirects to /login on 401', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({}),
    });

    const { fetchWithAuth } = require('../lib/api');
    await fetchWithAuth('http://test.local/api/protected');

    expect((global as any).window.location.href).toBe('/login');
  });
});
