/**
 * Unit Tests — loginUser in authService.ts (Bug 8 fix)
 * Validates: Requirements 2.16, 2.17, 3.16, 3.17, 3.18
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

describe('loginUser — Bug 8 fix: safe error handling', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.resetModules();
  });
  afterEach(() => {
    localStorage.clear();
    jest.resetAllMocks();
  });

  it('throws human-readable Error (not SyntaxError) when server returns 502 with HTML body', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token < in JSON at position 0')),
    });

    jest.doMock('../lib/config', () => 'http://test.local/api/v1');
    const { loginUser } = require('../services/authService');

    let caught: unknown = null;
    try {
      await loginUser({ email: 'user@test.com', password: 'Password123' });
    } catch (e) {
      caught = e;
    }

    expect(caught).not.toBeNull();
    expect(caught).toBeInstanceOf(Error);
    expect(caught).not.toBeInstanceOf(SyntaxError);
    const msg = (caught as Error).message;
    expect(msg).not.toMatch(/Unexpected token/i);
    expect(msg).not.toMatch(/JSON at position/i);
  });

  it('throws with non_field_errors[0] when backend returns non_field_errors array', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ non_field_errors: ['Invalid email or password.'] }),
    });

    jest.doMock('../lib/config', () => 'http://test.local/api/v1');
    const { loginUser } = require('../services/authService');

    await expect(loginUser({ email: 'x@y.com', password: 'wrong' }))
      .rejects.toThrow('Invalid email or password.');
  });

  it('throws with detail message when backend returns { detail: "..." }', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({ detail: 'Your account is pending approval from the Manager.' }),
    });

    jest.doMock('../lib/config', () => 'http://test.local/api/v1');
    const { loginUser } = require('../services/authService');

    await expect(loginUser({ email: 'x@y.com', password: 'Password123' }))
      .rejects.toThrow('Your account is pending approval from the Manager.');
  });

  it('throws fallback message when 502 body is completely unparseable', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: '',
      json: jest.fn().mockRejectedValue(new SyntaxError('Not JSON')),
    });

    jest.doMock('../lib/config', () => 'http://test.local/api/v1');
    const { loginUser } = require('../services/authService');

    let caught: unknown = null;
    try {
      await loginUser({ email: 'x@y.com', password: 'pass' });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(Error);
    // Message should be the fallback, not a raw JSON parse error
    expect((caught as Error).message).not.toMatch(/Unexpected token/i);
    expect((caught as Error).message.length).toBeGreaterThan(0);
  });
});

describe('loginUser — Preservation: happy paths unchanged', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.resetModules();
    (global as any).window = { location: { href: '' } };
  });
  afterEach(() => {
    localStorage.clear();
    jest.resetAllMocks();
  });

  it('stores tokens and returns AuthResponse on HTTP 200', async () => {
    const fakeData = {
      access: 'access-xyz',
      refresh: 'refresh-xyz',
      user: { id: 'u1', email: 'owner@test.com', full_name: 'Owner', role: 'owner' },
    };
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fakeData,
    });

    jest.doMock('../lib/config', () => 'http://test.local/api/v1');
    const { loginUser } = require('../services/authService');

    const result = await loginUser({ email: 'owner@test.com', password: 'Password123' });

    expect(result.access).toBe('access-xyz');
    expect(result.refresh).toBe('refresh-xyz');
    expect(localStorage.getItem('access')).toBe('access-xyz');
    expect(localStorage.getItem('refresh')).toBe('refresh-xyz');
    expect(JSON.parse(localStorage.getItem('user') || '{}')).toMatchObject({ id: 'u1' });
  });

  it('throws with backend detail on HTTP 401 (invalid credentials)', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ detail: 'No active account found with the given credentials' }),
    });

    jest.doMock('../lib/config', () => 'http://test.local/api/v1');
    const { loginUser } = require('../services/authService');

    await expect(loginUser({ email: 'wrong@test.com', password: 'badpass' }))
      .rejects.toThrow('No active account found with the given credentials');
  });

  it('throws with pending-approval detail on HTTP 403', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({ detail: 'Your account is pending approval from the Manager.' }),
    });

    jest.doMock('../lib/config', () => 'http://test.local/api/v1');
    const { loginUser } = require('../services/authService');

    await expect(loginUser({ email: 'pending@test.com', password: 'Password123' }))
      .rejects.toThrow('Your account is pending approval from the Manager.');
  });
});
