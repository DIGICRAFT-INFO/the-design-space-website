/**
 * Preservation Property Tests — Frontend
 *
 * These tests verify that existing happy-path behaviors are UNCHANGED after all
 * bug fixes are applied. They MUST PASS on both unfixed and fixed code.
 *
 * Validates: Requirements 3.7, 3.8, 3.13, 3.14, 3.15, 3.16, 3.17, 3.18
 */

// ---------------------------------------------------------------------------
// Environment setup
// ---------------------------------------------------------------------------

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
Object.defineProperty(global, 'window', {
  value: { location: { href: '' } },
  writable: true,
});

// ---------------------------------------------------------------------------
// Bug 4 preservation — fetchWithAuth with 2xx → returns raw Response unchanged
// ---------------------------------------------------------------------------

describe('Preservation — fetchWithAuth: 2xx response returns raw Response (does not throw)', () => {
  beforeEach(() => {
    localStorage.setItem('access', 'valid-token-abc');
    jest.resetModules();
  });

  afterEach(() => {
    localStorage.clear();
    jest.resetAllMocks();
  });

  it('returns the raw Response object for HTTP 200', async () => {
    const fakeResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ data: 'some-data' }),
    };
    (global as any).fetch = jest.fn().mockResolvedValue(fakeResponse);

    const { fetchWithAuth } = require('../lib/api');
    const result = await fetchWithAuth('http://test.local/api/data');

    expect(result).toBe(fakeResponse);
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
  });

  it('returns the raw Response object for HTTP 201', async () => {
    const fakeResponse = { ok: true, status: 201, statusText: 'Created', json: async () => ({}) };
    (global as any).fetch = jest.fn().mockResolvedValue(fakeResponse);

    const { fetchWithAuth } = require('../lib/api');
    const result = await fetchWithAuth('http://test.local/api/data', { method: 'POST' });

    expect(result).toBe(fakeResponse);
    expect(result.status).toBe(201);
  });

  it('returns the raw Response object for HTTP 204', async () => {
    const fakeResponse = { ok: true, status: 204, statusText: 'No Content', json: async () => null };
    (global as any).fetch = jest.fn().mockResolvedValue(fakeResponse);

    const { fetchWithAuth } = require('../lib/api');
    const result = await fetchWithAuth('http://test.local/api/data', { method: 'DELETE' });

    expect(result).toBe(fakeResponse);
    expect(result.status).toBe(204);
  });
});

// ---------------------------------------------------------------------------
// Bug 4 preservation — fetchWithAuth 401 → clears localStorage and redirects
// ---------------------------------------------------------------------------

describe('Preservation — fetchWithAuth: 401 clears localStorage and redirects', () => {
  beforeEach(() => {
    localStorage.setItem('access', 'expired-token');
    localStorage.setItem('token', 'old-token');
    localStorage.setItem('refresh', 'refresh-token');
    localStorage.setItem('user', JSON.stringify({ id: '1' }));
    jest.resetModules();
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
      json: async () => ({ detail: 'Invalid token.' }),
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
      json: async () => ({ detail: 'Invalid token.' }),
    });

    const { fetchWithAuth } = require('../lib/api');
    await fetchWithAuth('http://test.local/api/protected');

    expect((global as any).window.location.href).toBe('/login');
  });
});

// ---------------------------------------------------------------------------
// Bug 7 preservation — checkPathAccess logic (inline, mirrors layout.tsx)
// ---------------------------------------------------------------------------
//
// checkPathAccess is defined inside the DashboardLayout component and cannot
// be imported directly. We test the exact string-matching logic inline here —
// the same conditions used in the component.

type Role = 'owner' | 'manager' | 'accountant' | 'designer';

// Mirrors the FIXED checkPathAccess logic (startsWith)
function checkPathAccess_fixed(pathname: string, userRole: Role | null): boolean {
  if (pathname.startsWith('/dashboard/settings')) {
    return userRole === 'owner' || userRole === 'manager' || userRole === 'accountant';
  }
  if (
    pathname.startsWith('/dashboard/quotations') ||
    pathname.startsWith('/dashboard/portfolio') ||
    pathname.startsWith('/dashboard/pending-users') ||
    pathname.startsWith('/dashboard/web-cms')
  ) {
    return userRole === 'owner' || userRole === 'manager';
  }
  if (pathname.startsWith('/dashboard/invoices') || pathname.startsWith('/dashboard/payments')) {
    return userRole === 'owner' || userRole === 'manager' || userRole === 'accountant';
  }
  return true;
}

// Mirrors the UNFIXED checkPathAccess logic (includes)
function checkPathAccess_unfixed(pathname: string, userRole: Role | null): boolean {
  if (pathname.includes('/settings')) {
    return userRole === 'owner' || userRole === 'manager' || userRole === 'accountant';
  }
  if (
    pathname.includes('/quotations') ||
    pathname.includes('/portfolio') ||
    pathname.includes('/pending-users') ||
    pathname.includes('/web-cms')
  ) {
    return userRole === 'owner' || userRole === 'manager';
  }
  if (pathname.includes('/invoices') || pathname.includes('/payments')) {
    return userRole === 'owner' || userRole === 'manager' || userRole === 'accountant';
  }
  return true;
}

describe('Preservation — checkPathAccess: correct role+path combinations always granted', () => {
  // These cases must pass on BOTH unfixed and fixed implementations
  const grantedCases: Array<{ path: string; role: Role; desc: string }> = [
    { path: '/dashboard', role: 'owner', desc: 'owner at dashboard root' },
    { path: '/dashboard', role: 'manager', desc: 'manager at dashboard root' },
    { path: '/dashboard', role: 'accountant', desc: 'accountant at dashboard root' },
    { path: '/dashboard', role: 'designer', desc: 'designer at dashboard root' },
    { path: '/dashboard/portfolio', role: 'owner', desc: 'owner at portfolio' },
    { path: '/dashboard/portfolio', role: 'manager', desc: 'manager at portfolio' },
    { path: '/dashboard/web-cms', role: 'owner', desc: 'owner at web-cms' },
    { path: '/dashboard/web-cms', role: 'manager', desc: 'manager at web-cms' },
    { path: '/dashboard/quotations', role: 'owner', desc: 'owner at quotations' },
    { path: '/dashboard/invoices', role: 'accountant', desc: 'accountant at invoices' },
    { path: '/dashboard/payments', role: 'accountant', desc: 'accountant at payments' },
    { path: '/dashboard/settings', role: 'accountant', desc: 'accountant at settings' },
    { path: '/dashboard/clients', role: 'designer', desc: 'designer at clients' },
    { path: '/dashboard/projects', role: 'designer', desc: 'designer at projects' },
  ];

  grantedCases.forEach(({ path, role, desc }) => {
    it(`grants access — ${desc} (unfixed)`, () => {
      expect(checkPathAccess_unfixed(path, role)).toBe(true);
    });
    it(`grants access — ${desc} (fixed)`, () => {
      expect(checkPathAccess_fixed(path, role)).toBe(true);
    });
  });

  // Cases that should be DENIED
  const deniedCases: Array<{ path: string; role: Role; desc: string }> = [
    { path: '/dashboard/portfolio', role: 'designer', desc: 'designer at portfolio' },
    { path: '/dashboard/portfolio', role: 'accountant', desc: 'accountant at portfolio' },
    { path: '/dashboard/quotations', role: 'designer', desc: 'designer at quotations' },
    { path: '/dashboard/quotations', role: 'accountant', desc: 'accountant at quotations' },
    { path: '/dashboard/web-cms', role: 'designer', desc: 'designer at web-cms' },
    { path: '/dashboard/web-cms', role: 'accountant', desc: 'accountant at web-cms' },
    { path: '/dashboard/invoices', role: 'designer', desc: 'designer at invoices' },
    { path: '/dashboard/payments', role: 'designer', desc: 'designer at payments' },
  ];

  deniedCases.forEach(({ path, role, desc }) => {
    it(`denies access — ${desc} (fixed)`, () => {
      expect(checkPathAccess_fixed(path, role)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Bug 8 preservation — loginUser: HTTP 200 stores tokens and returns AuthResponse
// ---------------------------------------------------------------------------

describe('Preservation — loginUser: HTTP 200 stores tokens and returns data', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.resetModules();
  });

  afterEach(() => {
    localStorage.clear();
    jest.resetAllMocks();
  });

  it('stores access, refresh, user in localStorage on HTTP 200', async () => {
    const fakeAuthResponse = {
      access: 'access-token-xyz',
      refresh: 'refresh-token-xyz',
      user: {
        id: 'u1',
        email: 'owner@test.com',
        full_name: 'Test Owner',
        role: 'owner',
        page_access: [],
      },
    };

    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fakeAuthResponse,
    });

    jest.doMock('../lib/config', () => 'http://test.local/api/v1');
    const { loginUser } = require('../services/authService');

    const result = await loginUser({ email: 'owner@test.com', password: 'Password123' });

    expect(localStorage.getItem('access')).toBe('access-token-xyz');
    expect(localStorage.getItem('refresh')).toBe('refresh-token-xyz');
    expect(JSON.parse(localStorage.getItem('user') || '{}')).toMatchObject({ id: 'u1' });
    expect(result).toMatchObject({ access: 'access-token-xyz' });
  });

  it('throws with the backend detail message on HTTP 403 (pending approval)', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({ detail: 'Your account is pending approval from the Manager.' }),
    });

    jest.doMock('../lib/config', () => 'http://test.local/api/v1');
    const { loginUser } = require('../services/authService');

    await expect(
      loginUser({ email: 'pending@test.com', password: 'Password123' })
    ).rejects.toThrow('Your account is pending approval from the Manager.');
  });

  it('throws with detail message on HTTP 401 (invalid credentials)', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ detail: 'No active account found with the given credentials' }),
    });

    jest.doMock('../lib/config', () => 'http://test.local/api/v1');
    const { loginUser } = require('../services/authService');

    await expect(
      loginUser({ email: 'wrong@test.com', password: 'wrongpass' })
    ).rejects.toThrow('No active account found with the given credentials');
  });
});
