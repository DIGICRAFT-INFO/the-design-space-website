/**
 * Unit Tests — checkPathAccess logic (Bug 7 fix)
 * Validates: Requirements 2.13, 2.14, 2.15, 3.13, 3.14, 3.15
 *
 * checkPathAccess is defined inside the DashboardLayout component and cannot
 * be imported directly. We extract and test the exact logic inline here,
 * mirroring the fixed implementation in layout.tsx.
 */

type Role = 'owner' | 'manager' | 'accountant' | 'designer' | null;

// Mirrors the FIXED checkPathAccess from layout.tsx (uses startsWith)
function checkPathAccess(pathname: string, userRole: Role): boolean {
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

describe('checkPathAccess — Bug 7 fix: startsWith prevents false-positive 403', () => {
  it('does NOT block /dashboard/web-cms/portfolio for manager (no false-positive)', () => {
    // The bug: includes('/portfolio') matched web-cms/portfolio, triggering wrong rule
    // The fix: startsWith('/dashboard/portfolio') does NOT match this path
    expect(checkPathAccess('/dashboard/web-cms/portfolio', 'manager')).toBe(true);
  });

  it('does NOT block /dashboard/web-cms/portfolio for owner', () => {
    expect(checkPathAccess('/dashboard/web-cms/portfolio', 'owner')).toBe(true);
  });

  it('web-cms rule correctly governs /dashboard/web-cms/portfolio (allows owner/manager)', () => {
    // The web-cms startsWith rule correctly applies to this path
    expect(checkPathAccess('/dashboard/web-cms/portfolio', 'owner')).toBe(true);
    expect(checkPathAccess('/dashboard/web-cms/portfolio', 'manager')).toBe(true);
    expect(checkPathAccess('/dashboard/web-cms/portfolio', 'accountant')).toBe(false);
    expect(checkPathAccess('/dashboard/web-cms/portfolio', 'designer')).toBe(false);
  });

  it('correctly identifies /dashboard/web-cms sub-paths', () => {
    expect(checkPathAccess('/dashboard/web-cms', 'manager')).toBe(true);
    expect(checkPathAccess('/dashboard/web-cms/blog', 'manager')).toBe(true);
    expect(checkPathAccess('/dashboard/web-cms/careers', 'owner')).toBe(true);
    expect(checkPathAccess('/dashboard/web-cms/seo', 'designer')).toBe(false);
    expect(checkPathAccess('/dashboard/web-cms/settings', 'accountant')).toBe(false);
  });
});

describe('checkPathAccess — Preservation: correct access for all role/path combinations', () => {
  // Portfolio section — only owner and manager
  describe('portfolio section', () => {
    it('grants owner access to /dashboard/portfolio', () => {
      expect(checkPathAccess('/dashboard/portfolio', 'owner')).toBe(true);
    });
    it('grants manager access to /dashboard/portfolio', () => {
      expect(checkPathAccess('/dashboard/portfolio', 'manager')).toBe(true);
    });
    it('denies designer access to /dashboard/portfolio', () => {
      expect(checkPathAccess('/dashboard/portfolio', 'designer')).toBe(false);
    });
    it('denies accountant access to /dashboard/portfolio', () => {
      expect(checkPathAccess('/dashboard/portfolio', 'accountant')).toBe(false);
    });
  });

  // Invoices and payments — owner, manager, accountant
  describe('invoices and payments', () => {
    it('grants accountant access to /dashboard/invoices', () => {
      expect(checkPathAccess('/dashboard/invoices', 'accountant')).toBe(true);
    });
    it('grants accountant access to /dashboard/payments', () => {
      expect(checkPathAccess('/dashboard/payments', 'accountant')).toBe(true);
    });
    it('denies designer access to /dashboard/invoices', () => {
      expect(checkPathAccess('/dashboard/invoices', 'designer')).toBe(false);
    });
    it('denies designer access to /dashboard/payments', () => {
      expect(checkPathAccess('/dashboard/payments', 'designer')).toBe(false);
    });
  });

  // Settings — owner, manager, accountant
  describe('settings', () => {
    it('grants accountant access to /dashboard/settings', () => {
      expect(checkPathAccess('/dashboard/settings', 'accountant')).toBe(true);
    });
    it('grants manager access to /dashboard/settings', () => {
      expect(checkPathAccess('/dashboard/settings', 'manager')).toBe(true);
    });
    it('denies designer access to /dashboard/settings', () => {
      expect(checkPathAccess('/dashboard/settings', 'designer')).toBe(false);
    });
  });

  // Quotations — only owner and manager
  describe('quotations', () => {
    it('denies accountant access to /dashboard/quotations', () => {
      expect(checkPathAccess('/dashboard/quotations', 'accountant')).toBe(false);
    });
    it('denies designer access to /dashboard/quotations', () => {
      expect(checkPathAccess('/dashboard/quotations', 'designer')).toBe(false);
    });
    it('grants owner access to /dashboard/quotations', () => {
      expect(checkPathAccess('/dashboard/quotations', 'owner')).toBe(true);
    });
  });

  // Unrestricted paths
  describe('unrestricted paths', () => {
    it('grants designer access to /dashboard root', () => {
      expect(checkPathAccess('/dashboard', 'designer')).toBe(true);
    });
    it('grants designer access to /dashboard/clients', () => {
      expect(checkPathAccess('/dashboard/clients', 'designer')).toBe(true);
    });
    it('grants designer access to /dashboard/projects', () => {
      expect(checkPathAccess('/dashboard/projects', 'designer')).toBe(true);
    });
    it('grants designer access to /dashboard/enquiry', () => {
      expect(checkPathAccess('/dashboard/enquiry', 'designer')).toBe(true);
    });
    it('grants any role access to /dashboard/notifications', () => {
      expect(checkPathAccess('/dashboard/notifications', 'designer')).toBe(true);
      expect(checkPathAccess('/dashboard/notifications', 'accountant')).toBe(true);
    });
  });
});

describe('checkPathAccess — Bug 7: startsWith vs includes difference', () => {
  it('startsWith correctly rejects /dashboard/web-cms/portfolio for portfolio rule', () => {
    // The portfolio rule should NOT fire for this path
    const path = '/dashboard/web-cms/portfolio';
    expect(path.startsWith('/dashboard/portfolio')).toBe(false);
    // But the old includes-based check incorrectly matched:
    expect(path.includes('/portfolio')).toBe(true); // this was the bug
  });

  it('startsWith correctly matches /dashboard/portfolio for portfolio rule', () => {
    expect('/dashboard/portfolio'.startsWith('/dashboard/portfolio')).toBe(true);
    expect('/dashboard/portfolio/123'.startsWith('/dashboard/portfolio')).toBe(true);
  });
});
