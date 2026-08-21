# The Design Space — CRM System Documentation

> **Version:** 1.1 | **Last Updated:** 21 August 2026
> **Stack:** Next.js 14 (Frontend) · Express.js + MongoDB (Backend) · Cloudinary (Media)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [CRM Flow — Non-Technical Guide](#2-crm-flow--non-technical-guide)
3. [Complete Business Flow Diagram](#3-complete-business-flow-diagram)
4. [Module Reference](#4-module-reference)
   - 4.1 [Clients](#41-clients)
   - 4.2 [Projects](#42-projects)
   - 4.3 [Proposals](#43-proposals)
   - 4.4 [Quotations](#44-quotations)
   - 4.5 [Invoices](#45-invoices)
   - 4.6 [Payments](#46-payments)
   - 4.7 [Payment Tracker](#47-payment-tracker)
5. [Status Reference Tables](#5-status-reference-tables)
6. [Real-Time Flows](#6-real-time-flows)
7. [API Endpoint Reference](#7-api-endpoint-reference)
8. [Database Models](#8-database-models)
9. [Roles & Permissions](#9-roles--permissions)
10. [Notifications & Reminders](#10-notifications--reminders)
11. [Known Fixes Applied](#11-known-fixes-applied)

---

## 1. System Overview

The Design Space CRM is a full-stack business management system built for an interior design studio. It manages the complete client lifecycle — from initial enquiry to final payment.

### Architecture

```
Browser (Next.js)
    ↓ HTTPS
Express.js API  (api.thedesignspace.in/api/v1)
    ↓
MongoDB Atlas   (cloud database)
    ↓
Cloudinary      (media/file storage)
```

### Key URLs

| Environment | Frontend | Backend API |
|---|---|---|
| Production | `https://thedesignspace.in` | `https://api.thedesignspace.in/api/v1` |
| Local Dev | `http://localhost:3000` | `http://localhost:5000/api/v1` |

---

## 2. CRM Flow — Non-Technical Guide

### The Complete Client Journey (Simple Version)

```
1. CLIENT ADDED
   → Staff enters client name, phone, email, address

2. PROJECT CREATED
   → Linked to client: property type, area, budget, timeline

3. PROPOSAL SENT
   → Design proposal document created from template or manually
   → Sent to client via Email / WhatsApp
   → Client accepts/rejects

4. QUOTATION RAISED
   → Detailed price breakdown created with line items
   → Approved by manager
   → Sent to client

5. INVOICE GENERATED
   → From approved quotation (advance / milestone / full / final)
   → OR directly without quotation (manual billing)

6. PAYMENT RECORDED
   → Client pays (full or partial)
   → System auto-updates balance due
   → Status: Partial → Paid

7. DONE ✓
   → Project completed, all payments received
```

### Who Uses What

| Role | What They Do |
|---|---|
| **Owner** | Full access — all modules, settings, user management |
| **Manager** | Create/approve quotations, generate invoices, manage clients |
| **Designer** | View clients, projects, proposals; cannot touch financials |
| **Accountant (Finance)** | View/manage invoices and payments only |

---

## 3. Complete Business Flow Diagram

```
ENQUIRY (Website Contact Form)
    │
    ▼
CLIENT PROFILE CREATED
    │
    ├──► PROJECT ADDED
    │         │
    │         ├──► PROPOSAL (optional)
    │         │         │
    │         │         └── Status: draft → sent → accepted/rejected
    │         │
    │         └──► QUOTATION
    │                   │
    │              Status: draft → sent → approved → superseded
    │                   │
    │                   ▼
    │              INVOICE GENERATED
    │              (Full / Advance / Milestone / Final)
    │                   │
    │              Status: draft → issued → partial → paid
    │                   │              ↗        ↑
    │                   │         overdue ──────┘
    │                   │
    │                   ▼
    │           PAYMENT RECORDED
    │           (Bank / UPI / Cheque / Cash / NEFT)
    │                   │
    │           Auto-calculates balance
    │           Auto-updates invoice status
    │
    └──► DIRECT INVOICE (no quotation needed)
              │
              └── Same payment flow as above
```

---

## 4. Module Reference

---

### 4.1 Clients

**What it is:** The master record for every client. All projects, proposals, quotations and invoices are linked to a client.

**Fields:**

| Field | Description | Required |
|---|---|---|
| Full Name | Client's full name | ✅ |
| Phone | Primary contact number | ✅ |
| Email | Email address | ❌ |
| Billing Address | Address for invoices | ✅ |
| Site Address | Property/site location | ❌ |
| GSTIN | GST number (for GST invoices) | ❌ |
| Client Type | residential / corporate / builder / vendor / other | ❌ |
| Lead Source | How they found us (referral / instagram / walk-in / etc.) | ❌ |

**Where to find it:** Dashboard → Clients

**Operations:**
- Create new client
- Edit client details
- View all projects, proposals, quotations, invoices for a client
- Delete client

---

### 4.2 Projects

**What it is:** A specific design project linked to a client. Multiple projects can exist per client (e.g., Residence + Office).

**Fields:**

| Field | Description |
|---|---|
| Name | Project name (e.g., "Raipur Villa — Phase 1") |
| Property Type | apartment / villa / office / commercial |
| Style Category | modern / classical / contemporary / etc. |
| Area (sq.ft) | Project area in square feet |
| Budget | Estimated budget in ₹ |
| Start Date | Project start date |
| End Date | Expected completion date |
| Status | active / completed / on_hold |
| Notes | Internal notes |

**Where to find it:** Dashboard → Clients → [Client Name] → Projects tab

---

### 4.3 Proposals

**What it is:** A written design proposal document sent to the client before formal quotation. Can be created from templates.

**Flow:**
```
Draft → Sent → Accepted
                    ↘ Rejected
```

**Key Features:**
- **Templates:** Reusable proposal formats with variables like `{{client_name}}`, `{{project_name}}`
- **Send via:** Email or WhatsApp
- **Download:** PDF or CSV
- **Edit:** Can be revised after creation

**Where to find it:** Dashboard → Clients → [Client] → Proposals tab

---

### 4.4 Quotations

**What it is:** A formal price quotation with line items, taxes, and discounts. Must be **Approved** before an invoice can be generated from it.

#### 4.4.1 Quotation Statuses

| Status | Meaning | What Can You Do |
|---|---|---|
| **Draft** | Just created, not sent | Edit, Send, Approve, Delete |
| **Sent** | Sent to client | Approve, Reject |
| **Approved** | Client accepted | Generate Invoice, Revise |
| **Rejected** | Client declined | Revise (creates new version) |
| **Superseded** | Replaced by a revised/copied version | View only |

#### 4.4.2 Quotation Numbering

```
Format: #QUOTE-{YEAR}-{SEQ} v{VERSION}
Example: #QUOTE-2026-003 v1

Copy suffix:  #QUOTE-2026-003-C1  (first copy)
              #QUOTE-2026-003-C2  (second copy)

Revised:      Creates a new quotation with incremented version number
```

#### 4.4.3 Financial Calculations

```
Subtotal       = Sum of (Qty × Rate) for all line items
Discount       = Fixed amount OR Percentage of Subtotal
Taxable Amount = Subtotal − Discount
CGST           = Taxable × CGST% (for intra-state)
SGST           = Taxable × SGST% (for intra-state)
IGST           = Taxable × IGST% (for inter-state/outstation)
Grand Total    = Taxable Amount + All Taxes
```

#### 4.4.4 Tax Modes

| Mode | When to Use |
|---|---|
| **CGST + SGST** | Client is in same state (Chhattisgarh) |
| **IGST** | Client is in different state (outstation) |
| **Non-GST** | Unregistered billing / no GST applicable |

#### 4.4.5 Creating Without Project

Quotations can be created **without a project** — select "— No Project —" in the project dropdown. Useful for walk-in clients or quick estimates.

#### 4.4.6 Edit History & Restore

Every time a quotation is updated (PUT), the system automatically saves a history entry recording exactly what changed — which fields, old value vs new value.

**Viewing history:**
- Open any existing quotation for edit
- Click the **History** button in the modal header — a panel slides in on the right
- Each entry is labelled R1 (oldest) through R*n* · Latest (most recent)
- Each entry shows the changed fields with before/after values highlighted in red/green

**Restoring a previous version:**
- Click any history card — it highlights with a gold border and shows a **"Restored"** badge
- The edit form is instantly populated with that version's values (project, discount, tax rates, notes, all line items)
- An amber banner appears: *"Snapshot restored — edit as needed, then click Update Quotation"*
- Make any adjustments, then click **Update Quotation**
- The system saves the new state and records it as the next history entry (R3, R4, etc.) automatically

**Where to find it:** Dashboard → Quotations (global list) OR Clients → [Client] → Quotations tab

---

### 4.5 Invoices

**What it is:** A billing document sent to the client requesting payment. Can be generated from an approved quotation or created directly.

#### 4.5.1 Invoice Types

| Type | Description | Default % |
|---|---|---|
| **Full (100%)** | Complete invoice for entire amount | 100% |
| **Advance** | Booking advance payment | 10% |
| **Milestone** | Partial payment for a project phase | 20% |
| **Final** | Last payment at project handover | 20% |

> **Note:** For Advance/Milestone/Final — the percentage is applied to the quotation's Grand Total.

#### 4.5.2 Invoice Statuses

| Status | Meaning | Color |
|---|---|---|
| **Draft** | Created, not sent to client | Grey |
| **Issued** | Sent/issued to client | Blue |
| **Partial** | Some payment received, balance pending | Amber |
| **Paid** | Fully paid | Green |
| **Overdue** | Due date passed, not fully paid | Red |
| **Cancelled** | Cancelled (e.g., replaced by a copy) | Grey |

#### 4.5.3 Invoice Status Auto-Transitions

```
When payment is recorded:
  If balance_due = 0        → status = "paid"
  If amount_paid > 0        → status = "partial"
  If amount_paid = 0        → status = "issued" (unchanged)

When due_date passes (real-time check on every invoice list fetch):
  If status = "issued" or "partial" AND due_date < today → status = "overdue"

Also runs daily at 9:00 AM via cron job.
```

#### 4.5.4 Invoice Numbering

```
Format: INV-{YEAR}-{SEQ}
Example: INV-2026-001

Copy suffix: INV-2026-001-C1 (copy of invoice 001)
```

#### 4.5.5 Two Ways to Generate an Invoice

**Option A — From Quotation:**
- Requires an approved quotation (system blocks submission if quotation is not approved)
- Line items and amounts copied from quotation (including category field)
- Amounts scaled by milestone percentage
- Tax rates inherited from quotation
- System prevents creating a duplicate invoice for the same quotation — if an active invoice already exists, a clear error is shown
- **Price preview shown live:** as you type the percentage (e.g. 30%), the exact rupee amount is shown immediately next to the input so you know what will be invoiced before submitting

**Option B — Direct Invoice:**
- No quotation required
- Client + Project selection
- Manual line items entry
- Tax mode selected manually (CGST+SGST / IGST / Non-GST)
- Milestone percentage field is shown and editable for non-Full invoice types
- Totals calculated from entered items

#### 4.5.6 Copy & Edit Invoice

Any draft, issued, or overdue invoice can be **copied**:

- A new draft invoice is created with a copy suffix (`INV-2026-001-C1`, then `C2`, etc.)
- The original invoice is automatically **cancelled** (so it stops counting in totals)
- The copy opens pre-filled with all original line items, dates, and notes — you can edit before saving
- Cannot copy an invoice that has payments already recorded (to protect payment history)

#### 4.5.7 Invoice Actions by Status

| Status | Available Actions |
|--------|-------------------|
| Draft | Edit, Mark as Issued, Copy, PDF, Delete |
| Issued | Record Payment, Mark as Paid, Remind, Edit, Copy, PDF, Email, WhatsApp |
| Partial | Record Payment, Mark as Paid, Remind, Edit, PDF, Email, WhatsApp |
| **Overdue** | **Record Payment, Mark as Paid**, Remind, Edit, PDF |
| Paid | PDF, CSV, Email, WhatsApp |
| Cancelled | View only |

> **Note (v1.1):** Mark as Paid and Copy are now available from both the table row AND the invoice detail panel. Previously they were only in the row buttons.

**Where to find it:** Dashboard → Invoices → "Generate Invoice" button

---

### 4.6 Payments

**What it is:** Individual payment records against an invoice. Multiple payments can be recorded per invoice (for partial payments).

#### 4.6.1 Payment Fields

| Field | Description | Required |
|---|---|---|
| Invoice | Which invoice this payment is for | ✅ |
| Amount Paid | Payment amount in ₹ | ✅ |
| Payment Date | Date of payment | ✅ |
| Payment Mode | Bank Transfer / UPI / Cheque / Cash / NEFT / Other | ✅ |
| Reference Number | UTR / UPI ID / Cheque number | ❌ |
| Notes | Internal remarks | ❌ |

#### 4.6.2 Payment Modes

| Mode | Examples |
|---|---|
| Bank Transfer | NEFT, RTGS, IMPS |
| UPI | GPay, PhonePe, Paytm |
| Cheque | Physical cheque |
| Cash | Physical cash |
| NEFT / RTGS | Bank wire transfers |
| Other | Any other method |

#### 4.6.3 What Happens When a Payment is Recorded

```
1. Payment saved to database
2. post('save') hook fires automatically
3. System sums ALL payments for that invoice
4. Calculates: balance_due = grand_total - total_paid
5. Updates invoice:
   - amount_paid = total collected
   - balance_due = remaining amount
   - status = auto-updated (paid / partial / issued)
```

**Where to find it:** 
- Dashboard → Payments → "Record Payment" button
- Dashboard → Invoices → Click any invoice → "Record Payment" button
- Dashboard → Clients → [Client] → Invoices tab → Click invoice → "Record Payment"

---

### 4.7 Payment Tracker

**What it is:** A dedicated page showing all active invoices with their payment status, balance due, and quick actions.

#### 4.7.1 What You See

| Column | Description |
|---|---|
| Invoice # | Invoice number |
| Client / Project | Client name and project |
| Total | Invoice grand total |
| Paid | Amount received so far |
| Balance | Outstanding amount |
| Status | Current payment status |
| Actions | Record Payment / View History / Send Reminder |

#### 4.7.2 Summary Panel

Clicking **"Summary"** shows:
- Collection breakdown by payment mode (Bank Transfer, UPI, Cash, etc.) with bar chart
- Invoice counts and amounts by status (Paid, Partial, Issued, Overdue)

#### 4.7.3 Reminders

For Overdue, Partial, or Issued invoices — send reminder via:
- **WhatsApp** (via WhatsApp Business API)
- **Email** (via Gmail SMTP)

**Where to find it:** Dashboard → Payments (sidebar)

---

## 5. Status Reference Tables

### Invoice Status Summary

| Status | Balance? | Actions Available |
|--------|----------|-------------------|
| Draft | Full amount | Send (Mark Issued), Edit, Copy, Delete |
| Issued | Full amount | Record Payment, Remind, Mark Paid, Edit, Copy |
| Partial | Partial remaining | Record Payment, Remind, Mark Paid, Edit |
| Paid | ₹0 | PDF, CSV, Email, WhatsApp |
| Overdue | Amount pending | Record Payment, Remind, **Mark Paid** |
| Cancelled | N/A | View only |

> **v1.1 change:** Overdue invoices now show a "Mark as Paid" button directly — previously only possible from the global Invoices page.

### Quotation Status Summary

| Status | Can Generate Invoice? | Can Edit? |
|---|---|---|
| Draft | ❌ | ✅ |
| Sent | ❌ | ✅ |
| Approved | ✅ | ❌ (must Revise) |
| Rejected | ❌ | ❌ (must Revise) |
| Superseded | ❌ | ❌ |

### Proposal Status Summary

| Status | Next Action |
|---|---|
| Draft | Mark as Sent |
| Sent | Mark Accepted or Rejected |
| Accepted | Create Quotation |
| Rejected | Create revised Proposal |

---

## 6. Real-Time Flows

### 6.1 Payment → Invoice Auto-Update Flow

```
Staff clicks "Record Payment"
    │
    ▼
RecordPaymentModal opens
    │
    ▼
Staff fills: Amount, Date, Mode, Reference
    │
    ▼
POST /api/v1/payments/
    │
    ▼
PaymentRecord saved to DB
    │
    ▼ (Mongoose post-save hook fires automatically)
    │
    ▼
Invoice.update_balance() called
    │
    ├── Aggregates all payments for this invoice
    ├── Calculates new balance_due
    ├── Determines new status (paid / partial / issued)
    └── Updates invoice in DB
    │
    ▼
Frontend refreshes invoice list
    │
    ▼
Updated status / balance visible immediately
```

### 6.2 Overdue Status Auto-Update

```
Trigger 1: Every GET /invoices/ request
    └── Runs updateMany({ due_date < today, status in [issued, partial] }, overdue)

Trigger 2: Daily cron job at 9:00 AM
    └── Same query + sends WhatsApp/Email reminders

Trigger 3: Dashboard page load
    └── Same overdue update query
```

### 6.3 Invoice Generation from Quotation

```
Staff selects approved quotation
    │
    ▼
Chooses: Type (Full/Advance/Milestone/Final)
Chooses: Percentage (e.g., 10% for advance)
Sets: Invoice Date, Due Days, Notes
    │
    ▼
POST /api/v1/invoices/generate/
    │
    ▼
Backend finds quotation
Validates: status === "approved"
    │
    ▼
Scales all amounts by percentage:
  subtotal = quotation.subtotal × (pct/100)
  taxes    = quotation.tax_amounts × (pct/100)
  grand    = taxable + taxes
    │
    ▼
Copies line items with scaled rates
    │
    ▼
Invoice created as "draft"
    │
    ▼
Staff clicks "Mark as Issued" → client is billed
```

---

## 7. API Endpoint Reference

### Clients

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/clients/` | List all clients | Manager+ |
| POST | `/clients/` | Create client | Manager+ |
| GET | `/clients/:id/` | Client detail | Auth |
| PUT | `/clients/:id/` | Update client | Manager+ |
| DELETE | `/clients/:id/` | Delete client | Manager+ |
| GET | `/clients/:id/projects/` | Client's projects | Auth |
| POST | `/clients/:id/projects/` | Create project | Manager+ |

### Quotations

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/quotations/` | List quotations | Auth |
| POST | `/quotations/` | Create quotation | Manager+ |
| GET | `/quotations/:id/` | Quotation detail | Auth |
| PUT | `/quotations/:id/` | Update quotation | Manager+ |
| DELETE | `/quotations/:id/` | Delete quotation | Manager+ |
| POST | `/quotations/:id/approve/` | Approve quotation | Manager+ |
| POST | `/quotations/:id/send/` | Mark as sent | Manager+ |
| POST | `/quotations/:id/revise/` | Create revision | Manager+ |
| POST | `/quotations/:id/copy/` | Copy & edit | Manager+ |
| GET | `/quotations/:id/pdf/` | Download PDF | Auth |
| GET | `/quotations/:id/history/` | Edit history | Auth |
| GET | `/quotations/:id/versions/` | Version chain | Auth |

### Invoices

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/invoices/` | List invoices (+ real-time overdue check) | Finance+ |
| POST | `/invoices/generate/` | Generate from quotation | Manager+ |
| POST | `/invoices/direct/` | Direct invoice (no quotation) | Manager+ |
| GET | `/invoices/:id/` | Invoice detail | Finance+ |
| PATCH | `/invoices/:id/` | Update invoice | Finance+ |
| DELETE | `/invoices/:id/` | Delete invoice | Manager+ |
| POST | `/invoices/:id/send/` | Mark as issued | Finance+ |
| POST | `/invoices/:id/mark_paid/` | Mark as paid | Finance+ |
| POST | `/invoices/:id/copy/` | Copy invoice | Manager+ |
| GET | `/invoices/:id/pdf/` | Download PDF | Auth |

### Payments

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/payments/` | List payments | Auth |
| POST | `/payments/` | Record payment | Finance+ |
| GET | `/payments/summary/` | Collection summary | Finance+ |
| GET | `/payments/:id/` | Payment detail | Finance+ |
| PATCH | `/payments/:id/` | Update payment | Finance+ |
| DELETE | `/payments/:id/` | Delete payment | Finance+ |

---

## 8. Database Models

### Quotation Schema

```javascript
{
  _id: String (UUID),
  project: String → ref: Project (optional),
  quote_number: String,           // e.g. "QUOTE-2026-003"
  version: Number,                // starts at 1
  parent_quotation: String,       // for revision chain
  status: enum [draft, sent, approved, rejected, superseded],
  valid_until: Date,
  
  // Financial fields
  subtotal: Number,
  discount_type: enum [fixed, percentage],
  discount_value: Number,
  discount_amount: Number,
  taxable_amount: Number,
  cgst_rate: Number,
  sgst_rate: Number,
  igst_rate: Number,
  cgst_amount: Number,
  sgst_amount: Number,
  igst_amount: Number,
  total_tax: Number,
  grand_total: Number,
  
  notes: String,
  items: [QuotationItem] (virtual)
}
```

### Invoice Schema

```javascript
{
  _id: String (UUID),
  project: String → ref: Project (required),
  quotation: String → ref: Quotation (optional),
  invoice_number: String,        // e.g. "INV-2026-001"
  invoice_type: enum [full, advance, milestone, final],
  invoice_date: Date,
  due_date: Date,
  status: enum [draft, issued, partial, paid, overdue, cancelled],
  milestone_label: String,       // e.g. "Advance on Booking"
  milestone_percentage: Number,  // 10 = 10% of quotation total
  
  // Financial fields
  subtotal: Number,
  taxable_amount: Number,
  cgst_amount: Number,
  sgst_amount: Number,
  igst_amount: Number,
  total_tax: Number,
  grand_total: Number,
  amount_paid: Number,           // auto-calculated from payments
  balance_due: Number,           // auto-calculated
  
  notes: String,
  items: [InvoiceItem] (virtual)
}
```

### Payment Record Schema

```javascript
{
  _id: String (UUID),
  invoice: String → ref: Invoice (required),
  amount_paid: Number,
  payment_date: Date,
  payment_mode: enum [bank_transfer, cheque, cash, upi, neft, other],
  reference_number: String,      // UTR / cheque number / UPI ID
  notes: String
  
  // Hooks:
  // post('save') → invoice.update_balance()
  // post('findOneAndDelete') → invoice.update_balance()
}
```

---

## 9. Roles & Permissions

| Module | Owner | Manager | Designer | Accountant |
|---|---|---|---|---|
| Clients — View | ✅ | ✅ | ✅ | ✅ |
| Clients — Create/Edit | ✅ | ✅ | ❌ | ❌ |
| Projects | ✅ | ✅ | ✅ (view) | ❌ |
| Proposals | ✅ | ✅ | ✅ | ❌ |
| Quotations — View | ✅ | ✅ | ❌ | ✅ |
| Quotations — Create/Approve | ✅ | ✅ | ❌ | ❌ |
| Invoices — View | ✅ | ✅ | ❌ | ✅ |
| Invoices — Generate/Send | ✅ | ✅ | ❌ | ✅ |
| Payments — Record | ✅ | ✅ | ❌ | ✅ |
| Payments — Delete | ✅ | ✅ | ❌ | ✅ |
| Portfolio (CMS) | ✅ | ✅ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ | ❌ |
| User Management | ✅ | ✅ (pending users) | ❌ | ❌ |

---

## 10. Notifications & Reminders

### In-App Notifications

Triggered automatically on every major CRM action:

| Event | Notification Title | Trigger |
|-------|--------------------|---------|
| Client created | "New Client Added" | POST /clients/ |
| Project created | "Project Created" | POST /clients/:id/projects/ |
| Project status changed | "Project Status Updated" | PUT /clients/:id/projects/:id (status field) |
| Quotation created | "Quotation Created" | POST /quotations/ |
| Quotation approved | "Quotation Approved" | POST /quotations/:id/approve/ |
| Quotation sent | "Quotation Sent to Client" | POST /quotations/:id/send/ |
| Quotation revised | "Quotation Revised" | POST /quotations/:id/revise/ |
| Quotation rejected | "Quotation Rejected" | PUT /quotations/:id/ with status=rejected |
| Quotation copied | "Quotation Copied" | POST /quotations/:id/copy/ |
| Invoice generated | "Invoice Generated" | POST /invoices/generate/ |
| Invoice created (direct) | "Invoice Generated" | POST /invoices/direct/ |
| Invoice copied | "Invoice Copied" | POST /invoices/:id/copy/ |
| Invoice sent | "Invoice Sent" | POST /invoices/:id/send/ |
| Invoice paid | "Payment Complete" | POST /invoices/:id/mark_paid/ |
| Payment received | "Payment Received" | POST /payments/ |
| Proposal created | "Proposal Created" | POST /proposals/ |
| Proposal sent | "Proposal Sent" | PATCH /proposals/:id/status/ (sent) |
| Proposal accepted | "Proposal Accepted" | PATCH /proposals/:id/status/ (accepted) |
| Proposal rejected | "Proposal Rejected" | PATCH /proposals/:id/status/ (rejected) |
| Service created | "New Service Added" | POST /services/ |
| Portfolio entry created | "Portfolio Entry Created" | POST /portfolio/ |
| New website enquiry | "New Website Enquiry" | Public contact form |
| Career application | "New Career Application" | Public job application |
| User created | "New User Added" | POST /rbac/users/ |
| Access granted | "Access Granted" | PATCH /rbac/:id/grant |
| Access revoked | "Access Revoked" | PATCH /rbac/:id/revoke |
| Access updated | "Page Access Updated" | PATCH /rbac/:id/access |

### Notification Bell (Top Bar)

- Shows unread count badge (gold dot)
- Refreshes count automatically every 30 seconds
- Click bell → dropdown shows 10 most recent notifications
- Click any notification → marks it as read
- "Mark all as read" button clears count
- "View all notifications" → full notifications page

### Notifications Page (`/dashboard/notifications`)

Full paginated list with:
- **Filter by type:** Clients, Invoices, Quotations, Payments, Proposals, Projects, Services, Portfolio
- **Filter by read status:** All / Unread / Read
- Per-notification delete button
- Pagination (20 per page)

### Automated Reminders (Daily Cron — 9:00 AM)

1. Find all invoices with `due_date < today` AND `status ∈ [issued, partial]`
2. Mark them as `overdue`
3. Send WhatsApp reminder to client phone
4. Send Email reminder to client email
5. Log results

### Manual Reminders

Staff can manually trigger reminders from:
- **Payment Tracker** — "Remind" button → WhatsApp or Email
- **Invoices page** — "Remind" button on each invoice detail panel

---

## 11. Known Fixes Applied

This section records all bugs found and fixed. Split into **original fixes (v1.0)** and **v1.1 audit fixes** applied on 21 August 2026.

---

### v1.0 Fixes (Original)

| # | Issue | Fix |
|---|-------|-----|
| 1 | Invoice overdue status only updated by cron (once daily) | Added real-time overdue check on every `GET /invoices/` call |
| 2 | `generate_invoice` required approved quotation — no direct invoicing | Added `POST /invoices/direct/` endpoint + `create_direct_invoice` service |
| 3 | Invoice detail had no link to source quotation | Added "Linked Quotation" button in invoice detail panel |
| 4 | `amount_paid` not recalculating after payment update | Added explicit `invoice.update_balance()` call after `update_payment` |
| 5 | Payment history panel used hardcoded API path | Fixed to use `API_BASE_URL` from config |
| 6 | Quotations required project — couldn't create for walk-in clients | Made `project` field optional in backend model and controller |
| 7 | Invoice `balance_due` could go negative | Added `Math.max(0, balance)` in `update_balance()` |
| 8 | Frontend token lookup inconsistent (`access` vs `access_token`) | Unified all token lookups to check all 3 storage keys |
| 9 | Double-counting in dashboard stats for copied invoices | Cancelled invoices excluded from totals |
| 10 | `partially_paid` status mismatch | Canonical enum is `partial`; removed dead `partially_paid` alias from frontend config |

---

### v1.1 Fixes — CRUD Audit (21 August 2026)

#### Critical / Startup

| # | File | Bug | Fix |
|---|------|-----|-----|
| 1 | `backend/models/Notification.js` | TypeScript frontend file accidentally placed in backend models — would crash server on require | Deleted from backend |
| 2 | `backend/routes/master_service_urls.js` | Both `/:id` and `/:id/` registered — double handler execution on every request, causing `Cannot set headers after they are sent` | Removed duplicate `/:id/` registration |
| 3 | `backend/routes/portfolio_urls.js` | Same double-registration issue | Removed duplicate `/:id/` registration |

#### Missing Error Handling

| # | File | Bug | Fix |
|---|------|-----|-----|
| 4 | `backend/controllers/notification_controller.js` | 8 async handlers (`send_proposal_email`, `send_invoice_whatsapp`, `send_quotation_whatsapp`, `send_proposal_whatsapp`, `send_invoice_email`, `send_quotation_email`, `send_both_reminders`, `get_notification_logs`) had no try/catch | All 8 wrapped in try/catch with correct status codes |

#### Wrong Field Names / Queries

| # | File | Bug | Fix |
|---|------|-----|-----|
| 5 | `backend/controllers/master_service_controller.js` | `populate('assigned_by', 'name')` — User model field is `full_name` not `name`. `assigned_by` always returned `{}` | Changed to `populate('assigned_by', 'full_name')` |
| 6 | `backend/controllers/client_controller.js` | `get_client_detail` used `$or [{ _id: pk }, { id: pk }]` — `id` is a Mongoose virtual, not a real DB field | Replaced with `findById(pk)` |

#### Missing 404 Checks

| # | File | Bug | Fix |
|---|------|-----|-----|
| 7 | `backend/controllers/quotation_controller.js` | `delete_quotation` always returned 204 even if record didn't exist | Now checks result and returns 404 if null |
| 8 | `backend/controllers/in_app_notification_controller.js` | `deleteNotification` always returned 204 | Returns 404 if notification not found |

#### Status Machine / Business Logic

| # | File | Bug | Fix |
|---|------|-----|-----|
| 9 | `backend/controllers/quotation_controller.js` | `send_quotation` had no status guard — could reset approved/superseded quotation back to sent | Added guard: only draft or sent quotations can be sent |
| 10 | `backend/controllers/invoice_controller.js` | `mark_invoice_paid` set status=paid but never updated `amount_paid` or `balance_due`; also allowed marking cancelled invoice as paid | Added cancelled guard; now sets `amount_paid = grand_total`, `balance_due = 0` |

#### Security / Required Fields

| # | File | Bug | Fix |
|---|------|-----|-----|
| 11 | `backend/controllers/master_service_controller.js` | `created_by` and `assigned_by` could be null despite `required: true` in schema | Added `if (!req.user) return 401` guard before create |

#### Data Leakage / Performance

| # | File | Bug | Fix |
|---|------|-----|-----|
| 12 | `backend/controllers/web_blog_controller.js` | Public blog had no `status:'published'` filter — drafts visible on website; `.slice()` in JS instead of DB `.limit()` | Added published filter; moved limit to DB query |
| 13 | `backend/controllers/web_leads_controller.js` | `get_overview` fetched all Portfolio/Blog/Enquiry/Application records into memory then `.slice(5)` | Added `.limit(5)` to all 4 DB queries |

---

### v1.1 Fixes — Invoice System Audit (21 August 2026)

#### Backend

| # | File | Bug | Fix |
|---|------|-----|-----|
| 14 | `backend/services/invoice_service.js` | `generate_invoice_from_quotation` omitted `category` field when copying items from quotation — blank categories on all generated invoices | Added `category: q_item.category \|\| ''` to item map |
| 15 | `backend/services/invoice_service.js` | No duplicate invoice guard — could generate two active invoices for same quotation | Added check for existing non-cancelled invoice before creating |
| 16 | `backend/controllers/invoice_controller.js` | `update_invoice` always set `balance_due = grand_total`, ignoring existing `amount_paid` — editing line items wiped payment history from balance | Changed to `balance_due = grand_total - amount_paid` |
| 17 | `backend/controllers/invoice_controller.js` | `mark_invoice_paid` set status=paid but `amount_paid` stayed 0 and `balance_due` stayed at full amount | Now sets `amount_paid = grand_total`, `balance_due = 0` |
| 18 | `backend/controllers/invoice_controller.js` | `delete_invoice` did not delete associated `InvoiceItem` records — orphaned documents accumulated in DB | Added `InvoiceItem.deleteMany({ invoice: id })` |
| 19 | `backend/controllers/invoice_controller.js` | `get_invoices` response did not include `client_id` — row-click to client page navigation always fell back to opening detail panel | Added `obj.client_id = inv.project?.client?._id ?? null` to response |

#### Frontend — `invoices/page.tsx`

| # | Bug | Fix |
|---|-----|-----|
| 20 | Dead `partially_paid` status in `statusConfig` (not a real backend enum value) — filter returned zero results | Removed `partially_paid` from `statusConfig` |
| 21 | "Amount Received" stat summed `grand_total` of paid invoices instead of `amount_paid` | Changed to use `amount_paid` field |
| 22 | "Balance Pending" stat excluded overdue invoices | Added `"overdue"` to the pending filter |
| 23 | Copy modal Cancel button only closed modal — `copySourceInvoice` and `copyForm` state leaked to next open | Created `closeCopyModal()` that resets all copy state |
| 24 | Copy modal header hardcoded `-C1` regardless of existing copies | Removed hardcoded suffix |
| 25 | `openCopyModal` had no loading guard — double-clicks fired multiple requests | Added `copyLoading` state; Copy button disabled while loading |
| 26 | `handleMarkPaid` and `handleSend` showed only "Failed" on error — no backend error detail | Changed to show `err?.detail \|\| err?.message` |
| 27 | "Mark Paid" button not shown for overdue invoices in row or detail panel | Added `"overdue"` to the status condition |

#### Frontend — `invoices/generate/page.tsx`

| # | Bug | Fix |
|---|-----|-----|
| 28 | Could submit Generate Invoice form with a non-approved quotation — backend would reject but UX was poor | Button disabled + validation error when quotation is not approved |
| 29 | Fixed amount > grand total not validated — could generate invoice worth more than quotation | Added validation: `fixedAmount > qGrandTotal` blocks submission |
| 30 | Client filter fallback showed ALL quotations when client had none — misleading and data-leaking | Removed fallback; shows empty if client has no quotations |

#### Frontend — `clients/[id]/page.tsx`

| # | Bug | Fix |
|---|-----|-----|
| 31 | `submitInvoiceEdit` called `updateInvoice()` with `items` passed as `as any` — wrong function, type error hidden | Changed to `updateInvoiceFull()` with correct typing; added to imports |
| 32 | `submitInvoiceEdit` used `viewingInvoice?.id` at submit time — if detail view was cleared during edit, submit silently did nothing | Added `editingInvoiceId` state; set on `openInvoiceEdit(iid)`; used independently in `submitInvoiceEdit` |
| 33 | "Mark Paid" button not shown for overdue invoices (row and detail panel) | Added `\|\| inv.status === "overdue"` to both conditions |
| 34 | No Copy button in invoice detail panel — only in table row | Added Copy button to detail panel actions |
| 35 | `handleInvoiceSubmit` sent request even when no quotation was selected | Added `if (!invoiceForm.quotation_id)` validation before submit |
| 36 | Quotation select in generate invoice modal listed all quotations in a flat list | Added `<optgroup>` — Approved quotations first, others clearly labelled as "not approved" |
| 37 | `invoiceStats.pending` (client detail balance card) excluded overdue invoices | Added `"overdue"` to the filter |

---

### v1.1 UI Improvements (21 August 2026)

| # | Change | Description |
|---|--------|-------------|
| 1 | Generate Invoice modal — price preview | When selecting a milestone percentage (Advance/Milestone/Final), the exact rupee amount is now shown live next to the % input. For Full (100%), a summary card shows the full amount. Uses `en-IN` locale formatting. |
| 2 | Quotation modal — category column width | Category dropdown was showing truncated text ("Fu" instead of "Furniture"). Column span increased from 1 to 2 in the 12-column line item grid. |
| 3 | Quotation modal — discount row | Discount row now hidden when no discount is applied (was showing -₹0.00 which looked like an error). When shown, includes the percentage in the label: "Discount (10%)". |
| 4 | Quotation Edit History — Restore | History cards are now clickable. Clicking a version (R1, R2, etc.) restores that snapshot into the edit form. An amber banner confirms the restore. Editing any field clears the restore indicator. Saving creates a new history entry automatically. |

---

## Quick Reference Card

### Invoice Lifecycle (Quick View)

```
CREATE  →  draft
SEND    →  issued
PART-PAY→  partial
FULL-PAY→  paid
OVERDUE →  overdue  (auto, when due_date passes)
COPY    →  new draft (original auto-cancelled)
MARK PAID → paid (available from issued, partial, overdue)
```

### Generate Invoice — Quick Steps (From Quotation)

```
1. Open Client → Quotations tab
2. Ensure quotation status is "Approved"
3. Click Invoices tab → Generate Invoice
4. Select "From Quotation"
5. Choose quotation from dropdown (approved shown first)
6. Select invoice type (Advance / Full / Milestone / Final)
7. Set percentage — live ₹ amount preview shown next to input
8. Set invoice date and due days
9. Click "Generate Invoice"
10. Invoice appears as "Draft" — click "Mark as Issued" to send
```

### Restore Quotation History — Quick Steps

```
1. Open Client → Quotations tab → click Edit on any quotation
2. Click "History" button in modal header (top right)
3. History panel opens on the right showing R1, R2, R3 etc.
4. Click any version card — form restores to that state
5. Amber banner confirms: "Snapshot restored"
6. Edit as needed
7. Click "Update Quotation" — saved as new history entry
```

### Payment Entry Checklist

```
□ Select the correct invoice
□ Enter exact amount received
□ Set correct payment date
□ Choose payment mode
□ Enter reference number (UTR / UPI ID / Cheque no.)
□ Add notes if needed
□ Click "Record Payment"
□ Verify balance updates on screen
```

---

*This document covers The Design Space CRM system. Version 1.1 — Updated 21 August 2026.*
