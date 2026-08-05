# Bugfix Requirements Document

## Introduction

This document covers 8 confirmed bugs in **The Design Space** full-stack application — a business portal for an interior design firm built on Node.js/Express 5 + MongoDB (backend) and Next.js 15 + React 19 + TypeScript (frontend).

The overarching rule is: **do not remove any existing code**. All fixes are additive — wrapping, correcting, or inserting without deleting existing logic.

Bugs include: a server startup crash caused by a missing `tasks/` module (Bug 5); unhandled MongoDB errors in login, register, and user-list endpoints that bypass the Express error handler (Bugs 2–3); a stray `sdf` text node inside an SVG `<defs>` block that breaks the dashboard chart (Bug 1); a `fetchWithAuth` utility that silently returns non-OK responses instead of throwing (Bug 4); a confirmed TypeError risk on all CMS upload routes due to indirect export chain (Bug 6); a `pathname.includes()` false-positive that issues a 403 to authorised users on `/dashboard/web-cms/portfolio` (Bug 7); and a login error handler that swallows non-`detail` backend error messages (Bug 8).

## Bug Analysis

### Current Behavior (Defect)

**Bug 1 — Stray `sdf` text node inside SVG `<defs>` (file: `frontend/app/(admin)/dashboard/page.tsx`)**

1.1 WHEN the Dashboard page renders the Performance Analytics AreaChart THEN the system produces a React hydration warning because a bare text node `sdf` sits directly inside the SVG `<defs>` element between the closing `</linearGradient>` tag of `invoicedGrad` and the opening `<linearGradient>` tag of `collectedGrad`

1.2 WHEN the browser processes the SVG in React strict mode or during server-side hydration THEN the system may fail to paint the gradient fills correctly, producing a broken or blank chart area in strict rendering environments

**Bug 2 — `token_obtain_pair` and `register` missing try/catch (file: `backend/controllers/auth_controller.js`)**

2.1 WHEN a login request is received and MongoDB is unavailable or `User.findOne()` throws THEN the system propagates an unhandled async rejection that bypasses the Express global error handler, crashing the Node.js process or hanging the HTTP request

2.2 WHEN a registration request is received and `User.findOne()` or `User.create()` throws a database error THEN the system propagates an unhandled async rejection, crashing the Node.js process or hanging the HTTP request

**Bug 3 — `user_list` missing try/catch (file: `backend/controllers/auth_controller.js`)**

3.1 WHEN `GET /api/v1/auth/users/` is called and MongoDB throws during `User.find()` THEN the system propagates an unhandled async rejection — the Express global error handler is never invoked, causing the request to hang or the process to crash

**Bug 4 — `fetchWithAuth` does not throw on non-OK responses (file: `frontend/lib/api.ts`)**

4.1 WHEN `fetchWithAuth` is called and the server returns an HTTP 500 response with an HTML body (e.g., Express default error page) THEN the system returns the raw `Response` object to the caller, which then calls `.json()` on the HTML body, causing an uncaught `SyntaxError: Unexpected token '<'`

4.2 WHEN `fetchWithAuth` is called and the server returns HTTP 400 or 404 with a JSON error body THEN the system returns the raw `Response` object without throwing, so callers that do not explicitly check `response.ok` silently proceed with invalid data

**Bug 5 — Missing `tasks/reminder_task.js` crashes server on startup (file: `backend/server.js`)**

5.1 WHEN the backend server starts THEN the system throws `Error: Cannot find module './tasks/reminder_task'` at `require('./tasks/reminder_task')` execution, crashing the Node.js process before any routes are registered and before the server begins listening on any port

**Bug 6 — CMS upload routes rely on indirect export chain that can silently break (file: `backend/routes/web_cms_urls.js`)**

6.1 WHEN `POST /api/v1/web-cms/upload/image` or `POST /api/v1/web-cms/upload/video` is hit and `controller.handleUpload` is `undefined` (e.g., due to a missing or mistyped export in `web_cms_controller.js`) THEN the system throws `TypeError: controller.handleUpload is not a function` at route-registration time, causing all web-cms routes to fail to load

6.2 WHEN a file exceeding the size limit or with the wrong MIME type is uploaded to `/api/v1/web-cms/upload/image` or `/api/v1/web-cms/upload/video` THEN the system relies on the `handleUpload` wrapper to return HTTP 400; if the wrapper is not invoked correctly, multer's error falls through to the generic 500 handler

**Bug 7 — `checkPathAccess()` uses `pathname.includes('/portfolio')` causing false-positive 403 (file: `frontend/app/(admin)/layout.tsx`)**

7.1 WHEN a user with role `designer` or `accountant` navigates to any path containing the substring `/portfolio` that is NOT the standalone `/dashboard/portfolio` section (e.g., `/dashboard/web-cms/portfolio`) THEN the system evaluates `pathname.includes('/portfolio')` as `true` and denies access with a 403 screen, even though the user has legitimate access to that path

7.2 WHEN a user navigates to `/dashboard/web-cms/portfolio` and their role is `manager` THEN the system short-circuits correctly at `pathname.includes('/web-cms')` (which appears later in the condition block), but the `/portfolio` substring match in the earlier OR condition creates a fragile evaluation order dependency that breaks if the condition order ever changes

**Bug 8 — `loginUser` swallows specific backend error messages (file: `frontend/services/authService.ts`)**

8.1 WHEN the backend login endpoint returns a non-OK response with a JSON body that contains a field other than `detail` (e.g., `{ non_field_errors: ["..."] }` or `{ email: ["..."] }`) THEN the system throws `new Error(data.detail || "Invalid login credentials")` where `data.detail` is `undefined`, always showing the generic fallback message regardless of the actual backend reason

8.2 WHEN the backend returns a non-JSON error body (e.g., an HTML page from a 502 gateway error) THEN `await response.json()` throws a `SyntaxError` that propagates uncaught to the login page component instead of a user-friendly error message

### Expected Behavior (Correct)

**Bug 1**

2.1 WHEN the Dashboard page renders the Performance Analytics AreaChart THEN the system SHALL render the SVG `<defs>` block containing only the two valid `<linearGradient>` child elements with no stray text nodes between them, producing no React hydration warning

2.2 WHEN the browser processes the SVG in strict mode or during hydration THEN the system SHALL correctly apply the `invoicedGrad` and `collectedGrad` gradient fills to the two chart area series

**Bug 2**

2.3 WHEN a login request is received and a database error occurs THEN the system SHALL catch the error and respond with HTTP 500 and JSON body `{ "detail": "Internal server error." }` without crashing the Node.js process

2.4 WHEN a registration request is received and a database error occurs THEN the system SHALL catch the error and respond with HTTP 500 and JSON body `{ "detail": "Internal server error." }` without crashing the Node.js process

**Bug 3**

2.5 WHEN `GET /api/v1/auth/users/` is called and a database error occurs THEN the system SHALL catch the error and respond with HTTP 500 and JSON body `{ "detail": "Internal server error." }`

**Bug 4**

2.6 WHEN `fetchWithAuth` receives a response with a non-2xx status code (excluding 401) THEN the system SHALL attempt to parse the response body as JSON; if the body contains a `detail` or `message` field, it SHALL throw an `Error` with that message; otherwise it SHALL throw an `Error` with the HTTP status text

2.7 WHEN `fetchWithAuth` receives a non-2xx response and the body is not valid JSON (e.g., HTML) THEN the system SHALL throw an `Error` with the HTTP status text rather than returning the raw response

**Bug 5**

2.8 WHEN the backend server starts THEN the system SHALL successfully load the `tasks/reminder_task` module — which SHALL exist as a valid file — without throwing a `MODULE_NOT_FOUND` error, allowing the server to proceed to register routes and begin listening

2.9 WHEN the `tasks/reminder_task` module is loaded THEN the system SHALL initialise a scheduled cron job (or a safe stub) and log a confirmation message, without interfering with the server lifecycle

**Bug 6**

2.10 WHEN `POST /api/v1/web-cms/upload/image` is called with a valid image file THEN the system SHALL accept the upload, save it to `uploads/website/images/`, and respond HTTP 201 with `{ file_url, original_filename, file_size }`

2.11 WHEN `POST /api/v1/web-cms/upload/image` is called with a non-image file or a file exceeding 20 MB THEN the system SHALL respond HTTP 400 with `{ "error": "<reason>" }` without crashing

2.12 WHEN `POST /api/v1/web-cms/upload/video` is called with a valid mp4/webm file within 150 MB THEN the system SHALL save it to `uploads/website/videos/` and respond HTTP 201 with `{ file_url, original_filename, file_size }`

**Bug 7**

2.13 WHEN `checkPathAccess()` evaluates a pathname for the portfolio restriction THEN the system SHALL use `pathname.startsWith('/dashboard/portfolio')` so that only exact portfolio section paths trigger the manager/owner-only check

2.14 WHEN a manager navigates to `/dashboard/web-cms/portfolio` THEN the system SHALL grant access because the path does not start with `/dashboard/portfolio`; the `/web-cms` branch of `checkPathAccess()` SHALL cover this path and allow manager/owner access

2.15 WHEN a designer navigates to `/dashboard/portfolio` THEN the system SHALL deny access (render the 403 screen) because the path starts with `/dashboard/portfolio` and the designer role is not in `["owner", "manager"]`

**Bug 8**

2.16 WHEN the backend login endpoint returns a non-OK response THEN the system SHALL safely attempt to parse the response body, extract the most specific error message available (`detail`, `non_field_errors[0]`, or HTTP status text), and throw an `Error` with that message

2.17 WHEN the backend returns a non-JSON error body THEN the system SHALL catch the JSON parse failure and throw an `Error` with a human-readable fallback message such as `"Login failed. Please try again."` instead of letting a `SyntaxError` propagate

### Unchanged Behavior (Regression Prevention)

**Bug 1**

3.1 WHEN the dashboard renders the AreaChart with invoice data present in the last 6 months THEN the system SHALL CONTINUE TO display the two-series area chart (Invoiced in amber, Collected in green) with the existing gradient fills and colour scheme

3.2 WHEN `hasChartActivity` is false THEN the system SHALL CONTINUE TO render the empty-state `EmptyRow` component with the `BarChart3` icon instead of the chart

**Bug 2**

3.3 WHEN valid credentials are submitted and the database is available THEN the system SHALL CONTINUE TO return HTTP 200 with `access`, `refresh`, and `user` fields

3.4 WHEN invalid credentials are submitted and the database is available THEN the system SHALL CONTINUE TO return HTTP 401 with `{ "detail": "No active account found with the given credentials" }`

3.5 WHEN a new user registers with a unique email and the database is available THEN the system SHALL CONTINUE TO return HTTP 201 with registration success details

**Bug 3**

3.6 WHEN `GET /api/v1/auth/users/` is called and the database is available THEN the system SHALL CONTINUE TO return HTTP 200 with an array of active users sorted by `full_name`, with passwords excluded

**Bug 4**

3.7 WHEN `fetchWithAuth` receives a 2xx response THEN the system SHALL CONTINUE TO return the raw `Response` object unchanged, preserving all existing caller `.json()` patterns throughout the application

3.8 WHEN `fetchWithAuth` receives a 401 response THEN the system SHALL CONTINUE TO clear `access`, `token`, `refresh`, and `user` keys from localStorage and redirect the browser to `/login`

**Bug 5**

3.9 WHEN the server starts with a valid MongoDB URI and all other required modules present THEN the system SHALL CONTINUE TO connect to MongoDB, register all existing API route prefixes, and begin listening on the configured port

3.10 WHEN the `VERCEL` environment variable is set THEN the system SHALL CONTINUE TO export the `app` object for serverless invocation instead of calling `app.listen()`

**Bug 6**

3.11 WHEN any non-upload Web-CMS route (home, about, services, products, blog, careers, leads, SEO, media, settings) is called THEN the system SHALL CONTINUE TO function independently of the upload routes

3.12 WHEN `handleUpload` wraps a multer middleware and no error occurs THEN the system SHALL CONTINUE TO call `next()` and proceed to the controller handler

**Bug 7**

3.13 WHEN a manager or owner navigates to any `/dashboard/portfolio` or `/dashboard/portfolio/*` path THEN the system SHALL CONTINUE TO grant access

3.14 WHEN an accountant navigates to `/dashboard/invoices` or `/dashboard/payments` THEN the system SHALL CONTINUE TO grant access per the invoices/payments branch of `checkPathAccess()`

3.15 WHEN any authenticated user navigates to `/dashboard` (root) THEN the system SHALL CONTINUE TO allow access without any restriction

**Bug 8**

3.16 WHEN the backend returns HTTP 200 with valid `{ access, refresh, user }` THEN the system SHALL CONTINUE TO store `access`, `refresh`, and `user` in localStorage and return the `AuthResponse` object to the caller

3.17 WHEN the backend returns HTTP 401 with `{ "detail": "No active account found..." }` THEN the system SHALL CONTINUE TO surface that specific detail message to the login page

3.18 WHEN the backend returns HTTP 403 with `{ "detail": "Your account is pending approval..." }` THEN the system SHALL CONTINUE TO surface the pending-approval message to the caller so the login page can display it to the user
