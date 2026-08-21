# TheDesignSpace — All Fixes Log
**Date:** 21 August 2026
**Project:** TheDesignSpace CRM + Website (Node.js Backend + Next.js Frontend)

---

## PART 1 — Full CRUD Audit & Fix (13 Bugs)

A complete audit of every route, controller, model, and frontend service was performed. The database schema was not changed — all fixes are code only.

---

### 1.1 Critical / Startup Bugs

**Bug 1 — Wrong file in backend models (CRITICAL)**

- **File:** `backend/models/Notification.js`
- **Problem:** A TypeScript frontend file (using ES `import/export` syntax) was accidentally placed inside the backend `models/` directory. Node.js cannot execute ES module syntax — if anything ever tried to `require()` this file, the entire server would crash with `SyntaxError: Cannot use import statement in a module`.
- **Fix:** Deleted the file from the backend. The actual frontend version of this file lives correctly in `frontend/lib/notifications.ts`.

---

**Bug 2 — Duplicate route registration in services (CRITICAL)**

- **File:** `backend/routes/master_service_urls.js`
- **Problem:** Both `/:id` and `/:id/` were registered as separate route handlers for the same controller methods. Express (with non-strict routing, which is the default) treats both patterns as valid, so every single API request to `/api/v1/services/:id` executed the handler **twice**. The second execution tried to send a response after the first had already sent one, causing `Cannot set headers after they are sent` errors.
- **Fix:** Removed the duplicate `/:id/` registration. Only one `/:id` route block remains.

---

**Bug 3 — Duplicate route registration in portfolio (CRITICAL)**

- **File:** `backend/routes/portfolio_urls.js`
- **Problem:** Same double-registration issue as above — both `/:id/` and `/:id` were registered, causing every portfolio API call to run the handler twice.
- **Fix:** Removed the duplicate. Single `/:id` registration kept.

---

### 1.2 Missing Error Handling

**Bug 4 — 8 notification handlers with no try/catch**

- **File:** `backend/controllers/notification_controller.js`
- **Problem:** The following 8 handler functions had bare `await` calls with no `try/catch`:
  - `send_proposal_email`
  - `send_invoice_whatsapp`
  - `send_quotation_whatsapp`
  - `send_proposal_whatsapp`
  - `send_invoice_email`
  - `send_quotation_email`
  - `send_both_reminders`
  - `get_notification_logs`

  Any database or service error in these handlers would produce an unhandled promise rejection, giving users a generic 500 response with no useful information.

- **Fix:** All 8 handlers wrapped in `try/catch` blocks with appropriate HTTP status codes (404 when record not found, 400 for service errors, 502 for external service failures, 500 for unexpected errors).

---

### 1.3 Wrong Field Names

**Bug 5 — populate using wrong field name**

- **File:** `backend/controllers/master_service_controller.js`
- **Problem:** `ServiceAssignment` records were populated with `.populate('assigned_by', 'name')`. The `User` model does not have a field called `name` — the correct field is `full_name`. This caused every `assigned_by` object in API responses to come back as an empty `{}` object, so the UI could never display who made the assignment.
- **Fix:** Changed to `.populate('assigned_by', 'full_name')` in both `get_service_assignments` and `assign_client`.

---

**Bug 12 — Query using virtual field that doesn't exist in DB**

- **File:** `backend/controllers/client_controller.js`
- **Problem:** `get_client_detail` used `findOne({ $or: [{ _id: pk }, { id: pk }] })`. The `id` field is a **virtual** property added by Mongoose's `toJSON()` transform — it does not exist as a real stored field in MongoDB. The second branch of the `$or` could never match anything, making the query unnecessarily complex.
- **Fix:** Replaced with the simple, correct `findById(req.params.pk)`.

---

### 1.4 Missing 404 Responses

**Bug 6 — delete_quotation always returns success**

- **File:** `backend/controllers/quotation_controller.js`
- **Problem:** `Quotation.findByIdAndDelete()` returns `null` silently if the ID does not exist. The controller sent `204 No Content` regardless, so callers received a success response even when deleting a non-existent record.
- **Fix:** Now checks the return value. Returns `404 Not Found` if the result is null.

---

**Bug 9 — deleteNotification always returns success**

- **File:** `backend/controllers/in_app_notification_controller.js`
- **Problem:** Same issue — `InAppNotification.findByIdAndDelete()` return value was not checked.
- **Fix:** Returns `404` if notification not found.

---

### 1.5 Status Machine / Business Logic Bugs

**Bug 7 — send_quotation had no status guard**

- **File:** `backend/controllers/quotation_controller.js`
- **Problem:** `send_quotation` unconditionally set `status = 'sent'` with no check on the current status. This meant an `approved`, `superseded`, or `rejected` quotation could be reset back to `sent`, completely breaking the quotation workflow. The `approve_quotation` function already had a proper guard — `send_quotation` did not.
- **Fix:** Added guard: only quotations with status `draft` or `sent` can be (re)sent. Any other status returns `400 Bad Request` with a descriptive message.

---

**Bug 8 — mark_invoice_paid did not update financial fields**

- **File:** `backend/controllers/invoice_controller.js`
- **Problem:** `mark_invoice_paid` set `status = 'paid'` and saved — but never updated `amount_paid` or `balance_due`. The invoice appeared as paid in status, but the payment tracker still showed the full original amount as outstanding. Also allowed marking a `cancelled` invoice as paid.
- **Fix:** Added `cancelled` guard (returns `400`). Now explicitly sets `amount_paid = grand_total` and `balance_due = 0` before saving.

---

### 1.6 Security / Required Field Guards

**Bug 13 — created_by could be null despite model requiring it**

- **File:** `backend/controllers/master_service_controller.js`
- **Problem:** `create_service` set `created_by: req.user ? req.user._id : null`. The model schema marks `created_by` as `required: true`. If `req.user` was somehow undefined (e.g. silent middleware failure), Mongoose would throw `ValidationError: Path 'created_by' is required`. Same issue in `assign_client` with `assigned_by`.
- **Fix:** Added an explicit `if (!req.user || !req.user._id) return res.status(401)` check before the create operation. `req.user._id` is passed directly without the null fallback.

---

### 1.7 Data Leakage / Performance Bugs

**Bug 10 — Public blog showing draft posts**

- **File:** `backend/controllers/web_blog_controller.js`
- **Problem:** The public website blog endpoint (`GET /api/v1/public/blog`) had no `status: 'published'` filter. Draft blog posts that had not been published yet were fully visible to anyone visiting the website. The JavaScript `.slice()` was also used for limiting instead of a DB-level `.limit()`.
- **Fix:** Added `filter.status = 'published'` so drafts are never exposed. Moved the limit to `.limit(n)` in the Mongoose query so the database does the filtering, not JavaScript.

---

**Bug 11 — get_overview loading all records into memory**

- **File:** `backend/controllers/web_leads_controller.js`
- **Problem:** The CMS overview API fetched **all** Portfolio records, all Blog records, all Enquiries, and all Career Applications from MongoDB into Node.js memory, then used JavaScript `.slice(5)` to get only 5. On a production database with thousands of records, this would consume large amounts of memory and slow down every dashboard load.
- **Fix:** Added `.limit(5)` at the database query level on all four queries, so only 5 documents are ever fetched from MongoDB.

---

## PART 2 — Generate Invoice Modal — Price Preview

### Problem
The "Generate Invoice" popup on the client detail page (`/dashboard/clients/[id]`) showed only a percentage input box (e.g. `10`) with no indication of what rupee amount that percentage would produce. A user selecting "Advance 10%" had no way to confirm whether that meant ₹11,155 or ₹50,000 without doing the math manually.

The standalone `/invoices/generate` page already had this price preview — it was missing only from the client-detail modal.

### Fix — `frontend/app/(admin)/dashboard/clients/[id]/page.tsx`

**Live price preview for Advance / Milestone / Final types:**

The percentage input now sits in a flex row. A live preview box appears to its right showing the computed invoice amount:

```
[ 10 ]   [  Invoice Amount     ₹11,155.00  ]
```

- Reads `grand_total` from the currently selected quotation
- Updates instantly as the user types a new percentage
- Clamped to 0–100 so it cannot go negative or over 100%
- Displays nothing if no quotation is selected

**Full amount summary for Full (100%) type:**

When "Full (100%)" is selected, a summary card appears below the quotation dropdown showing the complete amount that will be invoiced:

```
Invoice Amount (100%)                 ₹1,11,550.00
Full quotation grand total
```

Both use Indian number formatting (`en-IN` locale) so amounts display as `₹1,11,550.00` and not `₹111,550.00`.

---

## PART 3 — Create Quotation Modal Fixes

### Fix 1 — Category dropdown truncated ("Fu" instead of "Furniture")

**Problem:** The category `<select>` in the quotation line items grid was assigned `sm:col-span-1` — giving it only 1 out of 12 columns (~83px width). Every category name was cut off: "Furniture" appeared as "Fu", "Electrical" as "El", "Plumbing" as "Pl".

**Fix:** Changed category from `sm:col-span-1` to `sm:col-span-2`. Reduced the amount+delete column from `sm:col-span-2` to `sm:col-span-1` to keep the total at 12 columns.

| Column | Before | After |
|--------|--------|-------|
| Sort / # | 1 | 1 |
| Description | 4 | 4 |
| **Category** | **1 (broken)** | **2 (fixed)** |
| Qty | 1 | 1 |
| Unit | 1 | 1 |
| Rate | 2 | 2 |
| Amount + Delete | 2 | 1 |
| **Total** | **12** | **12** |

---

### Fix 2 — Discount row always showing "-₹0.00"

**Problem:** The discount row in the quotation totals section was unconditionally rendered. Even when no discount was set (0%), the form showed a red `-₹0.00` line which looked like an error to users.

**Fix:** Wrapped the discount row in a conditional `{totals.discAmt > 0 && (...)}` — it is now hidden when there is no discount. When a discount is active, the label also shows the percentage: **"Discount (10%)"** instead of just "Discount".

---

## PART 4 — Quotation Edit History — Click to Restore

### Problem
The Edit History panel (right side of the Edit Quotation modal) showed a read-only list of past changes (R1 · Latest, R2, etc.) but clicking them did nothing. Users wanted to click a history entry to restore the quotation to that earlier state, make adjustments, and save it as a new entry.

### Fix — `frontend/app/(admin)/dashboard/clients/[id]/page.tsx`

**How it works:**

1. User opens Edit Quotation for an existing quotation — the history panel appears on the right.
2. History entries show as R1 (oldest), R2, R3 · Latest (newest).
3. User clicks any history card — the card highlights with a gold border and a **"Restored"** badge.
4. The edit form on the left is instantly populated with that snapshot's values: project, discount, tax rates, notes, valid date, and all line items.
5. An amber banner appears at the top of the form:
   > *Snapshot restored — edit as needed, then click Update Quotation to save it as a new history entry.*
6. User makes any changes, clicks **Update Quotation**.
7. The backend records the diff between the restored state and the new changes as the next history entry (R4, R5, etc.) — automatically, using the existing history-tracking logic.
8. If the user edits any field after restoring, the "Restored" badge disappears so they know the form is now in a modified state.

**What the backend stores (`entry.snapshot`):**

Each history entry saved by the backend contains a full snapshot of the quotation state at the time of that edit — including all scalar fields and line items. The `handleRestoreHistory` function reads this snapshot and uses it to populate all form fields.

**New state variable added:** `restoredHistoryId` — tracks which history card is currently highlighted as the active restored version.

---

## PART 5 — Invoice System Audit & Fix (18 Bugs)

A complete audit of the entire invoice system — backend service, controller, routes, and all frontend pages — was performed.

---

### 5A — Backend Fixes

#### `backend/services/invoice_service.js`

| # | Bug | Description | Fix |
|---|-----|-------------|-----|
| B4 | Missing `category` field on item copy | When generating an invoice from an approved quotation, line items were copied from the quotation but the `category` field was omitted. All invoices generated this way had blank categories on every item, affecting reports and the PDF. | Added `category: q_item.category \|\| ''` to the item mapping. |
| B10 | No duplicate invoice guard | A user could call Generate Invoice twice on the same approved quotation and create two active invoices for the same deal, double-counting revenue in the dashboard. | Added a check before creating: looks for any non-cancelled invoice already linked to the quotation. Throws a clear error if one exists: *"An active invoice (INV-...) already exists for this quotation. Cancel it first or create a copy."* |

---

#### `backend/controllers/invoice_controller.js`

| # | Bug | Description | Fix |
|---|-----|-------------|-----|
| B6 | `update_invoice` resets `balance_due` ignoring payments | When editing a invoice's line items, `balance_due` was always set to the new `grand_total`. If an invoice had `amount_paid = ₹50,000` and items were updated to a new total of ₹2,00,000, the `balance_due` became ₹2,00,000 — completely ignoring the ₹50,000 already paid. | Changed to: `balance_due = Math.max(0, grand_total - existingInvoice.amount_paid)` |
| B7 | `mark_invoice_paid` didn't update financial fields | Marking an invoice as paid only set `status = 'paid'`. The `amount_paid` stayed at 0 and `balance_due` stayed at the full amount. Dashboard totals showed incorrect values. Also allowed marking a cancelled invoice as paid. | Added guard for `cancelled` status. Now explicitly sets `amount_paid = grand_total` and `balance_due = 0`. |
| B8 | `delete_invoice` orphaned line items | Deleting an invoice did not delete the associated `InvoiceItem` records. Over time, thousands of orphaned item documents would accumulate in the database. | Added `await InvoiceItem.deleteMany({ invoice: req.params.pk })` inside the try/catch before removing the invoice. |
| F3 | `client_id` missing from invoice list response | The `get_invoices` endpoint returned `client_name` and `project_name` but not `client_id`. The invoice table's "click row to go to client page" feature (`handleRowClick`) always fell back to opening the detail panel because `inv.client_id` was always undefined. | Added `obj.client_id = inv.project?.client?._id ?? null` to the response mapping. |

---

#### `backend/services/invoice_service.js` — `generate_invoice`

| # | Bug | Description | Fix |
|---|-----|-------------|-----|
| B5 | `generate_invoice` (from quotation) had no `invoice_created` notification | The primary flow of creating an invoice from an approved quotation via `POST /invoices/generate/` called `invoiceService.generate_invoice_from_quotation()` internally — but that service function had no notification call. Only `create_invoice` (raw POST) and `create_direct_invoice` had notifications. Staff never received a bell notification when the most common invoice creation path was used. | Added `createNotification({ event_type: 'invoice_created', ... })` in the `generate_invoice` controller after the service call succeeds. |

---

### 5B — Frontend Fixes

#### `frontend/app/(admin)/dashboard/invoices/page.tsx`

| # | Bug | Description | Fix |
|---|-----|-------------|-----|
| F2 | Dead `partially_paid` status in config | `statusConfig` contained a `partially_paid` entry. This status does not exist in the backend enum — the correct value is `partial`. The status filter dropdown showed "Partial" twice (once for `partial` and once for `partially_paid`), and filtering by `partially_paid` always returned zero results. | Removed `partially_paid` from `statusConfig`. |
| F4 | "Amount Received" stat used `grand_total` instead of `amount_paid` | The stats card labelled "Amount Received" summed `grand_total` for all paid invoices. If an invoice was partially paid before being manually marked as paid, `grand_total` would overstate the actual received amount. | Changed to `.reduce((s, i) => s + parseFloat(i.amount_paid \|\| i.grand_total \|\| "0"), 0)` |
| F6 | "Balance Pending" stat excluded overdue invoices | The pending balance calculation only included `draft`, `issued`, and `partial` invoices. `overdue` invoices were excluded, understating the total amount owed. | Added `"overdue"` to the status filter in the pending balance calculation. |
| F5 | Copy modal state leaked between opens | The copy modal's Cancel button only called `setIsCopyModalOpen(false)`. The `copySourceInvoice` and `copyForm` state were never cleared. Opening the copy modal for invoice A, cancelling, then opening it for invoice B would briefly flash invoice A's data. | Created a `closeCopyModal()` function that resets `copySourceInvoice`, `copyForm`, and `isCopyModalOpen` together. All close buttons now call this. |
| F6b | Copy modal header showed hardcoded "-C1" | The modal header always read *"will create INV-2025-001-C1"* regardless of how many copies already existed. If `INV-2025-001-C1` already existed, the next copy would actually be `INV-2025-001-C2`, but the modal misleadingly showed `-C1`. | Removed the hardcoded suffix. Now reads: *"a new draft copy will be created with the next available suffix"* |
| F7 | `openCopyModal` had no loading guard | No `loading` state prevented double-clicking the Copy button from firing multiple parallel `getInvoiceById` requests. | Added `copyLoading` state. Button is disabled while loading. |
| F8 | `handleMarkPaid` and `handleSend` showed only "Failed" | Error catch blocks showed only the generic string `"Failed"`. If the backend returned a meaningful message like *"Cannot mark a cancelled invoice as paid"*, the user never saw it. | Changed to `showToast(err?.detail \|\| err?.message \|\| "Failed", "error")` |
| F14 | "Mark Paid" button missing for overdue invoices | Both the table row actions and the invoice detail panel only showed the "Mark Paid" button for `issued` and `partial` status. Overdue invoices had no quick-pay button — staff had to go to the global invoices page. The backend's `mark_invoice_paid` endpoint supports overdue invoices. | Added `inv.status === "overdue"` to the condition in both the row actions and the detail panel. |
| F15 | No Copy button in invoice detail panel | The Copy button was only in the table row actions. When viewing an invoice in the expanded detail panel, there was no way to copy it without scrolling back up to the table row. | Added a Copy button to the detail panel action buttons. |

---

#### `frontend/app/(admin)/dashboard/invoices/generate/page.tsx`

| # | Bug | Description | Fix |
|---|-----|-------------|-----|
| F9 | Could submit non-approved quotation | The Generate Invoice form showed a warning when a non-approved quotation was selected, but the Generate button remained enabled. The backend would reject it, but the UX was poor. | Added frontend validation: if the selected quotation is not `approved`, the button is disabled and a red error message explains why. |
| F10 | Fixed amount > grand total not validated | In "Fixed Amount" milestone mode, a user could enter ₹5,00,000 as the invoice amount for a ₹1,00,000 quotation. The effective percentage would exceed 100% and the backend would create an invoice worth more than the entire quotation. | Added validation: if `fixedAmount > qGrandTotal`, an error message is shown and submission is blocked. |
| F11 | Client filter fallback showed all quotations | When a client had no linked quotations, the client-filter dropdown would fall back to showing **all quotations** from every client in the system. This was misleading and a potential data leak between clients. | Removed the fallback entirely. If a client has no quotations, the dropdown shows 0 results with a clear empty state. |

---

#### `frontend/app/(admin)/dashboard/clients/[id]/page.tsx` — Invoice Section

| # | Bug | Description | Fix |
|---|-----|-------------|-----|
| F12 | `submitInvoiceEdit` used wrong service function | The invoice edit form called `updateInvoice()` with `items` passed as `as any` to bypass TypeScript. The correct function is `updateInvoiceFull()` which has the proper `items` type definition. The `as any` cast hid the type error. | Added `updateInvoiceFull` to the import list. Changed `submitInvoiceEdit` to call `updateInvoiceFull()` with correct typing. |
| F13 | Edit modal relied on `viewingInvoice` at submit time | `submitInvoiceEdit` used `viewingInvoice?.id` to know which invoice to update. If `viewingInvoice` was cleared (e.g. user navigated during the edit), submit would silently do nothing. The modal and the detail view shared state they shouldn't. | Added a dedicated `editingInvoiceId` state variable. `openInvoiceEdit(iid)` sets it. `submitInvoiceEdit` reads from `editingInvoiceId` exclusively — independent of `viewingInvoice`. |
| F16 | No quotation validation before generating invoice | The "Generate Invoice" mini-modal on the client detail page called the API even when no quotation was selected (`quotation_id = ""`), producing a backend error. | Added check: `if (!invoiceForm.quotation_id) { setInvoiceError(...); return; }` before submitting. |
| F17 | Quotation dropdown didn't group approved ones first | The quotation select in the generate invoice modal listed all quotations in a flat list. Non-approved quotations looked identical to approved ones, making it easy to accidentally select the wrong one. | Replaced with grouped `<optgroup>` — **✅ Approved** group first, then **Other (not approved)** group. |
| F18 | `invoiceStats.pending` excluded overdue invoices | The "Balance Pending" stat on the client detail invoice tab only summed `draft`, `issued`, and `partial` invoices. Overdue invoices are definitely still outstanding and must be included. | Added `"overdue"` to the filter: `["draft", "issued", "partial", "overdue"].includes(i.status)` |

---

## Summary Table — All Files Changed

| File | Changes Made |
|------|-------------|
| `backend/models/Notification.js` | Deleted (was a misplaced TypeScript frontend file) |
| `backend/routes/master_service_urls.js` | Removed duplicate `/:id/` route registration |
| `backend/routes/portfolio_urls.js` | Removed duplicate `/:id/` route registration |
| `backend/controllers/notification_controller.js` | Added try/catch to all 8 bare async handlers |
| `backend/controllers/master_service_controller.js` | Fixed `populate('full_name')`, added `req.user` guard |
| `backend/controllers/client_controller.js` | Replaced `$or` query with `findById` |
| `backend/controllers/quotation_controller.js` | Added 404 check to delete, status guard to send_quotation |
| `backend/controllers/invoice_controller.js` | Fixed balance_due calculation, mark_paid financial fields, delete orphan cleanup, added client_id to list response |
| `backend/controllers/in_app_notification_controller.js` | Added 404 check to deleteNotification |
| `backend/controllers/web_blog_controller.js` | Added published filter, DB-level limit |
| `backend/controllers/web_leads_controller.js` | Added `.limit(5)` to all 4 DB queries |
| `backend/controllers/project_controller.js` | Added `createNotification` to create and status-change actions |
| `backend/services/invoice_service.js` | Added category field to item copy, added duplicate invoice guard |
| `frontend/app/(admin)/dashboard/clients/[id]/page.tsx` | Price preview in invoice modal, category col fix, discount row conditional, history restore feature, updateInvoiceFull import, editingInvoiceId state, overdue mark-paid, copy in detail panel, quotation validation, optgroup in select, overdue in pending balance |
| `frontend/app/(admin)/dashboard/invoices/page.tsx` | Removed partially_paid, fixed stats, copy modal state reset, loading guard, error messages, mark-paid for overdue |
| `frontend/app/(admin)/dashboard/invoices/generate/page.tsx` | Non-approved guard, fixed amount validation, removed client filter fallback |

---

*End of fixes log. Total bugs found and fixed: 31*
