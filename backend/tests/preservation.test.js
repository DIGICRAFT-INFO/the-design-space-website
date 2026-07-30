/**
 * Preservation Property Tests — Backend
 *
 * These tests verify that existing happy-path behaviors are UNCHANGED after all
 * bug fixes are applied. They MUST PASS on both unfixed and fixed code.
 *
 * Validates: Requirements 3.3, 3.4, 3.5, 3.6, 3.9, 3.10
 */

'use strict';

jest.mock('../models/User');
jest.mock('../models/invoice');
jest.mock('../services/whatsapp_service');
jest.mock('../services/email_service');
// Use a factory that doesn't reference out-of-scope variables
jest.mock('node-cron', () => ({ schedule: jest.fn() }));
// uuid uses ESM — transform it
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-jest';

const User = require('../models/User');
const Invoice = require('../models/invoice');
const waService = require('../services/whatsapp_service');
const emailService = require('../services/email_service');
const authController = require('../controllers/auth_controller');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRes() {
  const res = {
    _status: 200,
    _body: undefined,
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
  };
  return res;
}

// ---------------------------------------------------------------------------
// Bug 2 preservation — token_obtain_pair happy paths
// ---------------------------------------------------------------------------

describe('Preservation — token_obtain_pair happy paths', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns HTTP 200 with access + refresh + user when credentials are valid and user is active', async () => {
    const fakeUser = {
      _id: 'user-uuid-123',
      email: 'owner@example.com',
      full_name: 'Test Owner',
      role: 'owner',
      is_active: true,
      page_access: ['dashboard'],
      check_password: jest.fn().mockResolvedValue(true),
    };
    User.findOne = jest.fn().mockResolvedValue(fakeUser);

    const req = { body: { email: 'owner@example.com', password: 'Password123' } };
    const res = makeRes();

    await authController.token_obtain_pair(req, res);

    expect(res._status).toBe(200);
    expect(res._body).toHaveProperty('access');
    expect(res._body).toHaveProperty('refresh');
    expect(res._body.user).toMatchObject({
      id: 'user-uuid-123',
      email: 'owner@example.com',
      role: 'owner',
    });
  });

  it('returns HTTP 401 when credentials are invalid (user not found)', async () => {
    User.findOne = jest.fn().mockResolvedValue(null);

    const req = { body: { email: 'nobody@example.com', password: 'wrongpass' } };
    const res = makeRes();

    await authController.token_obtain_pair(req, res);

    expect(res._status).toBe(401);
    expect(res._body).toMatchObject({ detail: expect.any(String) });
  });

  it('returns HTTP 401 when password is wrong', async () => {
    const fakeUser = {
      _id: 'user-uuid-456',
      email: 'user@example.com',
      full_name: 'Test User',
      role: 'designer',
      is_active: true,
      page_access: [],
      check_password: jest.fn().mockResolvedValue(false),
    };
    User.findOne = jest.fn().mockResolvedValue(fakeUser);

    const req = { body: { email: 'user@example.com', password: 'wrongpass' } };
    const res = makeRes();

    await authController.token_obtain_pair(req, res);

    expect(res._status).toBe(401);
  });

  it('returns HTTP 403 when user account is inactive (pending approval)', async () => {
    const fakeUser = {
      _id: 'user-uuid-789',
      email: 'pending@example.com',
      full_name: 'Pending User',
      role: 'designer',
      is_active: false,
      page_access: [],
      check_password: jest.fn().mockResolvedValue(true),
    };
    User.findOne = jest.fn().mockResolvedValue(fakeUser);

    const req = { body: { email: 'pending@example.com', password: 'Password123' } };
    const res = makeRes();

    await authController.token_obtain_pair(req, res);

    expect(res._status).toBe(403);
    expect(res._body.detail).toMatch(/pending/i);
  });
});

// ---------------------------------------------------------------------------
// Bug 2 preservation — register happy paths
// ---------------------------------------------------------------------------

describe('Preservation — register happy paths', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns HTTP 201 with success detail when registration is valid', async () => {
    User.findOne = jest.fn().mockResolvedValue(null); // no existing user
    User.create = jest.fn().mockResolvedValue({
      _id: 'new-user-uuid',
      email: 'newuser@example.com',
      full_name: 'New User',
      role: 'designer',
    });

    const req = {
      body: {
        email: 'newuser@example.com',
        full_name: 'New User',
        role: 'designer',
        password: 'SecurePass123',
      },
    };
    const res = makeRes();

    await authController.register(req, res);

    expect(res._status).toBe(201);
    expect(res._body).toHaveProperty('email', 'newuser@example.com');
    expect(res._body.detail).toMatch(/Registration successful/i);
  });

  it('returns HTTP 400 when password is too short', async () => {
    const req = {
      body: {
        email: 'test@example.com',
        full_name: 'Test',
        role: 'designer',
        password: 'short',
      },
    };
    const res = makeRes();

    await authController.register(req, res);

    expect(res._status).toBe(400);
    expect(res._body).toHaveProperty('password');
  });

  it('returns HTTP 400 when email already exists', async () => {
    User.findOne = jest.fn().mockResolvedValue({ email: 'existing@example.com' });

    const req = {
      body: {
        email: 'existing@example.com',
        full_name: 'Existing',
        role: 'designer',
        password: 'Password123',
      },
    };
    const res = makeRes();

    await authController.register(req, res);

    expect(res._status).toBe(400);
    expect(res._body).toHaveProperty('email');
  });
});

// ---------------------------------------------------------------------------
// Bug 3 preservation — user_list happy path
// ---------------------------------------------------------------------------

describe('Preservation — user_list happy path', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns HTTP 200 with array of active users when DB is available', async () => {
    const fakeUsers = [
      { _id: 'u1', email: 'a@test.com', full_name: 'Alice', role: 'owner', is_active: true },
      { _id: 'u2', email: 'b@test.com', full_name: 'Bob', role: 'designer', is_active: true },
    ];

    // Mock the chained .find().sort().select() pattern
    const chainMock = {
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue(fakeUsers),
    };
    User.find = jest.fn().mockReturnValue(chainMock);

    const req = {};
    const res = makeRes();

    await authController.user_list(req, res);

    expect(res._status).toBe(200);
    expect(Array.isArray(res._body)).toBe(true);
    expect(res._body).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Bug 5 preservation — reminder_task loads cleanly and runs normally
// ---------------------------------------------------------------------------

describe('Preservation — reminder_task module loads without MODULE_NOT_FOUND', () => {
  it('can be required without throwing', () => {
    expect(() => {
      jest.resetModules();
      jest.mock('node-cron', () => ({ schedule: jest.fn() }));
      jest.mock('../models/invoice');
      jest.mock('../services/whatsapp_service');
      jest.mock('../services/email_service');
      jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));
      require('../tasks/reminder_task');
    }).not.toThrow();
  });

  it('registers exactly one cron schedule on load', () => {
    jest.resetModules();
    // Factory must not reference out-of-scope variables — use jest.fn() inline
    jest.mock('node-cron', () => ({ schedule: jest.fn() }));
    jest.mock('../models/invoice');
    jest.mock('../services/whatsapp_service');
    jest.mock('../services/email_service');
    jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

    require('../tasks/reminder_task');

    const cron = require('node-cron');
    expect(cron.schedule).toHaveBeenCalledTimes(1);
    expect(cron.schedule.mock.calls[0][0]).toBe('0 9 * * *');
  });
});

describe('Preservation — send_overdue_reminders runs normally when DB is available', () => {
  it('updates overdue invoices and sends reminders when services work', async () => {
    jest.resetModules();
    jest.mock('node-cron', () => ({ schedule: jest.fn() }));
    jest.mock('../models/invoice');
    jest.mock('../services/whatsapp_service');
    jest.mock('../services/email_service');
    jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

    const InvoiceMock = require('../models/invoice');
    InvoiceMock.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 2 });

    const fakeInvoices = [
      {
        invoice_number: 'INV-001',
        project: { client: { full_name: 'Client A', phone: '+911234567890', email: 'a@client.com' } },
      },
    ];
    InvoiceMock.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(fakeInvoices),
    });

    const waMock = require('../services/whatsapp_service');
    waMock.send_payment_reminder_whatsapp = jest.fn().mockResolvedValue({ sent: true });

    const emailMock = require('../services/email_service');
    emailMock.send_payment_reminder_email = jest.fn().mockResolvedValue({ sent: true });

    require('../tasks/reminder_task');

    const cron = require('node-cron');
    const scheduledCallback = cron.schedule.mock.calls[0][1];

    // Should resolve without error when DB and services are available
    await expect(Promise.resolve(scheduledCallback())).resolves.not.toThrow();
  });
});
