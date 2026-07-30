/**
 * Unit Tests — auth_controller.js (Bugs 2 & 3 fixes)
 *
 * Validates: Requirements 2.3, 2.4, 2.5, 3.3, 3.4, 3.5, 3.6
 */

'use strict';

jest.mock('../models/User');
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';

const User = require('../models/User');
const authController = require('../controllers/auth_controller');

function makeRes() {
  const res = {
    _status: 200,
    _body: undefined,
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
  };
  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
// token_obtain_pair — Bug 2 fix
// ─────────────────────────────────────────────────────────────────────────────

describe('token_obtain_pair', () => {
  beforeEach(() => jest.clearAllMocks());

  it('Bug 2 fix: returns HTTP 500 when User.findOne throws a MongoNetworkError', async () => {
    User.findOne = jest.fn().mockRejectedValue(new Error('MongoNetworkError: connection timed out'));

    const req = { body: { email: 'test@example.com', password: 'Password123' } };
    const res = makeRes();

    await authController.token_obtain_pair(req, res);

    expect(res._status).toBe(500);
    expect(res._body).toMatchObject({ detail: 'Internal server error.' });
  });

  it('Bug 2 fix: returns HTTP 500 when User.findOne throws a generic DB error', async () => {
    User.findOne = jest.fn().mockRejectedValue(new Error('topology was destroyed'));

    const req = { body: { email: 'x@y.com', password: 'Pass1234' } };
    const res = makeRes();

    await authController.token_obtain_pair(req, res);

    expect(res._status).toBe(500);
    expect(res._body).toHaveProperty('detail');
  });

  it('Preservation: returns HTTP 200 with tokens for valid active user', async () => {
    const fakeUser = {
      _id: 'uid-001',
      email: 'owner@test.com',
      full_name: 'Owner',
      role: 'owner',
      is_active: true,
      page_access: [],
      check_password: jest.fn().mockResolvedValue(true),
    };
    User.findOne = jest.fn().mockResolvedValue(fakeUser);

    const req = { body: { email: 'owner@test.com', password: 'Password123' } };
    const res = makeRes();

    await authController.token_obtain_pair(req, res);

    expect(res._status).toBe(200);
    expect(res._body).toHaveProperty('access');
    expect(res._body).toHaveProperty('refresh');
    expect(res._body.user).toMatchObject({ id: 'uid-001', role: 'owner' });
  });

  it('Preservation: returns HTTP 401 when user not found', async () => {
    User.findOne = jest.fn().mockResolvedValue(null);

    const req = { body: { email: 'nobody@test.com', password: 'Pass1234' } };
    const res = makeRes();

    await authController.token_obtain_pair(req, res);

    expect(res._status).toBe(401);
    expect(res._body.detail).toMatch(/No active account/i);
  });

  it('Preservation: returns HTTP 401 when password is wrong', async () => {
    const fakeUser = {
      _id: 'uid-002',
      email: 'user@test.com',
      full_name: 'User',
      role: 'designer',
      is_active: true,
      page_access: [],
      check_password: jest.fn().mockResolvedValue(false),
    };
    User.findOne = jest.fn().mockResolvedValue(fakeUser);

    const req = { body: { email: 'user@test.com', password: 'WrongPass' } };
    const res = makeRes();

    await authController.token_obtain_pair(req, res);

    expect(res._status).toBe(401);
  });

  it('Preservation: returns HTTP 403 for inactive (pending) user', async () => {
    const fakeUser = {
      _id: 'uid-003',
      email: 'pending@test.com',
      full_name: 'Pending',
      role: 'designer',
      is_active: false,
      page_access: [],
      check_password: jest.fn().mockResolvedValue(true),
    };
    User.findOne = jest.fn().mockResolvedValue(fakeUser);

    const req = { body: { email: 'pending@test.com', password: 'Password123' } };
    const res = makeRes();

    await authController.token_obtain_pair(req, res);

    expect(res._status).toBe(403);
    expect(res._body.detail).toMatch(/pending approval/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// register — Bug 2 fix
// ─────────────────────────────────────────────────────────────────────────────

describe('register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('Bug 2 fix: returns HTTP 500 when User.findOne throws during duplicate check', async () => {
    User.findOne = jest.fn().mockRejectedValue(new Error('MongoError: network error'));

    const req = {
      body: { email: 'new@test.com', full_name: 'New User', role: 'designer', password: 'Password123' },
    };
    const res = makeRes();

    await authController.register(req, res);

    expect(res._status).toBe(500);
    expect(res._body).toMatchObject({ detail: 'Internal server error.' });
  });

  it('Bug 2 fix: returns HTTP 500 when User.create throws', async () => {
    User.findOne = jest.fn().mockResolvedValue(null);
    User.create = jest.fn().mockRejectedValue(new Error('MongoError: write failed'));

    const req = {
      body: { email: 'new2@test.com', full_name: 'New', role: 'designer', password: 'Password123' },
    };
    const res = makeRes();

    await authController.register(req, res);

    expect(res._status).toBe(500);
    expect(res._body).toMatchObject({ detail: 'Internal server error.' });
  });

  it('Preservation: returns HTTP 201 for valid new registration', async () => {
    User.findOne = jest.fn().mockResolvedValue(null);
    User.create = jest.fn().mockResolvedValue({
      _id: 'new-uid',
      email: 'fresh@test.com',
      full_name: 'Fresh User',
      role: 'designer',
    });

    const req = {
      body: { email: 'fresh@test.com', full_name: 'Fresh User', role: 'designer', password: 'Password123' },
    };
    const res = makeRes();

    await authController.register(req, res);

    expect(res._status).toBe(201);
    expect(res._body.detail).toMatch(/Registration successful/i);
  });

  it('Preservation: returns HTTP 400 when password is too short', async () => {
    const req = {
      body: { email: 'x@test.com', full_name: 'X', role: 'designer', password: 'short' },
    };
    const res = makeRes();

    await authController.register(req, res);

    expect(res._status).toBe(400);
    expect(res._body).toHaveProperty('password');
  });

  it('Preservation: returns HTTP 400 when email already exists', async () => {
    User.findOne = jest.fn().mockResolvedValue({ email: 'exists@test.com' });

    const req = {
      body: { email: 'exists@test.com', full_name: 'X', role: 'designer', password: 'Password123' },
    };
    const res = makeRes();

    await authController.register(req, res);

    expect(res._status).toBe(400);
    expect(res._body).toHaveProperty('email');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// user_list — Bug 3 fix
// ─────────────────────────────────────────────────────────────────────────────

describe('user_list', () => {
  beforeEach(() => jest.clearAllMocks());

  it('Bug 3 fix: returns HTTP 500 when User.find throws', async () => {
    User.find = jest.fn().mockImplementation(() => {
      throw new Error('MongoError: topology was destroyed');
    });

    const req = {};
    const res = makeRes();

    await authController.user_list(req, res);

    expect(res._status).toBe(500);
    expect(res._body).toMatchObject({ detail: 'Internal server error.' });
  });

  it('Bug 3 fix: returns HTTP 500 when User.find chain rejects', async () => {
    const chain = {
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockRejectedValue(new Error('DB connection lost')),
    };
    User.find = jest.fn().mockReturnValue(chain);

    const req = {};
    const res = makeRes();

    await authController.user_list(req, res);

    expect(res._status).toBe(500);
    expect(res._body).toMatchObject({ detail: 'Internal server error.' });
  });

  it('Preservation: returns HTTP 200 with active users when DB is available', async () => {
    const fakeUsers = [
      { _id: 'u1', email: 'a@test.com', full_name: 'Alice', role: 'owner' },
      { _id: 'u2', email: 'b@test.com', full_name: 'Bob', role: 'designer' },
    ];
    const chain = {
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue(fakeUsers),
    };
    User.find = jest.fn().mockReturnValue(chain);

    const req = {};
    const res = makeRes();

    await authController.user_list(req, res);

    expect(res._status).toBe(200);
    expect(Array.isArray(res._body)).toBe(true);
    expect(res._body).toHaveLength(2);
    expect(res._body[0]).toMatchObject({ email: 'a@test.com' });
  });
});
