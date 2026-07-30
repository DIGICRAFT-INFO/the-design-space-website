/**
 * Bug Condition Exploration Tests — Backend
 *
 * These tests are written on UNFIXED code and are EXPECTED TO FAIL.
 * Failure confirms each bug exists. Do NOT fix the code or tests when they fail.
 *
 * Validates: Requirements 2.3, 2.5, 2.8
 */

'use strict';

// ---------------------------------------------------------------------------
// We import the real controller functions so that Jest runs the actual code
// path. All Mongoose model methods and service methods are mocked per-test.
// ---------------------------------------------------------------------------

// We need to mock the models BEFORE requiring the controllers so that
// Jest's module registry picks up the mocks.
jest.mock('../models/User');
jest.mock('../models/invoice');
jest.mock('../services/whatsapp_service');
jest.mock('../services/email_service');
// uuid uses ESM exports — mock it so Jest can handle it
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

// Also mock node-cron so the cron.schedule call in reminder_task.js does not
// actually register a timer during the test run.
jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

const User = require('../models/User');
const Invoice = require('../models/invoice');
const waService = require('../services/whatsapp_service');
const emailService = require('../services/email_service');

// We require the controller AFTER the mocks are set up.
const authController = require('../controllers/auth_controller');

// ---------------------------------------------------------------------------
// Helpers — build minimal Express req/res stubs
// ---------------------------------------------------------------------------

function makeRes() {
  const res = {
    _status: 200,
    _body: undefined,
    status(code) {
      this._status = code;
      return this;
    },
    json(body) {
      this._body = body;
      return this;
    },
  };
  return res;
}

// ---------------------------------------------------------------------------
// Bug 2 — token_obtain_pair: DB throws → should return HTTP 500
//
// On unfixed code, User.findOne throws an unhandled rejection and Express
// crashes / the test hangs (no try/catch around the DB call).
// EXPECTED: this test FAILS on unfixed code.
// ---------------------------------------------------------------------------

describe('Bug 2 — token_obtain_pair: DB error → HTTP 500', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns HTTP 500 when User.findOne throws a MongoNetworkError', async () => {
    const mongoError = new Error('MongoNetworkError: connection timed out');
    mongoError.name = 'MongoNetworkError';

    // Mock User.findOne to throw
    User.findOne = jest.fn().mockRejectedValue(mongoError);

    const req = { body: { email: 'test@example.com', password: 'password123' } };
    const res = makeRes();

    // On unfixed code this will throw an unhandled rejection, causing the
    // test to fail with an unhandled promise rejection rather than resolving.
    await authController.token_obtain_pair(req, res);

    expect(res._status).toBe(500);
    expect(res._body).toMatchObject({ detail: expect.any(String) });
  });
});

// ---------------------------------------------------------------------------
// Bug 3 — user_list: DB throws → should return HTTP 500
//
// On unfixed code, User.find throws an unhandled rejection; the handler
// never responds and the test times out / hangs.
// EXPECTED: this test FAILS on unfixed code.
// ---------------------------------------------------------------------------

describe('Bug 3 — user_list: DB error → HTTP 500', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns HTTP 500 when User.find throws', async () => {
    const dbError = new Error('MongoError: topology was destroyed');

    // User.find is chained: .find(...).sort(...).select(...)
    // We need to mock the whole chain throwing.
    User.find = jest.fn().mockImplementation(() => {
      throw dbError;
    });

    const req = {};
    const res = makeRes();

    // On unfixed code this will throw synchronously (or via unhandled
    // rejection) and the res.json(500) is never called.
    await authController.user_list(req, res);

    expect(res._status).toBe(500);
    expect(res._body).toMatchObject({ detail: expect.any(String) });
  });
});

// ---------------------------------------------------------------------------
// Bug 5 — send_overdue_reminders: Invoice.updateMany throws → no unhandled rejection
//
// On unfixed code, the thrown error propagates out of the async function and
// becomes an unhandled promise rejection.
// EXPECTED: this test FAILS on unfixed code (unhandled rejection is surfaced).
// ---------------------------------------------------------------------------

describe('Bug 5 — send_overdue_reminders: DB error → no unhandled rejection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not produce an unhandled rejection when Invoice.updateMany throws', async () => {
    const dbError = new Error('MongoError: write concern error');

    // Mock Invoice.updateMany to throw
    Invoice.updateMany = jest.fn().mockRejectedValue(dbError);
    // Also mock Invoice.find in case the code reaches it
    Invoice.find = jest.fn().mockResolvedValue([]);

    // We need to invoke send_overdue_reminders directly.
    // The function is NOT exported from reminder_task.js (it's defined inside
    // the module and only used by cron.schedule). We extract it here by
    // re-reading the module source and using eval, OR we simply require the
    // module which triggers cron.schedule (mocked) and then call the captured
    // callback.
    //
    // The simplest approach that tests the real code: re-require the module
    // (with the cron mock) and capture the scheduled callback.

    // Clear the module cache so we get a fresh require with our mocks active.
    jest.resetModules();

    // Re-apply the mocks after resetModules
    jest.mock('../models/invoice');
    jest.mock('../services/whatsapp_service');
    jest.mock('../services/email_service');
    jest.mock('node-cron', () => ({
      schedule: jest.fn(),
    }));

    const cronMock = require('node-cron');
    const InvoiceFresh = require('../models/invoice');
    InvoiceFresh.updateMany = jest.fn().mockRejectedValue(dbError);
    InvoiceFresh.find = jest.fn().mockResolvedValue([]);

    // Requiring reminder_task will call cron.schedule(expr, callback).
    // We capture that callback via the mock.
    require('../tasks/reminder_task');

    // The callback passed to cron.schedule is the scheduled task runner.
    expect(cronMock.schedule).toHaveBeenCalledTimes(1);
    const scheduledCallback = cronMock.schedule.mock.calls[0][1];

    // Invoke the cron callback. On unfixed code this returns a Promise that
    // rejects — which is an unhandled rejection and will cause the test to fail.
    // On fixed code, the error is caught internally and the Promise resolves.
    await expect(Promise.resolve(scheduledCallback())).resolves.not.toThrow();
  });
});
