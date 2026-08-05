# Full-Stack Bug Fixes Design

## Overview

This document covers the fix design for 8 confirmed bugs in The Design Space application — a business portal built on Node.js/Express 5 + MongoDB (backend) and Next.js 15 + React 19 + TypeScript (frontend).

The bugs span three categories:
- **Crash bugs** (Bugs 2, 3, 5): unhandled async rejections and a missing module that crash or hang the server
- **Silent failure bugs** (Bugs 4, 8): API utilities that swallow errors and return misleading states to the UI
- **UI/logic bugs** (Bugs 1, 6, 7): a stray text node in SVG, an unreliable export chain in CMS routes, and a false-positive 403 from `pathname.includes()` string matching

The overarching fix constraint is **additive only** — no existing logic is removed, only wrapped or corrected.

## Glossary

- **Bug_Condition (C)**: The specific input or code path that triggers each bug
- **Property (P)**: The desired correct behavior when the bug condition holds
- **Preservation**: Existing behaviors that must remain unchanged after all fixes
- **isBugCondition**: Pseudocode function characterising the inputs that trigger each bug
- **token_obtain_pair**: Login controller in `backend/controllers/auth_controller.js`
- **register**: Registration controller in `backend/controllers/auth_controller.js`
- **user_list**: User-list controller in `backend/controllers/auth_controller.js`
- **fetchWithAuth**: Auth-aware fetch wrapper in `frontend/lib/api.ts`
- **loginUser**: Login service function in `frontend/services/authService.ts`
- **checkPathAccess**: Path-based RBAC guard in `frontend/app/(admin)/layout.tsx`
- **reminder_task**: Cron job module in `backend/tasks/reminder_task.js`
- **handleUpload**: Multer wrapper middleware in `backend/middleware/handleUpload.js`
- **web_cms_controller**: CMS controller in `backend/controllers/web_cms_controller.js`

## Bug Details

### Bug 1 — Stray `sdf` Text Node in SVG `<defs>`

#### Bug Condition

The bug manifests when the Dashboard page renders the Performance Analytics `AreaChart`. The bare text node `sdf` sits between `</linearGradient>` (closing `invoicedGrad`) and `<linearGradient id="collectedGrad">` inside the SVG `<defs>` block.

**Formal Specification:**
```
FUNCTION isBugCondition_1(sourceFile)
  INPUT: sourceFile = frontend/app/(admin)/dashboard/page.tsx
  OUTPUT: boolean

  RETURN sourceFile CONTAINS the literal string "</linearGradient>sdf"
         INSIDE the JSX <defs> element of the AreaChart component
END FUNCTION
```

**Confirmed location** (`dashboard/page.tsx` line ~562):
```jsx
</linearGradient>sdf   ← stray text node here
<linearGradient id="collectedGrad" ...>
```

#### Examples

- `<defs>` renders: `invoicedGrad` gradient → `sdf` text node → `collectedGrad` gradient — React hydration warning fired
- In strict mode: chart gradient fills may fail to paint, leaving blank chart area
- Expected: `<defs>` renders only the two `<linearGradient>` children with no text between them

---

### Bug 2 — `token_obtain_pair` and `register` Missing try/catch

#### Bug Condition

Both async controller functions call MongoDB (`User.findOne`, `User.create`) without try/catch. Any database error becomes an unhandled async rejection.

**Formal Specification:**
```
FUNCTION isBugCondition_2(request)
  INPUT: request = POST /api/v1/auth/login/ OR POST /api/v1/auth/register/
  OUTPUT: boolean

  RETURN MongoDB is unavailable OR User.findOne() throws OR User.create() throws
         AND no try/catch wraps the database call in the controller
END FUNCTION
```

#### Examples

- DB timeout during login → unhandled rejection → Node.js process crash (or hanging request in Express 5)
- Duplicate key error during register not caught → unhandled rejection propagates
- Expected: HTTP 500 `{ "detail": "Internal server error." }` returned; process stays up

---

### Bug 3 — `user_list` Missing try/catch

#### Bug Condition

`user_list` calls `User.find(...)` without try/catch.

**Formal Specification:**
```
FUNCTION isBugCondition_3(request)
  INPUT: request = GET /api/v1/auth/users/
  OUTPUT: boolean

  RETURN MongoDB is unavailable OR User.find() throws
         AND no try/catch wraps the database call
END FUNCTION
```

#### Examples

- DB timeout on user-list call → unhandled rejection → request hangs, no response sent
- Expected: HTTP 500 `{ "detail": "Internal server error." }`

---

### Bug 4 — `fetchWithAuth` Does Not Throw on Non-2xx Responses

#### Bug Condition

After handling 401, `fetchWithAuth` returns the raw `Response` object for all other status codes — including 4xx and 5xx — without throwing. Callers that call `.json()` on an HTML error body receive a `SyntaxError`.

**Formal Specification:**
```
FUNCTION isBugCondition_4(response)
  INPUT: response = HTTP Response from fetch()
  OUTPUT: boolean

  RETURN response.status != 401
         AND response.ok == false       // i.e. status NOT in 200–299
         AND no throw is raised before returning response
END FUNCTION
```

#### Examples

- Backend returns HTTP 500 with HTML body → caller calls `.json()` → `SyntaxError: Unexpected token '<'`
- Backend returns HTTP 400 with `{ "detail": "..." }` → caller silently receives the raw Response, skips error path
- Backend returns HTTP 200 → should continue to return raw Response unchanged (preserved)
- Backend returns HTTP 401 → should continue to clear localStorage and redirect (preserved)

---

### Bug 5 — Missing `backend/tasks/reminder_task.js` (MODULE_NOT_FOUND)

#### Bug Condition

**Finding from source inspection**: `reminder_task.js` already exists at `backend/tasks/reminder_task.js`. However, the existing file contains unguarded calls to `waService.send_payment_reminder_whatsapp()` and `emailService.send_payment_reminder_email()`. If those services are unavailable or throw, the cron callback crashes silently. Additionally, the file does not guard against DB unavailability — a failed `Invoice.find()` or `Invoice.updateMany()` will produce an unhandled rejection inside the cron callback.

The bug condition per the requirements is: the cron task should NOT crash if DB is unavailable, and the module must load without `MODULE_NOT_FOUND`. The existing file loads fine (module exists), so the fix is to wrap the `send_overdue_reminders` body in try/catch.

**Formal Specification:**
```
FUNCTION isBugCondition_5(runtime)
  INPUT: runtime = server startup OR cron tick
  OUTPUT: boolean

  RETURN (reminder_task module does not exist at require('./tasks/reminder_task'))
         OR (send_overdue_reminders throws AND no try/catch wraps the body)
END FUNCTION
```

#### Examples

- DB unavailable at cron tick → `Invoice.updateMany()` throws → unhandled rejection inside cron callback
- `waService` throws network error → unhandled rejection propagates, future cron ticks may be affected
- Expected: module loads cleanly; DB errors are caught and logged; cron keeps running

---

### Bug 6 — CMS Upload Routes Rely on Indirect Export Chain

#### Bug Condition

**Finding from source inspection**: `web_cms_controller.js` already exports `handleUpload`, `uploadImage`, and `uploadVideo` correctly:
```js
exports.handleUpload = require('../middleware/handleUpload');
exports.uploadImage  = multer({ ... });   // multer instance with .single()
exports.uploadVideo  = multer({ ... });   // multer instance with .single()
```

And `web_cms_urls.js` uses the pattern:
```js
router.post('/upload/image', controller.handleUpload(controller.uploadImage.single('file')), controller.upload_image);
```

This is valid — `controller.handleUpload` is the `handleUpload` function from the middleware, and `controller.uploadImage` is the multer instance. The route chain is correct.

The bug condition is the **fragility**: if any export name is mistyped or the indirect re-export chain breaks (e.g. `handleUpload.js` is renamed), the route silently fails with a `TypeError` at startup with no clear diagnostic. The fix is to verify the exports are intact (confirmed) and add a defensive inline comment making the dependency explicit — no code change needed beyond confirming correctness.

**Formal Specification:**
```
FUNCTION isBugCondition_6(routeRegistration)
  INPUT: routeRegistration = require('./routes/web_cms_urls') at server start
  OUTPUT: boolean

  RETURN controller.handleUpload === undefined
         OR controller.uploadImage === undefined
         OR controller.uploadVideo === undefined
END FUNCTION
```

#### Examples

- `controller.handleUpload` is undefined → `TypeError: controller.handleUpload is not a function` at route-load time
- Confirmed current state: all three exports present and correct — no code change required for Bug 6

---

### Bug 7 — `checkPathAccess()` False-Positive 403 from `pathname.includes()`

#### Bug Condition

`checkPathAccess()` in `frontend/app/(admin)/layout.tsx` uses `pathname.includes('/portfolio')` to restrict the Portfolio section to manager/owner roles. But `/dashboard/web-cms/portfolio` also contains the substring `/portfolio`, so a designer or accountant navigating to the CMS portfolio page gets a 403 even though they're not supposed to access that path at all (web-cms is manager/owner only anyway) — and more critically, any future path containing `/portfolio` as a substring would be incorrectly blocked.

The same substring-matching fragility exists for `/pending-users`, `/web-cms`, `/quotations`, `/settings`, `/invoices`, and `/payments`.

**Formal Specification:**
```
FUNCTION isBugCondition_7(pathname, userRole)
  INPUT: pathname = current URL path string, userRole = authenticated user role
  OUTPUT: boolean

  RETURN pathname.includes('/portfolio') == true
         AND pathname does NOT startWith('/dashboard/portfolio')
         AND (userRole IN ['designer', 'accountant'])
         AND checkPathAccess() returns false (403 shown)
END FUNCTION
```

#### Examples

- `pathname = '/dashboard/web-cms/portfolio'`, `userRole = 'designer'` → `includes('/portfolio')` matches → 403 shown incorrectly (web-cms is manager-only anyway, but the wrong branch fires)
- `pathname = '/dashboard/portfolio'`, `userRole = 'designer'` → correct 403 (expected)
- `pathname = '/dashboard/portfolio/123'`, `userRole = 'owner'` → `startsWith` fix still grants access (preserved)
- `pathname = '/dashboard/settings'`, `userRole = 'accountant'` → `includes('/settings')` correctly triggers settings check; `startsWith` preserves same behavior

---

### Bug 8 — `loginUser` Swallows Specific Backend Error Messages

#### Bug Condition

`loginUser` in `frontend/services/authService.ts` calls `await response.json()` before checking `response.ok`. If the response body is not valid JSON (e.g., an HTML gateway error), this throws a `SyntaxError` that propagates uncaught. Additionally, the error message extraction uses only `data.detail`, ignoring `non_field_errors`, field-level errors, or other JSON shapes.

**Formal Specification:**
```
FUNCTION isBugCondition_8(response)
  INPUT: response = HTTP Response from POST /api/v1/auth/login/
  OUTPUT: boolean

  RETURN response.ok == false
         AND (
           response body is not valid JSON          // SyntaxError path
           OR (response body is JSON
               AND data.detail is undefined         // message swallowed
               AND data.non_field_errors is defined)
         )
END FUNCTION
```

#### Examples

- Backend returns HTTP 401 `{ "non_field_errors": ["Invalid credentials."] }` → `data.detail` is undefined → generic "Invalid login credentials" shown
- Backend returns HTTP 502 with HTML body → `response.json()` throws `SyntaxError` → propagates to login page component
- Backend returns HTTP 403 `{ "detail": "pending approval" }` → `data.detail` present → correctly surfaced (preserved)
- Backend returns HTTP 200 with `{ access, refresh, user }` → continues to store tokens (preserved)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- Bug 1: The two-series AreaChart (Invoiced in amber, Collected in green) and the `EmptyRow` empty state must continue to render correctly
- Bug 2: Valid login (HTTP 200 with `{ access, refresh, user }`) and valid registration (HTTP 201) must continue to work when DB is available; invalid credentials must still return HTTP 401
- Bug 3: `GET /api/v1/auth/users/` must continue to return HTTP 200 with active users when DB is available
- Bug 4: `fetchWithAuth` receiving a 2xx response must continue to return the raw `Response` object; 401 must continue to clear localStorage and redirect
- Bug 5: Server startup (MongoDB connect, all route registrations, port listen) must continue to succeed; existing cron behavior (auto-mark overdue, send reminders) must continue when services are available
- Bug 6: All non-upload web-cms routes (home, about, services, products, blog, careers, leads, SEO, media, settings) must continue to function; `handleUpload` wrapping multer must continue to return HTTP 400 on bad uploads
- Bug 7: Manager/owner access to `/dashboard/portfolio`, `/dashboard/web-cms`, `/dashboard/quotations`, `/dashboard/pending-users`, `/dashboard/settings`, `/dashboard/invoices`, `/dashboard/payments` must all continue to work; accountant access to invoices and payments must continue to work
- Bug 8: `loginUser` receiving HTTP 200 must continue to store tokens and return `AuthResponse`; HTTP 403 with `detail` must continue to surface that message

**Scope:**

All inputs that do NOT trigger the specific bug conditions above are unaffected by these fixes. The fixes are strictly additive: wrapping existing logic in try/catch, correcting string comparisons, removing a single stray text character, adding a non-ok response throw, and ensuring safe error extraction.

## Hypothesized Root Cause

### Bug 1
**Typo introduced during editing**: The characters `sdf` were accidentally left between the two `</linearGradient>` and `<linearGradient>` tags in the JSX. JSX inside SVG `<defs>` treats bare text as a text node, which is invalid between SVG structural elements, causing React's hydration reconciler to warn.

### Bug 2
**Missing error boundaries on async DB calls**: The `token_obtain_pair` and `register` functions were written without try/catch, likely as an initial implementation that assumed DB availability. Express 5 does propagate unhandled async rejections from async route handlers differently than Express 4 (Express 5 auto-catches them), but the rejection still bypasses the intended HTTP 500 JSON response contract.

### Bug 3
**Same pattern as Bug 2**: `user_list` was written without try/catch for the same reason — a missing error boundary around a bare `await` in an async handler.

### Bug 4
**Incomplete non-ok handling**: The `fetchWithAuth` utility was implemented to handle only the 401 redirect case. The "happy path" (2xx) was left as a direct return. Non-2xx non-401 responses were never addressed, creating a gap where callers assume a successful response and crash on `.json()` of non-JSON bodies.

### Bug 5
**Existing file has unguarded async operations in cron callback**: The `send_overdue_reminders` function performs multiple async operations (MongoDB `updateMany`, `find`, service calls) without a try/catch. A DB or service failure inside the cron callback produces an unhandled rejection.

### Bug 6
**No code change required** — source inspection confirms `handleUpload`, `uploadImage`, and `uploadVideo` are all correctly exported from `web_cms_controller.js` and correctly used in `web_cms_urls.js`. The identified risk (indirect export chain) is present but not currently broken.

### Bug 7
**Substring matching instead of prefix matching**: `pathname.includes('/portfolio')` matches any URL containing `/portfolio` as a substring, not just the standalone `/dashboard/portfolio` section. This is a classic string-contains vs. string-startsWith confusion, creating false positives for nested paths like `/dashboard/web-cms/portfolio`.

### Bug 8
**Two separate issues in sequence**:
1. `await response.json()` is called unconditionally before `response.ok` is checked, so a non-JSON body (HTML 502 page) throws a `SyntaxError` before the error handling code is reached
2. The error message extraction `data.detail || "Invalid login credentials"` ignores all other error shape patterns (`non_field_errors`, field-level arrays) that the backend legitimately returns

## Correctness Properties

Property 1: Bug Condition — SVG Text Node Removed

_For any_ render of the Dashboard `AreaChart`, the fixed JSX SHALL contain only valid SVG child elements inside `<defs>` — specifically the two `<linearGradient>` elements with no bare text nodes between them — producing no React hydration warning related to `<defs>` content.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition — Auth Controllers Return HTTP 500 on DB Error

_For any_ request to `POST /api/v1/auth/login/` or `POST /api/v1/auth/register/` where MongoDB throws during `User.findOne()` or `User.create()`, the fixed controllers SHALL catch the error and respond with HTTP 500 and JSON body `{ "detail": "Internal server error." }` without crashing the Node.js process.

**Validates: Requirements 2.3, 2.4**

Property 3: Bug Condition — `user_list` Returns HTTP 500 on DB Error

_For any_ `GET /api/v1/auth/users/` request where `User.find()` throws, the fixed `user_list` controller SHALL catch the error and respond with HTTP 500 and JSON body `{ "detail": "Internal server error." }`.

**Validates: Requirements 2.5**

Property 4: Bug Condition — `fetchWithAuth` Throws on Non-2xx Non-401 Responses

_For any_ response where `response.ok` is false and `response.status` is not 401, the fixed `fetchWithAuth` SHALL attempt to parse the body as JSON, extract a `detail` or `message` field if present, and throw an `Error` with that message or the HTTP status text. It SHALL NOT return the raw Response object.

**Validates: Requirements 2.6, 2.7**

Property 5: Bug Condition — Reminder Task Does Not Crash on DB Unavailability

_For any_ cron tick of `send_overdue_reminders` where MongoDB is unavailable or any async operation throws, the fixed task SHALL catch the error, log it, and allow the cron schedule to continue without an unhandled rejection.

**Validates: Requirements 2.8, 2.9**

Property 6: Bug Condition — CMS Upload Exports Verified Intact

_For any_ server startup, the routes `POST /api/v1/web-cms/upload/image` and `POST /api/v1/web-cms/upload/video` SHALL register without `TypeError: controller.handleUpload is not a function`. (Confirmed: no code change required — exports are present.)

**Validates: Requirements 2.10, 2.11, 2.12**

Property 7: Bug Condition — `checkPathAccess()` Uses `startsWith` for Path Matching

_For any_ pathname that contains `/portfolio` as a substring but does NOT start with `/dashboard/portfolio` (e.g., `/dashboard/web-cms/portfolio`), the fixed `checkPathAccess()` SHALL NOT trigger the portfolio manager/owner restriction — it SHALL use `pathname.startsWith('/dashboard/portfolio')` (and equivalent `startsWith` for all other restricted segments) to avoid false-positive 403 responses.

**Validates: Requirements 2.13, 2.14, 2.15**

Property 8: Bug Condition — `loginUser` Safely Parses Error Responses

_For any_ non-OK login response, the fixed `loginUser` SHALL wrap `response.json()` in try/catch, and SHALL extract the best available error message from `detail`, `non_field_errors[0]`, the first string value in any field, or fall back to the HTTP status text. It SHALL NOT let a `SyntaxError` propagate to the caller.

**Validates: Requirements 2.16, 2.17**

Property 9: Preservation — All Existing Happy-Path Behaviors Unchanged

_For any_ input where none of the bug conditions hold (DB available, valid credentials, 2xx responses, correct role + path combinations, valid JSON error bodies), all fixed functions SHALL produce exactly the same results as the original functions.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14, 3.15, 3.16, 3.17, 3.18**

## Fix Implementation

### Changes Required

#### Bug 1 — Remove stray `sdf` from `frontend/app/(admin)/dashboard/page.tsx`

**File**: `frontend/app/(admin)/dashboard/page.tsx`
**Specific Change**: Remove the 3-character literal `sdf` from between `</linearGradient>` and `<linearGradient id="collectedGrad">` inside the `<defs>` block.

```
Before: </linearGradient>sdf
After:  </linearGradient>
```

---

#### Bug 2 — Wrap `token_obtain_pair` and `register` in try/catch

**File**: `backend/controllers/auth_controller.js`
**Function**: `token_obtain_pair` and `register`

**Specific Changes**:
1. Wrap the entire body of `token_obtain_pair` in `try { ... } catch (err) { res.status(500).json({ detail: 'Internal server error.' }); }`
2. Wrap the entire body of `register` in the same try/catch pattern

The existing logic (credential check, `is_active` check, `generate_tokens`, `User.create`) is preserved inside the `try` block unchanged.

---

#### Bug 3 — Wrap `user_list` in try/catch

**File**: `backend/controllers/auth_controller.js`
**Function**: `user_list`

**Specific Change**: Wrap `const users = await User.find(...)` and `res.json(users)` in try/catch returning HTTP 500.

---

#### Bug 4 — `fetchWithAuth` throws on non-2xx responses

**File**: `frontend/lib/api.ts`
**Function**: `fetchWithAuth`

**Specific Change**: After the 401 block, add:
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
The existing 401 block and 2xx return are preserved.

---

#### Bug 5 — Wrap `send_overdue_reminders` in try/catch

**File**: `backend/tasks/reminder_task.js`
**Function**: `send_overdue_reminders` (the async function called by the cron schedule)

**Specific Change**: Wrap the entire body of `send_overdue_reminders` in `try { ... } catch (err) { console.error('Reminder task error:', err.message); }`. The cron schedule expression and its invocation are preserved unchanged.

---

#### Bug 6 — No code change required

**File**: `backend/controllers/web_cms_controller.js` and `backend/routes/web_cms_urls.js`

Source inspection confirms all three exports (`handleUpload`, `uploadImage`, `uploadVideo`) are present and correctly wired. No modification needed.

---

#### Bug 7 — Fix `checkPathAccess()` in `frontend/app/(admin)/layout.tsx`

**File**: `frontend/app/(admin)/layout.tsx`
**Function**: `checkPathAccess`

**Specific Changes** (7 substitutions, all inside `checkPathAccess`):

| Before | After |
|--------|-------|
| `pathname.includes('/portfolio')` | `pathname.startsWith('/dashboard/portfolio')` |
| `pathname.includes('/pending-users')` | `pathname.startsWith('/dashboard/pending-users')` |
| `pathname.includes('/web-cms')` | `pathname.startsWith('/dashboard/web-cms')` |
| `pathname.includes('/quotations')` | `pathname.startsWith('/dashboard/quotations')` |
| `pathname.includes('/settings')` | `pathname.startsWith('/dashboard/settings')` |
| `pathname.includes('/invoices')` | `pathname.startsWith('/dashboard/invoices')` |
| `pathname.includes('/payments')` | `pathname.startsWith('/dashboard/payments')` |

The role checks (`userRole === "owner"`, `userRole === "manager"`, etc.) are preserved unchanged.

---

#### Bug 8 — Fix `loginUser` error handling in `frontend/services/authService.ts`

**File**: `frontend/services/authService.ts`
**Function**: `loginUser`

**Specific Change**: Replace the unconditional `const data = await response.json()` block with safe parsing that:
1. Only calls `response.json()` inside a try/catch
2. Extracts the best error message: `detail` → `non_field_errors[0]` → first string value in any top-level field → HTTP `statusText`
3. Falls back to `"Login failed. Please try again."` if JSON parsing fails entirely

The token storage logic (`localStorage.setItem(...)`) and the `return data` are preserved inside the `response.ok` branch.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate each bug on unfixed code (where possible), then verify the fix works correctly and preserves existing behavior.

---

### Exploratory Bug Condition Checking

**Goal**: Confirm each bug is reproducible before applying the fix. Refute or confirm root-cause hypotheses.

**Test Cases**:

1. **Bug 1 — SVG text node**: Inspect the JSX source or run a React render in test and assert the `<defs>` element has exactly 2 children. Will fail on unfixed code.

2. **Bug 2 — Auth controller DB crash**: Mock `User.findOne` to throw a `MongoNetworkError`. Call `token_obtain_pair` and assert HTTP 500 is returned. Will produce unhandled rejection on unfixed code.

3. **Bug 3 — user_list DB crash**: Mock `User.find` to throw. Call `user_list` and assert HTTP 500. Will hang/crash on unfixed code.

4. **Bug 4 — fetchWithAuth non-2xx**: Mock `fetch` to return a 500 response with HTML body. Assert the call throws an Error. Will return raw Response on unfixed code.

5. **Bug 5 — Cron task DB crash**: Mock `Invoice.updateMany` to throw. Invoke `send_overdue_reminders` directly and assert no unhandled rejection propagates. Will throw on unfixed code.

6. **Bug 6 — CMS export chain**: `require` the controller and assert `typeof controller.handleUpload === 'function'`, `typeof controller.uploadImage.single === 'function'`, etc. Passes on current code (no change needed).

7. **Bug 7 — checkPathAccess false positive**: Call `checkPathAccess` with `pathname='/dashboard/web-cms/portfolio'` and `userRole='manager'` — should return `true`. With unfixed code the `/portfolio` branch fires and returns `false` only if role is not owner/manager, so the false positive only affects designers. Test with `userRole='designer'` and pathname `/dashboard/web-cms/portfolio` — unfixed: 403; fixed: passes (web-cms branch handles it, and designer has no business there anyway, but the key fix is `/portfolio` no longer incorrectly matches).

8. **Bug 8 — loginUser non-JSON body**: Mock `fetch` to return HTTP 502 with HTML body. Call `loginUser` and assert it throws with a user-friendly message (not a `SyntaxError`). Will throw `SyntaxError` on unfixed code.

**Expected Counterexamples**:
- Bugs 2, 3: Unhandled rejections / hanging responses on DB failure
- Bug 4: Raw Response returned instead of thrown Error
- Bug 5: Unhandled rejection inside cron callback
- Bug 8: `SyntaxError` propagating from `response.json()` on HTML body

---

### Fix Checking

**Goal**: For all inputs where each bug condition holds, verify the fixed function produces the expected behavior.

**Pseudocode (shared pattern for Bugs 2, 3, 5):**
```
FOR ALL request WHERE isBugCondition(request) DO
  result := fixedController(request)
  ASSERT result.status == 500
  ASSERT result.body.detail == "Internal server error."
END FOR
```

**Pseudocode for Bug 4:**
```
FOR ALL response WHERE isBugCondition_4(response) DO
  ASSERT fetchWithAuth(url, opts) THROWS Error
  ASSERT error.message == response body detail OR statusText
END FOR
```

**Pseudocode for Bug 7:**
```
FOR ALL pathname WHERE pathname.includes('/portfolio')
                   AND NOT pathname.startsWith('/dashboard/portfolio') DO
  ASSERT checkPathAccess(pathname, anyRole) does NOT trigger portfolio branch
END FOR
```

**Pseudocode for Bug 8:**
```
FOR ALL response WHERE isBugCondition_8(response) DO
  result := loginUser(credentials)
  ASSERT result THROWS Error
  ASSERT error.message is human-readable (not SyntaxError message)
  ASSERT error.message != "Invalid login credentials" when specific message available
END FOR
```

---

### Preservation Checking

**Goal**: For all inputs where the bug conditions do NOT hold, fixed functions produce identical results to the originals.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT fixedFunction(input) === originalFunction(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation of `fetchWithAuth` (2xx passthrough) and `checkPathAccess` (all role × path combinations), because:
- These functions have a large combinatorial input space
- PBT generates edge cases automatically (unusual path strings, unexpected roles)
- Strong guarantee that no regression is introduced

**Preservation Test Cases**:
1. **Auth happy path**: Valid credentials → HTTP 200, tokens returned, stored in localStorage
2. **fetchWithAuth 2xx**: 200 response → raw Response returned, not thrown
3. **fetchWithAuth 401**: localStorage cleared, redirect to `/login`
4. **checkPathAccess manager + /dashboard/portfolio**: returns true
5. **checkPathAccess accountant + /dashboard/invoices**: returns true
6. **loginUser HTTP 200**: tokens stored, `AuthResponse` returned
7. **loginUser HTTP 403 with detail**: message surfaced correctly
8. **Cron task with available DB**: invoices updated and reminders sent normally

---

### Unit Tests

- Test `token_obtain_pair` with mocked DB error → assert HTTP 500
- Test `register` with mocked DB error → assert HTTP 500
- Test `user_list` with mocked DB error → assert HTTP 500
- Test `fetchWithAuth` with 200 response → assert raw Response returned
- Test `fetchWithAuth` with 500 JSON body → assert thrown Error with `detail` message
- Test `fetchWithAuth` with 404 HTML body → assert thrown Error with status text
- Test `checkPathAccess` for each protected path with each role
- Test `loginUser` with non-JSON 502 → assert user-friendly Error thrown
- Test `loginUser` with `non_field_errors` body → assert correct message extracted

### Property-Based Tests

- Generate random HTTP status codes (400–599, excluding 401) → `fetchWithAuth` always throws
- Generate random pathname strings containing `/portfolio` but not starting with `/dashboard/portfolio` → `checkPathAccess` does not incorrectly restrict manager/owner
- Generate random valid credentials with DB mocked healthy → `token_obtain_pair` always returns HTTP 200 with tokens
- Generate random JSON error shapes → `loginUser` always returns a string message, never throws `SyntaxError`

### Integration Tests

- Full login flow with real DB available → tokens stored, user redirected to dashboard
- Server startup with `reminder_task` loaded → no `MODULE_NOT_FOUND`, no crash
- `POST /api/v1/web-cms/upload/image` with valid image → HTTP 201 with file_url
- `POST /api/v1/web-cms/upload/image` with oversized file → HTTP 400
- Navigate to `/dashboard/web-cms/portfolio` as manager → no 403 shown
- Navigate to `/dashboard/portfolio` as designer → 403 shown (correct restriction preserved)
