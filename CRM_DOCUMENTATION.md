# The Design Space — CRM System Documentation

> **Version:** 1.0 | **Last Updated:** August 2026  
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
- Requires an approved quotation
- Line items and amounts copied from quotation
- Amounts scaled by milestone percentage
- Tax rates inherited from quotation

**Option B — Direct Invoice:**
- No quotation required
- Client + Project selection
- Manual line items entry
- Tax mode selected manually (CGST+SGST / IGST / Non-GST)
- Totals calculated from entered items

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
|---|---|---|
| Draft | Full amount | Send, Edit, Delete |
| Issued | Full amount | Record Payment, Remind, Mark Paid, Edit |
| Partial | Partial amount remaining | Record Payment, Remind, Mark Paid, Edit |
| Paid | ₹0 | PDF, CSV, Email, WhatsApp |
| Overdue | Amount pending | Record Payment, Remind, Mark Paid |
| Cancelled | N/A | View only |

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

Triggered automatically on:

| Event | Notification |
|---|---|
| Quotation created | "Quotation #QUOTE-2026-003 created" |
| Quotation approved | "Quotation approved" |
| Invoice generated | "Invoice INV-2026-001 created for ₹X" |
| Invoice sent | "Invoice sent to client" |
| Invoice paid | "Payment complete" |
| Payment received | "Payment of ₹X recorded" |

### Automated Reminders (Daily Cron — 9:00 AM)

1. Find all invoices with `due_date < today` AND `status ∈ [issued, partial]`
2. Mark them as `overdue`
3. Send WhatsApp reminder to client phone
4. Send Email reminder to client email
5. Log results

### Manual Reminders

Staff can manually trigger reminders from:
- **Payment Tracker** — "Remind" button → WhatsApp or Email
- **Invoices page** — "Remind" button on each invoice

---

## 11. Known Fixes Applied

| # | Issue | Fix |
|---|---|---|
| 1 | Invoice overdue status only updated by cron (once daily) | Added real-time overdue check on every `GET /invoices/` call |
| 2 | `generate_invoice` required approved quotation — no direct invoicing | Added `POST /invoices/direct/` endpoint + `create_direct_invoice` service |
| 3 | Invoice detail had no link to source quotation | Added "Linked Quotation" button in invoice detail panel |
| 4 | `amount_paid` not recalculating after payment update | Added explicit `invoice.update_balance()` call after `update_payment` |
| 5 | Payment history panel used hardcoded API path | Fixed to use `API_BASE_URL` from config |
| 6 | Quotations required project — couldn't create for walk-in clients | Made `project` field optional in backend model and controller |
| 7 | Invoice `balance_due` could go negative | Added `Math.max(0, balance)` in `update_balance()` |
| 8 | Frontend token lookup inconsistent (`access` vs `access_token`) | Unified all token lookups to check all 3 storage keys |
| 9 | Double-counting in dashboard stats for copied invoices | Cancelled invoices excluded from totals |
| 10 | `partially_paid` status mismatch | Canonical enum is `partial`; frontend maps both for backwards compatibility |

---

## Quick Reference Card

### Invoice Lifecycle (Quick View)

```
CREATE →  draft
SEND   →  issued
PART-PAY→ partial
FULL-PAY→ paid
OVERDUE →  overdue (auto, when due_date passes)
COPY   →  new draft (original gets cancelled)
```

### Payment Entry Checklist

```
□ Select the correct invoice
□ Enter exact amount received
□ Set correct payment date
□ Choose payment mode
□ Enter reference number (UTR/UPI ID/Cheque no.)
□ Add notes if needed
□ Click "Record Payment"
□ Verify balance updates on screen
```

### Quotation to Invoice — Quick Steps

```
1. Open Client → Quotations tab
2. Ensure quotation is "Approved"
3. Click Invoices tab → Generate Invoice
4. Select "From Quotation"
5. Choose quotation from dropdown
6. Select invoice type (Advance/Full/Milestone/Final)
7. Set percentage if not Full
8. Set invoice date and due days
9. Click "Generate Invoice"
10. Invoice appears as "Draft" — click "Mark as Issued" to send
```

---

*This document covers The Design Space CRM system as built on the current codebase. For technical queries contact the development team.*
