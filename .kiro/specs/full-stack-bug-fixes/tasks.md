# Implementation Plan

## Overview

This plan covers the complete bugfix workflow for 8 confirmed bugs in The Design Space full-stack application. Tasks are ordered: exploration tests first (on unfixed code), then test framework setup, then each fix, then verification.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1", "2"],
      "description": "Write exploration and preservation tests on unfixed code"
    },
    {
      "wave": 2,
      "tasks": ["3", "4"],
      "description": "Set up Jest for backend and frontend — prerequisite for running tests"
    },
    {
      "wave": 3,
      "tasks": ["5", "6", "7", "8", "9", "10", "11"],
      "description": "Apply all bug fixes (can be done in any order within this wave)"
    },
    {
      "wave": 4,
      "tasks": ["12"],
      "description": "Re-run exploration and preservation tests on fixed code to confirm correctness"
    },
    {
      "wave": 5,
      "tasks": ["13", "14", "15"],
      "description": "Write targeted unit tests for each fix"
    },
    {
      "wave": 6,
      "tasks": ["16"],
      "description": "Final checkpoint — all tests pass"
    }
  ]
}
```

## Tasks

- [x] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - Auth Controllers Crash / fetchWithAuth Silent Failure / loginUser SyntaxError / checkPathAccess False-Positive 403 / Reminder Task Unhandled Rejection / SVG Stray Text Node
  - **IMPORTANT**: Write these tests BEFORE implementing any fix
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms each bug exists
  - **DO NOT attempt to fix the code or the tests when they fail**
  - **GOAL**: Surface counterexamples that demonstrate each bug
  - Tests cover (one describe block per bug):
    - **Bug 2**: Mock `User.findOne` to throw `MongoNetworkError`; call `token_obtain_pair`; assert HTTP 500 returned (will fail — unhandled rejection on unfixed code)
    - **Bug 3**: Mock `User.find` to throw; call `user_list`; assert HTTP 500 returned (will hang on unfixed code)
    - **Bug 4**: Mock `fetch` → `Response { status: 500, HTML body }`; call `fetchWithAuth`; assert throws `Error` (will return raw Response on unfixed code)
    - **Bug 7 (scoped)**: `checkPathAccess` with `pathname='/dashboard/web-cms/portfolio'`, `userRole='designer'`; assert portfolio restriction is NOT triggered (will incorrectly block on unfixed code)
    - **Bug 8**: Mock `fetch` → `Response { status: 502, HTML body }`; call `loginUser`; assert throws human-readable `Error`, not `SyntaxError` (will throw SyntaxError on unfixed code)
    - **Bug 5**: Invoke `send_overdue_reminders` with `Invoice.updateMany` mocked to throw; assert no unhandled rejection (will throw on unfixed code)
    - **Bug 1**: Inspect dashboard JSX source; assert `<defs>` block does NOT contain `</linearGradient>sdf` (will contain it on unfixed code)
  - Run all tests on UNFIXED code — expect FAILURES
  - Document counterexamples found (e.g., "token_obtain_pair: unhandled MongoNetworkError", "fetchWithAuth: returns Response instead of throwing", "loginUser: SyntaxError propagated")
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 2.1, 2.2, 3.1, 4.1, 4.2, 5.1, 7.1, 8.2_

- [x] 2. Write preservation property tests (BEFORE implementing any fix)
  - **Property 2: Preservation** - Happy-Path Behaviors Must Be Unchanged After All Fixes
  - **IMPORTANT**: Follow observation-first methodology — run unfixed code with non-buggy inputs, observe outputs, encode as tests
  - Tests cover non-bug-condition inputs (cases where each `isBugCondition` returns false):
    - **Bug 2 preservation**: Valid credentials + DB available → `token_obtain_pair` returns HTTP 200 with `access`, `refresh`, `user`; invalid credentials → HTTP 401; valid register → HTTP 201
    - **Bug 3 preservation**: DB available → `user_list` returns HTTP 200 with active users array (sorted, passwords excluded)
    - **Bug 4 preservation (property-based)**: For status 200, 201, 204 — `fetchWithAuth` returns raw `Response`, never throws; status 401 → localStorage cleared and redirect
    - **Bug 7 preservation (property-based)**: manager + `/dashboard/portfolio` → access granted; owner + `/dashboard/web-cms` → access granted; accountant + `/dashboard/invoices` → access granted; any role + `/dashboard` → access granted
    - **Bug 8 preservation**: HTTP 200 with `{access, refresh, user}` → tokens stored, `AuthResponse` returned; HTTP 403 with `{ detail: "pending approval" }` → that exact message thrown
    - **Bug 5 preservation**: DB available → `send_overdue_reminders` runs normally, returns results array
    - **Bug 1 preservation**: `DashboardPage` renders `EmptyRow` when `hasChartActivity=false`; renders two `Area` series when data is present
  - Run all preservation tests on UNFIXED code
  - **EXPECTED OUTCOME**: All preservation tests PASS
  - Mark task complete when tests are written, run, and confirmed passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.13, 3.14, 3.15, 3.16, 3.17, 3.18_

- [ ] 3. Set up Jest for backend (Node.js/Express)

  - [x] 3.1 Install Jest as a devDependency in `backend/`
    - Run: `npm install --save-dev jest@29 --prefix backend`
    - Add `"test": "jest --runInBand"` script to `backend/package.json`
    - Add Jest config in `backend/package.json`: `"jest": { "testEnvironment": "node" }`
    - No production code changed — devDependency only
    - _Requirements: 2.3, 2.4, 2.5_

  - [x] 3.2 Verify backend test setup with a smoke test
    - Create `backend/tests/setup.test.js` with a trivial `expect(true).toBe(true)` assertion
    - Run `npm test --prefix backend` to confirm Jest is correctly configured
    - Remove the smoke test file once setup is confirmed
    - _Requirements: 2.3_

- [ ] 4. Set up Jest + React Testing Library for frontend (Next.js 15 / TypeScript)

  - [~] 4.1 Install Jest and Testing Library dependencies in `frontend/`
    - Run: `npm install --save-dev jest@29 jest-environment-jsdom@29 @testing-library/react@14 @testing-library/jest-dom@6 @testing-library/user-event@14 ts-jest@29 --prefix frontend`
    - No production code changed — devDependencies only
    - _Requirements: 2.1, 4.1, 7.1, 8.2_

  - [~] 4.2 Add Jest configuration for Next.js 15 + TypeScript
    - Create `frontend/jest.config.ts` with `testEnvironment: 'jsdom'`, `ts-jest` transform for `.ts/.tsx`, `moduleNameMapper` for `@/` alias, and `setupFilesAfterFramework` pointing to `jest.setup.ts`
    - Create `frontend/jest.setup.ts` importing `@testing-library/jest-dom`
    - Add `"test": "jest --runInBand"` script to `frontend/package.json`
    - _Requirements: 2.1, 4.1, 7.1, 8.2_

  - [~] 4.3 Verify frontend test setup with a smoke test
    - Create `frontend/__tests__/setup.test.ts` with a trivial assertion
    - Run `npm test --prefix frontend` to confirm configuration
    - Remove smoke test once setup is confirmed
    - _Requirements: 2.1_

- [ ] 5. Fix Bug 1 — Remove stray `sdf` text node from dashboard SVG

  - [~] 5.1 Remove the 3-character literal `sdf` from `frontend/app/(admin)/dashboard/page.tsx`
    - File: `frontend/app/(admin)/dashboard/page.tsx`
    - Locate the line containing `</linearGradient>sdf` inside the `<defs>` block of the `AreaChart` (approximately line 562)
    - Change `</linearGradient>sdf` to `</linearGradient>` — remove only the 3 characters `sdf`
    - The two `<linearGradient>` elements (`invoicedGrad` and `collectedGrad`) and all child `<stop>` elements remain unchanged
    - _Bug_Condition: isBugCondition_1 → sourceFile CONTAINS `</linearGradient>sdf` inside JSX `<defs>`_
    - _Expected_Behavior: `<defs>` contains only the two `<linearGradient>` children; no bare text nodes; no React hydration warning_
    - _Preservation: Two-series AreaChart continues to render; EmptyRow empty state continues to render_
    - _Requirements: 2.1, 2.2, 3.1, 3.2_

- [ ] 6. Fix Bug 2 — Add try/catch to `token_obtain_pair` and `register` in auth_controller.js

  - [~] 6.1 Wrap `token_obtain_pair` body in try/catch
    - File: `backend/controllers/auth_controller.js`
    - Wrap the entire body of `exports.token_obtain_pair` in `try { ... } catch (err) { res.status(500).json({ detail: 'Internal server error.' }); }`
    - Existing logic (credential check, `is_active` check, `generate_tokens`, JSON response) is preserved inside the `try` block unchanged
    - _Bug_Condition: isBugCondition_2 → POST /auth/login/ where MongoDB throws during User.findOne()_
    - _Expected_Behavior: HTTP 500 `{ detail: 'Internal server error.' }` returned; process stays up_
    - _Preservation: Valid credentials + DB available → HTTP 200 with tokens; invalid credentials → HTTP 401_
    - _Requirements: 2.3, 3.3, 3.4_

  - [~] 6.2 Wrap `register` body in try/catch
    - File: `backend/controllers/auth_controller.js`
    - Wrap the entire body of `exports.register` in `try { ... } catch (err) { res.status(500).json({ detail: 'Internal server error.' }); }`
    - Existing validation (`password.length < 8`), duplicate-email check, and `User.create` call preserved inside the `try` block
    - _Bug_Condition: isBugCondition_2 → POST /auth/register/ where MongoDB throws during User.findOne() or User.create()_
    - _Expected_Behavior: HTTP 500 returned; no unhandled rejection_
    - _Preservation: Valid registration + DB available → HTTP 201 with success detail_
    - _Requirements: 2.4, 3.5_

- [ ] 7. Fix Bug 3 — Add try/catch to `user_list` in auth_controller.js

  - [~] 7.1 Wrap `user_list` body in try/catch
    - File: `backend/controllers/auth_controller.js`
    - Wrap `const users = await User.find({ is_active: true })...` and `res.json(users)` in `try { ... } catch (err) { res.status(500).json({ detail: 'Internal server error.' }); }`
    - Existing query (`{ is_active: true }`, `.sort('full_name')`, `.select('-password')`) preserved inside the `try` block
    - _Bug_Condition: isBugCondition_3 → GET /auth/users/ where User.find() throws_
    - _Expected_Behavior: HTTP 500 `{ detail: 'Internal server error.' }` returned_
    - _Preservation: DB available → HTTP 200 with active users array, sorted, passwords excluded_
    - _Requirements: 2.5, 3.6_

- [ ] 8. Fix Bug 4 — Add non-ok throw to `fetchWithAuth` in api.ts

  - [~] 8.1 Add non-2xx error throw after the 401 block in `fetchWithAuth`
    - File: `frontend/lib/api.ts`
    - After the existing `if (response.status === 401) { ... }` block, add:
      ```ts
      if (!response.ok) {
        let message = response.statusText;
        try {
          const errData = await response.json();
          message = errData.detail || errData.message || message;
        } catch {
          // body is not JSON (e.g. HTML error page) — keep statusText
        }
        throw new Error(message);
      }
      ```
    - The existing 401 block (localStorage clear + redirect) and `return response` for 2xx remain unchanged
    - _Bug_Condition: isBugCondition_4 → response.ok == false AND response.status != 401 AND no throw raised_
    - _Expected_Behavior: Error thrown with detail/message from body or statusText; raw Response never returned for non-2xx_
    - _Preservation: 2xx responses → raw Response returned unchanged; 401 → localStorage cleared, redirect to /login_
    - _Requirements: 2.6, 2.7, 3.7, 3.8_

- [ ] 9. Fix Bug 5 — Add try/catch to `send_overdue_reminders` in reminder_task.js

  - [~] 9.1 Wrap the body of `send_overdue_reminders` in try/catch
    - File: `backend/tasks/reminder_task.js`
    - Wrap the entire body of the `send_overdue_reminders` async function (from `const today = new Date()` through `return results`) in:
      `try { ... } catch (err) { console.error('Reminder task error:', err.message); }`
    - The cron schedule expression `'0 9 * * *'` and `cron.schedule(...)` invocation remain unchanged
    - Internal logic (Invoice.updateMany, Invoice.find, waService calls, emailService calls, results array) is preserved inside the `try` block
    - _Bug_Condition: isBugCondition_5 → cron tick where Invoice.updateMany/find throws OR waService/emailService throws_
    - _Expected_Behavior: Error caught and logged; cron schedule continues; no unhandled rejection_
    - _Preservation: DB available → invoices auto-marked overdue, reminders sent, results logged normally_
    - _Requirements: 2.8, 2.9, 3.9, 3.10_

- [ ] 10. Fix Bug 7 — Change `pathname.includes` to `pathname.startsWith` in `checkPathAccess`

  - [~] 10.1 Replace all 7 `pathname.includes(...)` calls with `pathname.startsWith(...)` in `checkPathAccess`
    - File: `frontend/app/(admin)/layout.tsx`
    - Function: `checkPathAccess` (defined inside `DashboardLayout`)
    - Apply all 7 substitutions (additive correction — role checks untouched):

      | Before | After |
      |--------|-------|
      | `pathname.includes('/settings')` | `pathname.startsWith('/dashboard/settings')` |
      | `pathname.includes('/quotations')` | `pathname.startsWith('/dashboard/quotations')` |
      | `pathname.includes('/portfolio')` | `pathname.startsWith('/dashboard/portfolio')` |
      | `pathname.includes('/pending-users')` | `pathname.startsWith('/dashboard/pending-users')` |
      | `pathname.includes('/web-cms')` | `pathname.startsWith('/dashboard/web-cms')` |
      | `pathname.includes('/invoices')` | `pathname.startsWith('/dashboard/invoices')` |
      | `pathname.includes('/payments')` | `pathname.startsWith('/dashboard/payments')` |

    - All `userRole` comparisons (`=== "owner"`, `=== "manager"`, `=== "accountant"`) remain unchanged
    - _Bug_Condition: isBugCondition_7 → pathname contains `/portfolio` as substring but does NOT startWith `/dashboard/portfolio` AND checkPathAccess returns false_
    - _Expected_Behavior: startsWith prevents false-positive; nested paths like `/dashboard/web-cms/portfolio` do not trigger portfolio restriction_
    - _Preservation: manager/owner + /dashboard/portfolio → access granted; accountant + /dashboard/invoices → access granted_
    - _Requirements: 2.13, 2.14, 2.15, 3.13, 3.14, 3.15_

- [ ] 11. Fix Bug 8 — Fix `loginUser` error handling in authService.ts

  - [~] 11.1 Replace unconditional `response.json()` with safe parsing in `loginUser`
    - File: `frontend/services/authService.ts`
    - Function: `loginUser`
    - Move the `response.ok` check BEFORE `response.json()` and wrap JSON parsing in try/catch:
      ```ts
      if (!response.ok) {
        let message = 'Login failed. Please try again.';
        try {
          const errData = await response.json();
          message =
            errData.detail ||
            (Array.isArray(errData.non_field_errors) ? errData.non_field_errors[0] : undefined) ||
            (Object.values(errData).find((v) => typeof v === 'string') as string) ||
            response.statusText ||
            message;
        } catch {
          // non-JSON body (e.g. HTML 502) — keep fallback message
        }
        throw new Error(message);
      }
      const data = await response.json();
      ```
    - Token storage (`localStorage.setItem(...)`) and `return data` remain unchanged, now safely inside the `response.ok` branch
    - _Bug_Condition: isBugCondition_8 → response.ok == false AND (body is not JSON OR data.detail is undefined)_
    - _Expected_Behavior: Best available error message extracted; SyntaxError never propagates to caller_
    - _Preservation: HTTP 200 → tokens stored, AuthResponse returned; HTTP 403 with detail → detail surfaced_
    - _Requirements: 2.16, 2.17, 3.16, 3.17, 3.18_

- [ ] 12. Verify all bug condition exploration tests now pass (post-fix)

  - [~] 12.1 Re-run bug condition exploration tests from task 1 — expect all to PASS
    - **Property 1: Expected Behavior** - All Bug Conditions Now Produce Correct Outcomes
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior; when they pass, the fixes are confirmed
    - Run the full exploration test suite on FIXED code
    - **EXPECTED OUTCOME**: All 7 exploration tests PASS
      - Bug 2: `token_obtain_pair` mock-DB-error → HTTP 500 returned
      - Bug 3: `user_list` mock-DB-error → HTTP 500 returned
      - Bug 4: `fetchWithAuth` 500-HTML-body → Error thrown (not raw Response)
      - Bug 7: `checkPathAccess` `/dashboard/web-cms/portfolio` + designer → portfolio restriction NOT triggered
      - Bug 8: `loginUser` 502-HTML-body → human-readable Error (not SyntaxError)
      - Bug 5: `send_overdue_reminders` mock-DB-error → no unhandled rejection
      - Bug 1: dashboard JSX does NOT contain `</linearGradient>sdf`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.13, 2.16_

  - [~] 12.2 Re-run preservation property tests from task 2 — expect all to still PASS
    - **Property 2: Preservation** - No Regressions After All Fixes
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run the full preservation test suite on FIXED code
    - **EXPECTED OUTCOME**: All preservation tests PASS — no regressions
    - Confirm: valid login still returns HTTP 200 with tokens; `fetchWithAuth` 2xx still returns raw Response; `checkPathAccess` manager + `/dashboard/portfolio` still grants access; `loginUser` HTTP 200 still stores tokens; cron task still runs normally when DB is available
    - _Requirements: 3.1–3.18_

- [ ] 13. Write backend unit tests for Bug 2 and Bug 3 fixes

  - [~] 13.1 Write unit tests for `token_obtain_pair` (Bug 2)
    - File: `backend/tests/auth_controller.test.js`
    - Test 1: Mock `User.findOne` to throw `new Error('MongoNetworkError')` → assert `res.status(500).json({ detail: 'Internal server error.' })` called
    - Test 2: Mock `User.findOne` to return a valid active user → assert `res.json(...)` called with `access`, `refresh`, `user` (happy path)
    - Test 3: Mock `User.findOne` to return null → assert `res.status(401)` called (invalid credentials preserved)
    - Use `jest.fn()` / `jest.spyOn()` to mock the `User` model and Express `req/res` objects
    - _Requirements: 2.3, 3.3, 3.4_

  - [~] 13.2 Write unit tests for `register` (Bug 2)
    - File: `backend/tests/auth_controller.test.js` (separate describe block)
    - Test 1: Mock `User.findOne` to throw → assert HTTP 500
    - Test 2: Mock `User.create` to throw → assert HTTP 500
    - Test 3: Valid registration (unique email, password ≥ 8 chars, DB available) → assert HTTP 201 (happy path)
    - _Requirements: 2.4, 3.5_

  - [~] 13.3 Write unit tests for `user_list` (Bug 3)
    - File: `backend/tests/auth_controller.test.js` (separate describe block)
    - Test 1: Mock `User.find` chain to throw → assert HTTP 500
    - Test 2: Mock `User.find` chain to return array of users → assert `res.json(users)` called (happy path)
    - _Requirements: 2.5, 3.6_

- [ ] 14. Write frontend unit tests for Bug 4, Bug 7, and Bug 8 fixes

  - [~] 14.1 Write unit tests for `fetchWithAuth` (Bug 4)
    - File: `frontend/__tests__/api.test.ts`
    - Test 1: Mock `fetch` → `{ ok: false, status: 500, statusText: 'Internal Server Error', json: async () => ({ detail: 'DB error' }) }` → assert throws `Error` with message `'DB error'`
    - Test 2: Mock `fetch` → `{ ok: false, status: 500, statusText: 'Internal Server Error', json: async () => { throw new SyntaxError() } }` (HTML body) → assert throws `Error` with `'Internal Server Error'`
    - Test 3 (property-based): For status 200, 201, 204 with `ok: true` → assert `fetchWithAuth` returns the raw Response (does not throw)
    - Test 4: Mock `fetch` → `{ ok: false, status: 401 }` → assert localStorage cleared (401 path preserved)
    - _Requirements: 2.6, 2.7, 3.7, 3.8_

  - [~] 14.2 Write unit tests for `checkPathAccess` (Bug 7)
    - File: `frontend/__tests__/layout.test.tsx`
    - Test 1 (bug condition): `pathname='/dashboard/web-cms/portfolio'`, `userRole='manager'` → `checkPathAccess()` returns `true` (manager has access via web-cms branch; no false-positive from portfolio branch)
    - Test 2 (bug condition): `pathname='/dashboard/web-cms/portfolio'`, `userRole='designer'` → portfolio restriction NOT triggered via false-positive (web-cms branch correctly handles it)
    - Test 3 (preservation): `pathname='/dashboard/portfolio'`, `userRole='designer'` → returns `false` (403 correctly shown)
    - Test 4 (preservation): `pathname='/dashboard/portfolio'`, `userRole='owner'` → returns `true`
    - Test 5 (preservation): `pathname='/dashboard/invoices'`, `userRole='accountant'` → returns `true`
    - Test 6 (preservation): `pathname='/dashboard'`, `userRole='designer'` → returns `true`
    - Extract `checkPathAccess` as a pure helper function or test via the component with mocked `usePathname`
    - _Requirements: 2.13, 2.14, 2.15, 3.13, 3.14, 3.15_

  - [~] 14.3 Write unit tests for `loginUser` (Bug 8)
    - File: `frontend/__tests__/authService.test.ts`
    - Test 1 (bug condition — HTML body): Mock `fetch` → `{ ok: false, status: 502, statusText: 'Bad Gateway', json: async () => { throw new SyntaxError() } }` → assert throws `Error` with human-readable message, NOT a `SyntaxError`
    - Test 2 (bug condition — non_field_errors): Mock `fetch` → `{ ok: false, status: 401, json: async () => ({ non_field_errors: ['Invalid credentials.'] }) }` → assert throws `Error` with message `'Invalid credentials.'`
    - Test 3 (preservation — HTTP 200): Mock `fetch` → `{ ok: true, status: 200, json: async () => ({ access: 'a', refresh: 'r', user: { id: '1', email: 'x@y.com', full_name: 'X', role: 'designer' } }) }` → assert tokens stored in localStorage, `AuthResponse` returned
    - Test 4 (preservation — HTTP 403 with detail): Mock HTTP 403 `{ detail: 'Your account is pending approval...' }` → assert throws `Error` with that exact detail message
    - _Requirements: 2.16, 2.17, 3.16, 3.17, 3.18_

- [ ] 15. Write frontend unit test for Bug 1 (SVG defs check)

  - [~] 15.1 Write a test asserting the `<defs>` block contains no stray text nodes
    - File: `frontend/__tests__/dashboard.test.tsx`
    - Test 1 (post-fix assertion): Render `DashboardPage` with all hooks mocked (localStorage, fetch returning mock data, `useRouter`, `usePathname`); assert the rendered `<defs>` element has exactly 2 child elements (the two `<linearGradient>` elements); no text node children present
    - Test 2 (preservation): Assert the rendered output contains the `AreaChart` component when `hasChartActivity` is true
    - Test 3 (preservation): Assert `EmptyRow` is rendered when invoice data is empty
    - _Requirements: 2.1, 2.2, 3.1, 3.2_

- [~] 16. Checkpoint — Ensure all tests pass
  - Run the full backend test suite: `npm test --prefix backend`
  - Run the full frontend test suite: `npm test --prefix frontend`
  - All 13.x backend tests (`auth_controller.test.js`) should PASS
  - All 14.x and 15.x frontend tests (`api.test.ts`, `layout.test.tsx`, `authService.test.ts`, `dashboard.test.tsx`) should PASS
  - All exploration tests from task 1 (re-run in task 12.1) should PASS
  - All preservation tests from task 2 (re-run in task 12.2) should PASS
  - Fix any test failures before considering this spec complete
  - Ensure all tests pass; ask the user if questions arise


## Notes

- **Bug 6 requires NO code change** — source inspection confirmed `handleUpload`, `uploadImage`, and `uploadVideo` are all correctly exported from `web_cms_controller.js` and correctly used in `web_cms_urls.js`. No task needed.
- **All fixes are additive only** — no existing logic is removed; only wrapped (try/catch), corrected (includes → startsWith), or appended (non-ok throw, error extraction).
- **Test framework setup (tasks 3, 4) must complete before any test writing tasks** (tasks 1, 2 can be written as test files but not run until setup is complete).
- **Backend**: Jest 29, `testEnvironment: 'node'`, installed as devDependency in `backend/`.
- **Frontend**: Jest 29 + `jest-environment-jsdom` + `ts-jest` + `@testing-library/react` + `@testing-library/jest-dom`, installed as devDependencies in `frontend/`.
- **Property-based testing note**: Tasks 1 and 2 use "scoped PBT" — for deterministic bugs, the property is scoped to concrete failing cases (e.g., status 500 with HTML body) to ensure reproducibility. Tasks 14.1 and 14.2 extend this with multi-input property checks (status 200/201/204 for fetchWithAuth; role × path matrix for checkPathAccess).
