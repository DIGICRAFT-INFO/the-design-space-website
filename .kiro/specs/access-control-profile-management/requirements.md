# Requirements Document

## Introduction

This feature adds a comprehensive Role-Based Access Control (RBAC) system and self-service Profile Management page to The Design Space admin dashboard. It encompasses four main areas: (1) a `/dashboard/profile` page where authenticated admin users can view and edit their own profile data; (2) an enhanced `/dashboard/access-control` module where the owner/superadmin can create users, assign roles, and grant or revoke granular page-level permissions; (3) a permission-aware sidebar that only shows pages a user has been granted access to; and (4) real-time access revocation so that a revoked user's session is invalidated on the next API request and they are immediately redirected to login.

The system builds on the existing backend (`User` model, `rbac_controller`, `auth_controller`, `permissions` middleware, in-app notification service) and the existing Next.js 15 App Router frontend layout.

---

## Glossary

- **System**: The Design Space admin dashboard (frontend + backend combined).
- **Profile_Page**: The `/dashboard/profile` Next.js page component.
- **Access_Control_Module**: The `/dashboard/access-control` Next.js page and its backend counterparts.
- **Sidebar**: The persistent left-navigation component rendered by `frontend/app/(admin)/layout.tsx`.
- **Owner**: A user whose `role` field equals `"owner"` in MongoDB. Has unrestricted access.
- **Manager**: A user whose `role` equals `"manager"`. Can manage pending users but cannot use the Access Control Module.
- **Accountant**: A user whose `role` equals `"accountant"`. Has access only to finance pages.
- **Designer**: Default role for new self-registered users. Limited access until granted explicitly.
- **Superadmin**: Used interchangeably with Owner throughout this document.
- **Page_Access**: The `page_access` string array on the `User` document that lists which sidebar page keys the user is allowed to view.
- **Token_Invalidation**: The act of marking a user `is_active: false` in MongoDB so that `permissions.is_authenticated` returns 401 on the user's next request.
- **In_App_Notification**: A record in the `in_app_notifications` MongoDB collection created by the `in_app_notification_service`.
- **Revocation**: Setting `is_active = false` and clearing `page_access` for a user, forcing immediate logout on next API call.
- **Profile_Image**: The relative file path stored in `User.profile_image`, resolved to an absolute URL via the backend's `uploads/avatars/` static directory.
- **JWT**: JSON Web Token. The `access` token stored in `localStorage` under the key `"access"`.
- **PAGE_KEY_MAP**: The frontend mapping from page-key strings (e.g. `"clients"`) to route hrefs (e.g. `"/dashboard/clients"`), already defined in the sidebar layout.

---

## Requirements

### Requirement 1: Profile Management Page

**User Story:** As an authenticated admin user (owner, manager, accountant, or designer with dashboard access), I want a dedicated profile page at `/dashboard/profile`, so that I can view and update my own account information without leaving the dashboard.

#### Acceptance Criteria

1. WHEN a user navigates to `/dashboard/profile`, THE Profile_Page SHALL display the user's full name, email address, phone number, role, account creation date, and last login time.
2. WHEN a user submits a profile update form with valid `full_name`, `email`, and/or `phone` values, THE Profile_Page SHALL call `PATCH /api/v1/auth/me/` and reflect the saved values immediately upon success.
3. IF the submitted email is already in use by another account, THEN THE Profile_Page SHALL display the field-level error "User with this email already exists." without clearing other form fields.
4. WHEN a user uploads an image file via the avatar upload control, THE Profile_Page SHALL call `POST /api/v1/auth/me/avatar/` with a `multipart/form-data` body containing the file under the key `avatar`, and render the new profile picture immediately on success.
5. IF the uploaded avatar file exceeds 5 MB, is smaller than 1 KB, or is not a PNG, JPG, JPEG, or WEBP, THEN THE Profile_Page SHALL display a validation error and SHALL NOT submit the request to the backend.
6. WHEN a user clicks the remove avatar control, THE Profile_Page SHALL call `DELETE /api/v1/auth/me/avatar/` and revert the avatar display to the initials-based fallback.
7. WHEN a user submits the change-password form with a correct `old_password` and a valid `new_password` of at least 8 characters, THE Profile_Page SHALL call `POST /api/v1/auth/me/change-password/` and display a success confirmation message.
8. IF the `old_password` provided does not match the stored password, THEN THE Profile_Page SHALL display the error "Current password is incorrect." and retain all form values.
9. IF the `new_password` is fewer than 8 characters, THEN THE Profile_Page SHALL display the error "Password must be at least 8 characters." client-side before submitting.
10. IF the `new_password` equals the `old_password`, THEN THE Profile_Page SHALL display the error "New password must be different from current password." and SHALL NOT submit the request.
11. THE Profile_Page SHALL display the user's current role and a read-only list of their currently assigned page permissions.
12. WHEN the user's profile data is successfully updated, THE Profile_Page SHALL dispatch a `"profile-updated"` custom DOM event with the updated user object as `event.detail`, so that the sidebar layout can update the avatar and display name without a page reload.
13. WHEN the profile page is accessed without a valid JWT in `localStorage`, THE System SHALL redirect the user to `/login`.

---

### Requirement 2: Access Control Module — User Management

**User Story:** As the owner/superadmin, I want to create, view, edit, and delete managed users from `/dashboard/access-control`, so that I can maintain a complete user roster with the correct roles and access settings.

#### Acceptance Criteria

1. WHEN the owner opens `/dashboard/access-control`, THE Access_Control_Module SHALL fetch and display a list of all users excluding the currently logged-in owner, showing full name, email, role, active/revoked status, number of granted pages, and last access-granted date.
2. WHEN the owner submits the "Add User" form with `full_name`, `email`, `password` (minimum 8 characters), `role`, and `page_access`, THE Access_Control_Module SHALL call `POST /api/v1/rbac/users/` and add the new user to the list immediately with `is_active: true`.
3. IF the submitted email already exists, THEN THE Access_Control_Module SHALL display the field-level error "User with this email already exists." without closing the modal.
4. WHEN the owner submits the edit user form for an existing user, THE Access_Control_Module SHALL call `PATCH /api/v1/rbac/users/{userId}/` with only the changed fields and reflect the updates in the list row immediately.
5. IF a `new_password` is provided in the edit form and it is fewer than 8 characters, THEN THE Access_Control_Module SHALL display "Password must be at least 8 characters." and SHALL NOT submit the request.
6. WHEN the owner confirms deletion of a user, THE Access_Control_Module SHALL call `DELETE /api/v1/rbac/users/{userId}/` and remove the user row from the list.
7. THE Access_Control_Module SHALL prevent the owner from deleting their own account via the UI by hiding or disabling the delete control for the authenticated user's own row.
8. WHEN the owner uses the search/filter control, THE Access_Control_Module SHALL filter the displayed user list in real time by `full_name` or `email` without additional API calls.

---

### Requirement 3: Access Control Module — Grant & Revoke

**User Story:** As the owner/superadmin, I want to grant or revoke access for any managed user instantly, so that access changes take effect on the user's very next API request without waiting for token expiry.

#### Acceptance Criteria

1. WHEN the owner clicks "Grant" for a revoked user, THE Access_Control_Module SHALL call `POST /api/v1/rbac/users/{userId}/grant/` and update the user's row to show "Active" status immediately.
2. WHEN the owner clicks "Revoke" for an active user and confirms the action, THE Access_Control_Module SHALL call `POST /api/v1/rbac/users/{userId}/revoke/` which sets `is_active = false` and clears `page_access` in MongoDB, and update the user's row to show "Revoked" status immediately.
3. WHEN `is_active` is set to `false` for a user in MongoDB, THE System's `is_authenticated` middleware SHALL return HTTP 401 on that user's next API request, regardless of token expiry time.
4. WHEN a user receives a 401 response from any authenticated API endpoint, THE frontend SHALL clear `localStorage` and redirect the user to `/login` immediately.
5. WHEN the owner updates a user's `page_access` checklist and saves, THE Access_Control_Module SHALL call `PATCH /api/v1/rbac/users/{userId}/page-access/` and reflect the updated page count in the user row.
6. WHEN the owner grants access to a user, THE System SHALL create an in-app notification with `event_type: "access_granted"`, `title: "Access Granted"`, and a message containing the target user's name.
7. WHEN the owner revokes access from a user, THE System SHALL create an in-app notification with `event_type: "access_revoked"`, `title: "Access Revoked"`, and a message containing the target user's name and email.
8. WHEN a new user self-registers via `POST /api/v1/auth/register/`, THE System SHALL create an in-app notification with `event_type: "user_created"` so the superadmin is alerted via the notification bell.

---

### Requirement 4: Sidebar Access Control

**User Story:** As any authenticated admin user, I want the sidebar to show only the pages I have been granted access to, so that I am never presented with links to sections I cannot use.

#### Acceptance Criteria

1. WHEN the layout component initialises, THE Sidebar SHALL read `page_access` from `localStorage["user"]` and render only the nav items whose page key is present in the array.
2. WHEN the owner is the authenticated user, THE Sidebar SHALL display all navigation items regardless of the `page_access` array.
3. WHEN any user (including owner) has an empty `page_access` array, THE Sidebar SHALL display the Dashboard navigation item as a fallback so the sidebar is never fully blank. For the owner, AC2 means all items are always visible; this AC3 fallback therefore applies only to non-owner users.
4. THE Sidebar SHALL verify access on every client-side route change by re-reading `localStorage["user"].page_access` and re-evaluating visibility.
5. WHEN a user navigates directly to a URL they do not have page access to, THE System SHALL display the existing 403 Access Denied screen and SHALL NOT render the page content.
6. THE Sidebar SHALL display the "Access Control" link exclusively to users whose `role` is `"owner"`.
7. THE Sidebar SHALL display the "Website Interactive CMS" section only to users whose `page_access` contains at least one `web_cms_*` key.
8. WHEN the user's profile is updated and a `"profile-updated"` custom event fires, THE Sidebar SHALL reload the `page_access` and avatar from the event payload and re-evaluate sidebar item visibility.

---

### Requirement 5: Real-Time Revocation Enforcement

**User Story:** As the owner/superadmin, I want a revoked user to be force-logged-out the moment I revoke their access, so that there is no gap between the revocation action and its enforcement.

#### Acceptance Criteria

1. THE `is_authenticated` middleware SHALL query the `User` document from MongoDB on every authenticated API request and return HTTP 401 if `is_active` is `false`. This check applies only when a valid JWT is present; unauthenticated requests are rejected before reaching the active-status check.
2. WHEN the frontend receives HTTP 401 from any authenticated API endpoint, THE System SHALL immediately clear all keys from `localStorage` and redirect the browser to `/login`.
3. WHEN the dashboard layout component mounts and on every route change, THE System SHALL call `GET /api/v1/rbac/my-access/` to verify the current user's active status and page access, and SHALL redirect to `/login` on a 401 response.
4. WHEN `GET /api/v1/rbac/my-access/` returns updated `page_access` that differs from what is stored in `localStorage`, THE System SHALL update `localStorage["user"].page_access` and re-evaluate Sidebar visibility. This update occurs only when a difference is detected during an API call response.
5. IF the revocation API call fails due to a network error, THEN THE Access_Control_Module SHALL display an error toast and SHALL NOT change the user row's displayed status.

---

### Requirement 6: Notification System for Access Events

**User Story:** As the owner/superadmin, I want to receive in-app notifications for access-related events (user created by RBAC, access granted, access revoked, new self-registration), so that I can stay informed about system access changes.

#### Acceptance Criteria

1. WHEN a managed user is created via `POST /api/v1/rbac/users/`, THE System SHALL persist an `InAppNotification` document with `event_type: "user_created"`.
2. WHEN access is granted via `POST /api/v1/rbac/users/{userId}/grant/`, THE System SHALL persist an `InAppNotification` document with `event_type: "access_granted"`.
3. WHEN access is revoked via `POST /api/v1/rbac/users/{userId}/revoke/`, THE System SHALL persist an `InAppNotification` document with `event_type: "access_revoked"`.
4. WHEN a new user self-registers via `POST /api/v1/auth/register/`, THE System SHALL persist an `InAppNotification` document with `event_type: "user_created"` and a message identifying the registrant's name and email.
5. THE In_App_Notification model SHALL accept `"user_created"`, `"access_granted"`, and `"access_revoked"` as valid `event_type` enum values.
6. WHEN the notification bell component polls or refreshes, THE System SHALL include all persisted access-related notifications (`access_granted`, `access_revoked`, `user_created`) in the notification feed visible to the owner without any additional filtering.
