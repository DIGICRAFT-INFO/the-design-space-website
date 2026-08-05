# Requirements Document

## Introduction

TheDesignSpace is a full-stack interior design firm platform consisting of a Node.js/Express/MongoDB backend API and a Next.js 15/React 19/TypeScript frontend. This spec defines comprehensive test coverage requirements for both layers — backend API integration/unit tests (Jest + Supertest) and frontend component/E2E tests (Jest + React Testing Library + Playwright). The goal is to establish reliable, CI-ready test coverage that validates authentication, all CRUD controllers, role-based access, critical business workflows (enquiry → project → quotation → invoice → payment), and all public/admin frontend pages.

---

## Glossary

- **System**: The combined TheDesignSpace backend API and frontend application
- **Backend**: The Node.js/Express/MongoDB API server
- **Frontend**: The Next.js 15/React 19/TypeScript web application
- **Test_Runner**: Jest configured for the respective layer (backend or frontend)
- **Auth_Controller**: The Express controller handling login, register, token refresh, and logout
- **Permission_Middleware**: The Express middleware enforcing JWT authentication and role-based access (`is_authenticated`, `is_owner`, `is_manager_or_above`, `is_finance_or_above`)
- **Business_Controllers**: The set of CRUD controllers: client, project, proposal, quotation, invoice, payment, enquiry, portfolio, master_service, rbac, settings, notification, dashboard, web_cms, web_blog, web_seo, web_career, web_leads, web_media, weather
- **Test_DB**: An isolated MongoDB in-memory instance used exclusively during tests
- **MSW**: Mock Service Worker, used in frontend tests to intercept and mock API calls
- **RTL**: React Testing Library used for rendering and asserting on React components
- **E2E_Runner**: Playwright used for end-to-end browser tests
- **Owner**: A user with role `owner` — has unrestricted access to all features
- **Manager**: A user with role `manager` — can approve users, access CMS, quotations, and portfolio
- **Accountant**: A user with role `accountant` — limited to invoices, payments, and settings
- **Designer**: A user with role `designer` — limited to clients, projects, proposals
- **JWT_Token**: A signed JSON Web Token used to authenticate API requests (3-hour access, 7-day refresh)
- **Public_Routes**: Website pages accessible without authentication: `/`, `/about`, `/blog`, `/careers`, `/contact`, `/portfolio`, `/products`, `/services`, `/privacy-policy`, `/copyright`, `/sitemap`
- **Admin_Routes**: Dashboard pages requiring authentication: `/dashboard` and all sub-routes

---

## Requirements

---

### Requirement 1: Test Infrastructure Setup

**User Story:** As a developer, I want a properly configured test environment for both backend and frontend, so that tests run in isolation, are repeatable, and can execute in CI without side effects.

#### Acceptance Criteria

1. THE Test_Runner SHALL use `jest` as the test framework for the backend with `supertest` for HTTP-level integration testing.
2. THE Test_Runner SHALL use `jest` and React Testing Library for the frontend with MSW for API mocking.
3. THE E2E_Runner SHALL use Playwright for end-to-end browser tests covering critical user flows.
4. WHEN backend tests run, THE Test_DB SHALL be an isolated `mongodb-memory-server` instance that is seeded before each test suite and torn down after.
5. WHEN any test suite runs, THE System SHALL load environment variables from a `.env.test` file (separate from `.env`) so production data is never accessed.
6. WHEN tests run in CI, THE Test_Runner SHALL execute with `--forceExit` and `--detectOpenHandles` flags to prevent hanging processes.
7. THE Test_Runner SHALL produce a coverage report (Istanbul/nyc) with minimum thresholds: 70% line coverage for backend controllers, 60% branch coverage overall.
8. WHEN a test creates data in Test_DB, THE Test_Runner SHALL clean up that data after the test or test suite completes.
9. THE System SHALL provide a `jest.config.js` (or `jest.config.ts`) for each of backend and frontend with correct module resolution, transform settings, and test match patterns.
10. WHERE TypeScript is used (frontend), THE Test_Runner SHALL configure `ts-jest` or Babel with TypeScript support so tests compile without errors.

---

### Requirement 2: Backend Authentication Tests

**User Story:** As a developer, I want integration tests for the `auth_controller`, so that I can verify login, registration, token management, and user approval flows work correctly and securely.

#### Acceptance Criteria

1. WHEN a valid email and password are submitted to `POST /api/v1/auth/login/`, THE Auth_Controller SHALL return HTTP 200 with `access` token, `refresh` token, and user object containing `id`, `email`, `full_name`, `role`, and `page_access`.
2. WHEN an inactive user submits valid credentials to `POST /api/v1/auth/login/`, THE Auth_Controller SHALL return HTTP 403 with a message indicating the account is pending approval.
3. WHEN invalid credentials are submitted to `POST /api/v1/auth/login/`, THE Auth_Controller SHALL return HTTP 401.
4. WHEN a new user registers via `POST /api/v1/auth/register/`, THE Auth_Controller SHALL return HTTP 201 with `is_active: false` (pending approval).
5. WHEN a duplicate email is used in `POST /api/v1/auth/register/`, THE Auth_Controller SHALL return HTTP 400.
6. WHEN a password shorter than 8 characters is submitted, THE Auth_Controller SHALL return HTTP 400 with a descriptive error.
7. WHEN a valid refresh token is submitted to `POST /api/v1/auth/token/refresh/`, THE Auth_Controller SHALL return HTTP 200 with a new `access` token.
8. WHEN an expired or invalid refresh token is submitted, THE Auth_Controller SHALL return HTTP 401.
9. WHEN `POST /api/v1/auth/logout/` is called with a valid Bearer token, THE Auth_Controller SHALL return HTTP 200.
10. WHEN `GET /api/v1/auth/me/` is called without a token, THE Permission_Middleware SHALL return HTTP 401.
11. WHEN `GET /api/v1/auth/manager/pending-users/` is called by a designer role user, THE Permission_Middleware SHALL return HTTP 403.
12. WHEN a manager approves a user via `PUT /api/v1/auth/manager/approve/:userId/`, THE Auth_Controller SHALL set `is_active: true` and return HTTP 200.
13. WHEN a manager deactivates a user via `PUT /api/v1/auth/manager/deactivate/:userId/`, THE Auth_Controller SHALL set `is_active: false` and return HTTP 200.
14. WHEN `PATCH /api/v1/auth/me/` is called with a duplicate email, THE Auth_Controller SHALL return HTTP 400.
15. WHEN `POST /api/v1/auth/me/change-password/` is called with the wrong old password, THE Auth_Controller SHALL return HTTP 400.

---

### Requirement 3: Backend Client and Project Controller Tests

**User Story:** As a developer, I want integration tests for the `client_controller` and `project_controller`, so that I can verify CRUD operations on clients and projects work correctly with proper authentication.

#### Acceptance Criteria

1. WHEN `GET /api/v1/clients/` is called with a valid token, THE System SHALL return HTTP 200 with an array of client objects.
2. WHEN `POST /api/v1/clients/` is called with valid data and a valid token, THE System SHALL return HTTP 201 with the created client.
3. WHEN `POST /api/v1/clients/` is called without a token, THE Permission_Middleware SHALL return HTTP 401.
4. WHEN `GET /api/v1/clients/:id/` is called with a non-existent ID, THE System SHALL return HTTP 404.
5. WHEN `PUT /api/v1/clients/:id/` is called with valid data, THE System SHALL return HTTP 200 with the updated client.
6. WHEN `DELETE /api/v1/clients/:id/` is called with a valid ID, THE System SHALL return HTTP 204.
7. WHEN `GET /api/v1/clients/projects/` is called with a valid token, THE System SHALL return HTTP 200 with an array of project objects.
8. WHEN `POST /api/v1/clients/projects/` is called with valid data and a valid token, THE System SHALL return HTTP 201 with the created project.
9. WHEN `GET /api/v1/clients/projects/:id/` is called with a non-existent ID, THE System SHALL return HTTP 404.
10. WHEN `DELETE /api/v1/clients/projects/:id/` is called with a valid ID, THE System SHALL return HTTP 204.

---

### Requirement 4: Backend Proposal Controller Tests

**User Story:** As a developer, I want integration tests for the `proposal_controller`, so that proposal CRUD and status transitions are verified to be correct and consistent.

#### Acceptance Criteria

1. WHEN `GET /api/v1/proposals` is called with a valid token, THE System SHALL return HTTP 200 with a list of proposals including `project_name`, `client_name`, and `client_email` fields.
2. WHEN `POST /api/v1/proposals` is called with valid data, THE System SHALL return HTTP 201 with the created proposal and emit a `proposal_created` in-app notification.
3. WHEN `GET /api/v1/proposals/:pk` is called for a non-existent proposal, THE System SHALL return HTTP 404.
4. WHEN `PATCH /api/v1/proposals/:pk/status/` is called with a valid status (`draft`, `sent`, `accepted`, `rejected`), THE System SHALL return HTTP 200 with the updated proposal.
5. WHEN `PATCH /api/v1/proposals/:pk/status/` is called with an invalid status value, THE System SHALL return HTTP 400.
6. WHEN `DELETE /api/v1/proposals/:pk` is called for an existing proposal, THE System SHALL return HTTP 204 and delete the associated in-app notifications.
7. WHEN a proposal status transitions to `sent`, `accepted`, or `rejected`, THE System SHALL emit the corresponding in-app notification.

---

### Requirement 5: Backend Quotation Controller Tests

**User Story:** As a developer, I want integration tests for the `quotation_controller`, so that quotation CRUD, versioning, status transitions, copy, and revision workflows are verified.

#### Acceptance Criteria

1. WHEN `GET /api/v1/quotations` is called with a valid token, THE System SHALL return HTTP 200 with quotation objects that include `project_name` and `client_name`.
2. WHEN `POST /api/v1/quotations` is called with valid data and line items, THE System SHALL return HTTP 201 with a quotation including a generated `quote_number` and calculated totals.
3. WHEN `POST /api/v1/quotations/:pk/approve/` is called on a `draft` or `sent` quotation, THE System SHALL update status to `approved` and return HTTP 200.
4. WHEN `POST /api/v1/quotations/:pk/approve/` is called on an `approved` quotation, THE System SHALL return HTTP 400.
5. WHEN `POST /api/v1/quotations/:pk/revise/` is called, THE System SHALL create a new quotation linked to the parent and return HTTP 201.
6. WHEN `GET /api/v1/quotations/:pk/versions/` is called, THE System SHALL return the full revision chain starting from the root quotation.
7. WHEN `POST /api/v1/quotations/:pk/copy/` is called, THE System SHALL create a copy with a `-C1` suffix number, set the source to `superseded`, and return HTTP 201.
8. WHEN `GET /api/v1/quotations/:pk/history/` is called, THE System SHALL return an array of edit history entries for that quotation.
9. WHEN a quotation is updated with changed fields, THE System SHALL create a `QuotationHistory` record capturing the diff.
10. WHEN `DELETE /api/v1/quotations/:pk` is called, THE System SHALL return HTTP 204 and remove associated notifications.

---

### Requirement 6: Backend Invoice Controller Tests

**User Story:** As a developer, I want integration tests for the `invoice_controller`, so that invoice CRUD, status transitions, tax calculation, copy, and PDF generation endpoints are verified.

#### Acceptance Criteria

1. WHEN `GET /api/v1/invoices` is called with a valid token, THE System SHALL return HTTP 200 with invoice objects including `project_name` and `client_name`.
2. WHEN `POST /api/v1/invoices/` is called with valid data, THE System SHALL return HTTP 201 and emit an `invoice_created` notification.
3. WHEN `POST /api/v1/invoices/:pk/send/` is called on a `draft` invoice, THE System SHALL set status to `issued` and return HTTP 200.
4. WHEN `POST /api/v1/invoices/:pk/send/` is called on a non-`draft` invoice, THE System SHALL return HTTP 400.
5. WHEN `POST /api/v1/invoices/:pk/mark-paid/` is called, THE System SHALL set status to `paid` and return HTTP 200.
6. WHEN `PUT /api/v1/invoices/:pk/` is called with updated line items, THE System SHALL recalculate `subtotal`, `total_tax`, and `grand_total` correctly.
7. WHEN `POST /api/v1/invoices/:pk/copy/` is called on an invoice with no payments, THE System SHALL create a copy with `-C1` suffix, cancel the source, and return HTTP 201.
8. WHEN `POST /api/v1/invoices/:pk/copy/` is called on an invoice with existing payments (status `paid` or `partial`), THE System SHALL return HTTP 400.
9. WHEN `GET /api/v1/invoices/:pk/pdf/` is called and PDF generation succeeds, THE System SHALL return a response with `Content-Type: application/pdf`.
10. IF PDF generation fails, THEN THE System SHALL return HTTP 500 with a JSON error body.

---

### Requirement 7: Backend Payment Controller Tests

**User Story:** As a developer, I want integration tests for the `payment_controller`, so that recording and listing payments works correctly.

#### Acceptance Criteria

1. WHEN `POST /api/v1/payments/` is called with valid data including `invoice_id` and `amount_paid`, THE System SHALL return HTTP 201 with the created payment record.
2. WHEN `GET /api/v1/payments/` is called with a valid token, THE System SHALL return HTTP 200 with a list of payment records.
3. WHEN `GET /api/v1/payments/` is called without a token, THE Permission_Middleware SHALL return HTTP 401.
4. WHEN `GET /api/v1/payments/?invoice=:id` is called, THE System SHALL return HTTP 200 with only payment records for that invoice.

---

### Requirement 8: Backend Enquiry Controller Tests

**User Story:** As a developer, I want integration tests for the `enquiry_controller`, so that public enquiry submission and admin CRUD operations are verified.

#### Acceptance Criteria

1. WHEN `POST /api/v1/public/enquiry` is called with a valid `name`, `phone`, and optional `email`, THE System SHALL return HTTP 201 or 200 with a success message.
2. WHEN `POST /api/v1/public/enquiry` is called without required fields (`name`, `phone`), THE System SHALL return HTTP 400.
3. WHEN `GET /api/v1/enquiries` is called with a valid token, THE System SHALL return HTTP 200 with a list of enquiry objects.
4. WHEN `PATCH /api/v1/enquiries/:id/` is called with a valid status update, THE System SHALL return HTTP 200 with the updated enquiry.

---

### Requirement 9: Backend Portfolio, Master Service, and RBAC Controller Tests

**User Story:** As a developer, I want integration tests for the portfolio, master service, and RBAC controllers, so that these management features are verified to operate correctly with proper authorization.

#### Acceptance Criteria

1. WHEN `GET /api/v1/portfolio/` is called with a valid token, THE System SHALL return HTTP 200 with a list of portfolio items.
2. WHEN `POST /api/v1/portfolio/` is called with valid data and a valid token, THE System SHALL return HTTP 201.
3. WHEN `DELETE /api/v1/portfolio/:id/` is called with a valid ID, THE System SHALL return HTTP 204.
4. WHEN `GET /api/v1/services/` is called with a valid token, THE System SHALL return HTTP 200 with a list of master service items.
5. WHEN `POST /api/v1/services/` is called with valid data and a valid token, THE System SHALL return HTTP 201.
6. WHEN `GET /api/v1/rbac/roles/` is called by an owner-role user, THE System SHALL return HTTP 200 with role/permission data.
7. WHEN `GET /api/v1/rbac/roles/` is called by a non-owner user, THE Permission_Middleware SHALL return HTTP 403.
8. WHEN `POST /api/v1/rbac/assign-access/` is called by an owner-role user with valid user ID and `page_access` array, THE System SHALL return HTTP 200 with the updated user.

---

### Requirement 10: Backend Settings, Notification, and Dashboard Controller Tests

**User Story:** As a developer, I want integration tests for settings, notification, and dashboard controllers, so that firm configuration, notifications, and analytics endpoints are verified.

#### Acceptance Criteria

1. WHEN `GET /api/v1/settings/firm/` is called with a valid token, THE System SHALL return HTTP 200 with firm settings data.
2. WHEN `PUT /api/v1/settings/firm/` is called with valid data and a valid token, THE System SHALL return HTTP 200 with updated settings.
3. WHEN `GET /api/v1/in-app-notifications` is called with a valid token, THE System SHALL return HTTP 200 with a list of in-app notifications.
4. WHEN `PATCH /api/v1/in-app-notifications/:id/read/` is called with a valid ID, THE System SHALL return HTTP 200 and mark the notification as read.
5. WHEN `GET /api/v1/dashboard/summary` is called with a valid token, THE System SHALL return HTTP 200 with a `kpis` object containing `total_invoiced`, `total_collected`, `outstanding`, `overdue_count`, `active_projects`, `total_clients`, and `pending_quotations`.
6. WHEN `GET /api/v1/dashboard/summary` is called without a token, THE Permission_Middleware SHALL return HTTP 401.

---

### Requirement 11: Backend Web CMS, Blog, SEO, Career, Leads, and Media Controller Tests

**User Story:** As a developer, I want integration tests for the web content management controllers, so that public-facing CMS content delivery and admin CMS editing are verified.

#### Acceptance Criteria

1. WHEN `GET /api/v1/public/home` is called without authentication, THE System SHALL return HTTP 200 with home CMS data.
2. WHEN `GET /api/v1/public/about` is called without authentication, THE System SHALL return HTTP 200 with about CMS data.
3. WHEN `GET /api/v1/public/blog` is called without authentication, THE System SHALL return HTTP 200 with an array of published blog posts.
4. WHEN `GET /api/v1/public/blog/:slug` is called for an existing slug, THE System SHALL return HTTP 200 with the full blog post object.
5. WHEN `GET /api/v1/public/blog/:slug` is called for a non-existent slug, THE System SHALL return HTTP 404.
6. WHEN `GET /api/v1/public/careers` is called without authentication, THE System SHALL return HTTP 200 with open job listings.
7. WHEN `POST /api/v1/public/careers/apply` is called with valid form data including a resume file, THE System SHALL return HTTP 200 or 201 with a success message.
8. WHEN `GET /api/v1/public/portfolio` is called without authentication, THE System SHALL return HTTP 200 with portfolio items.
9. WHEN `GET /api/v1/public/seo` is called, THE System SHALL return HTTP 200 with an array of SEO entries.
10. WHEN `GET /api/v1/public/settings` is called, THE System SHALL return HTTP 200 with web settings including `contact` and `social_links`.
11. WHEN `GET /api/v1/web-leads/` is called with a manager-or-above token, THE System SHALL return HTTP 200 with a list of leads.
12. WHEN `GET /api/v1/web-leads/` is called without a token, THE Permission_Middleware SHALL return HTTP 401.

---

### Requirement 12: Frontend Website Page Tests

**User Story:** As a developer, I want component/page render tests for all public website pages using React Testing Library with MSW, so that I can verify each page renders its core content correctly, handles loading states, and handles API errors gracefully.

#### Acceptance Criteria

1. WHEN the Home page (`/`) renders with mocked API data, THE Frontend SHALL display the hero section, navigation, and at least one portfolio card.
2. WHEN the Home page renders and the API returns an error, THE Frontend SHALL render without crashing and display fallback content.
3. WHEN the About page (`/about`) renders with mocked data, THE Frontend SHALL display the narrative section and team members list.
4. WHEN the Blog list page (`/blog`) renders with mocked data, THE Frontend SHALL display a list of blog post cards with titles and excerpts.
5. WHEN the Blog detail page (`/blog/[slug]`) renders with a mocked post, THE Frontend SHALL display the post title, author, and content.
6. WHEN the Blog detail page renders with a non-existent slug (404 from API), THE Frontend SHALL render a not-found state.
7. WHEN the Portfolio page (`/portfolio`) renders with mocked data, THE Frontend SHALL display portfolio item cards.
8. WHEN the Portfolio detail page (`/portfolio/[id]`) renders with mocked data, THE Frontend SHALL display the project title, images, and description.
9. WHEN the Careers page (`/careers`) renders with mocked job listings, THE Frontend SHALL display job cards with title, department, and apply button.
10. WHEN the Contact page (`/contact`) renders, THE Frontend SHALL display the contact form with name, phone, and email fields.
11. WHEN the Contact form is submitted with valid data, THE Frontend SHALL call the `submitEnquiry` function and display a success message.
12. WHEN the Contact form is submitted with missing required fields, THE Frontend SHALL display inline validation errors without submitting.
13. WHEN the Services page (`/services`) renders with mocked data, THE Frontend SHALL display service package cards.
14. WHEN the Products page (`/products`) renders with mocked data, THE Frontend SHALL display product cards.
15. WHEN the Privacy Policy page (`/privacy-policy`) renders, THE Frontend SHALL display legal text content.
16. WHEN the Copyright page (`/copyright`) renders, THE Frontend SHALL display copyright terms content.

---

### Requirement 13: Frontend Authentication Page Tests

**User Story:** As a developer, I want tests for the login and register pages, so that authentication flows, form validation, and error handling are verified.

#### Acceptance Criteria

1. WHEN the Login page (`/login`) renders, THE Frontend SHALL display email and password fields and a submit button.
2. WHEN the login form is submitted with valid credentials and the API returns tokens, THE Frontend SHALL store the `access` token in localStorage and redirect to `/dashboard`.
3. WHEN the login form is submitted and the API returns HTTP 401, THE Frontend SHALL display an error message without redirecting.
4. WHEN the login form is submitted and the API returns HTTP 403 (pending approval), THE Frontend SHALL display a "pending approval" message.
5. WHEN the login form is submitted with an empty email or password, THE Frontend SHALL display validation errors without calling the API.
6. WHEN the Register page (`/register`) renders, THE Frontend SHALL display full_name, email, role, and password fields.
7. WHEN the register form is submitted with valid data and the API returns HTTP 201, THE Frontend SHALL display a success/pending-approval message.
8. WHEN the register form is submitted and the API returns a duplicate email error (HTTP 400), THE Frontend SHALL display the error message.
9. WHEN the register form password is less than 8 characters, THE Frontend SHALL display a validation error.

---

### Requirement 14: Frontend Admin Dashboard Page Tests

**User Story:** As a developer, I want render and interaction tests for the admin dashboard pages, so that authenticated page rendering, loading/error states, and role-based navigation are verified.

#### Acceptance Criteria

1. WHEN the Dashboard overview page (`/dashboard`) renders with mocked KPI data, THE Frontend SHALL display stat cards for total invoiced, collected, outstanding, and overdue counts.
2. WHEN the Dashboard page renders and the API returns an error, THE Frontend SHALL display an error state component.
3. WHEN the Dashboard layout renders for a `designer` role user, THE Frontend SHALL NOT display the Quotations or Portfolio nav links.
4. WHEN the Dashboard layout renders for an `owner` role user, THE Frontend SHALL display all navigation items including Access Control and Website CMS sections.
5. WHEN the Dashboard layout renders for an `accountant` role user, THE Frontend SHALL display Invoices and Payments but NOT Projects or Proposals.
6. WHEN the Clients page (`/dashboard/clients`) renders with mocked data, THE Frontend SHALL display a table or list of client records.
7. WHEN the Projects page (`/dashboard/projects`) renders with mocked data, THE Frontend SHALL display project cards or rows with status badges.
8. WHEN the Proposals page (`/dashboard/proposals`) renders with mocked data, THE Frontend SHALL display proposals with status indicators.
9. WHEN the Quotations page (`/dashboard/quotations`) renders with mocked data, THE Frontend SHALL display quotations with `quote_number` and total amount.
10. WHEN the Invoices page (`/dashboard/invoices`) renders with mocked data, THE Frontend SHALL display invoices with status badges and amounts.
11. WHEN the Payments page (`/dashboard/payments`) renders with mocked data, THE Frontend SHALL display payment records.
12. WHEN the Enquiry page (`/dashboard/enquiry`) renders with mocked data, THE Frontend SHALL display enquiry records with status.
13. WHEN the Portfolio management page (`/dashboard/portfolio`) renders with mocked data, THE Frontend SHALL display portfolio items.
14. WHEN the Services management page (`/dashboard/services`) renders with mocked data, THE Frontend SHALL display master service items.
15. WHEN the Notifications page (`/dashboard/notifications`) renders with mocked data, THE Frontend SHALL display notification items with title and message.
16. WHEN the Settings page (`/dashboard/settings`) renders with mocked data, THE Frontend SHALL display firm settings form fields.
17. WHEN the Pending Users page (`/dashboard/pending-users`) renders with mocked data, THE Frontend SHALL display pending user cards with approve and reject buttons.
18. WHEN the Access Control page (`/dashboard/access-control`) renders, THE Frontend SHALL display user list with page access toggles.
19. WHEN the Web CMS overview page (`/dashboard/web-cms`) renders, THE Frontend SHALL display CMS navigation links for Home, About, Blog, etc.
20. WHEN a `designer` role user navigates to `/dashboard/quotations`, THE Frontend SHALL display an Access Denied (403) screen rather than the page content.

---

### Requirement 15: Frontend End-to-End Tests

**User Story:** As a developer, I want Playwright E2E tests for critical user flows, so that cross-layer integration is verified from browser to API.

#### Acceptance Criteria

1. WHEN an owner user completes the login flow (fills email/password, submits), THE E2E_Runner SHALL verify the browser redirects to `/dashboard` and the dashboard KPI cards are visible.
2. WHEN a user submits the public contact form at `/contact` with valid data, THE E2E_Runner SHALL verify the success message appears and the form is cleared.
3. WHEN an authenticated owner user navigates to `/dashboard/clients` and creates a new client, THE E2E_Runner SHALL verify the client appears in the list.
4. WHEN an authenticated owner user creates a quotation from `/dashboard/quotations`, THE E2E_Runner SHALL verify the new quotation appears with a generated `quote_number`.
5. WHEN an authenticated owner user generates an invoice from a quotation, THE E2E_Runner SHALL verify the invoice appears in `/dashboard/invoices` with the correct amount.
6. WHEN an unauthenticated user navigates directly to `/dashboard`, THE E2E_Runner SHALL verify the browser redirects to `/login`.
7. WHEN a `designer` role user logs in and navigates to `/dashboard/quotations`, THE E2E_Runner SHALL verify the Access Denied screen is displayed.
8. WHEN an owner user logs out, THE E2E_Runner SHALL verify localStorage is cleared and the browser redirects to `/login`.
9. WHEN an owner user navigates to `/dashboard/pending-users` and clicks Approve on a pending user, THE E2E_Runner SHALL verify the user disappears from the pending list.
10. WHEN a user visits the public blog list at `/blog` and clicks on a blog post, THE E2E_Runner SHALL verify navigation to the blog detail page with the correct slug in the URL.

---

### Requirement 16: Backend Model Validation Unit Tests

**User Story:** As a developer, I want unit tests for critical Mongoose models, so that required fields, enums, and constraints are validated independently of the HTTP layer.

#### Acceptance Criteria

1. WHEN a `User` document is created without an `email`, THE System SHALL throw a Mongoose validation error.
2. WHEN a `User` document is created with a `role` not in `['owner', 'manager', 'accountant', 'designer']`, THE System SHALL throw a Mongoose validation error.
3. WHEN a `User` document is saved for the first time, THE System SHALL hash the password (the stored value SHALL NOT equal the plaintext input).
4. WHEN a `Quotation` document is created, THE System SHALL default `status` to `draft`.
5. WHEN an `Invoice` document is created, THE System SHALL default `status` to `draft`.
6. WHEN a `Proposal` document status is set to an invalid value, THE System SHALL throw a Mongoose validation error.
7. THE `User` model's `check_password` method SHALL return `true` when the correct plaintext password is compared against the hash.
8. THE `User` model's `check_password` method SHALL return `false` when an incorrect plaintext password is compared.
9. THE `User` model's virtual `is_manager_or_above` SHALL return `true` for roles `owner` and `manager`, and `false` for `accountant` and `designer`.
10. WHEN a `Client` document is created without required fields, THE System SHALL throw a Mongoose validation error.
