# Design Document — About Page Enhancement

## Overview

This document describes the technical design for extending The Design Space website's About page (`/about`) with seven new content sections: Who We Are, Our Mission, Our Vision, What We Stand For (values), Industries, Team (founder hero + grid), and extended social/bio fields for team members.

The entire feature is driven by a single Mongoose singleton document (`WebAbout`, `_id: 'web_about_singleton'`). The backend exposes new sub-resource routes under `/api/v1/web-cms/about` for CMS CRUD operations, and the existing public `GET /api/v1/public/about` endpoint is extended to return all new fields. The Admin CMS page at `/dashboard/web-cms/about` gains collapsible section cards with CRUD lists. The public website renders each section with Framer Motion animations that match the existing luxury aesthetic.

**In-scope changes:**
- `backend/models/web_about.js` — schema additions
- `backend/controllers/web_cms_controller.js` — new controller methods
- `backend/routes/web_cms_urls.js` — new sub-resource routes
- `frontend/services/websiteService.ts` — new TypeScript types
- `frontend/services/webCmsService.ts` — new API helper functions
- `frontend/app/(website)/about/page.tsx` — new section rendering
- `frontend/components/website/about/` — five new components
- `frontend/app/(admin)/dashboard/web-cms/about/page.tsx` — CMS UI additions

**Out-of-scope:** Existing fields (`narrative`, `about_slides`, `studio_gallery`, `studio_video_url`), the Services Marquee, SEO, portfolio, blog, and careers.

---

## Architecture

The feature follows the existing layered architecture of this codebase:

```
Public Website (Next.js RSC)          Admin CMS (Next.js Client Component)
        │                                          │
        │ SSR fetch (revalidate: 60s)              │ authed REST calls
        ▼                                          ▼
 GET /api/v1/public/about       PUT/POST/PATCH/DELETE /api/v1/web-cms/about/*
        │                                          │
        └─────────────┬─────────────────────────────┘
                       ▼
          web_cms_controller.js (Express)
                       │
                       ▼
          WebAbout Mongoose Model (singleton)
          MongoDB — collection: web_about
```

**Key architectural decisions:**

1. **Singleton document, sub-document arrays.** `who_we_are`, `mission`, and `vision` are embedded sub-documents (no separate collection). `values` and `industries` are embedded sub-document arrays with UUID `_id` fields, following the pattern already used for `studio_gallery` and `team_members`. This keeps all About-page data in one document and one round-trip.

2. **Selective merge on PUT.** The existing `update_about` handler merges only the keys present in the request body. New singleton sections (`who_we_are`, `mission`, `vision`) follow the same `if (key) doc.key = {...doc.key.toObject(), ...key}` merge pattern, so callers can save a single section card without affecting others.

3. **Sub-resource routes for CRUD arrays.** Values and industries use dedicated sub-resource routes (`/about/values`, `/about/industries`) rather than passing the entire array via the singleton PUT. This avoids accidental full-array overwrites and mirrors the existing team member sub-routes (`/about/team/:memberId`).

4. **Published-only filter at query time.** The `get_about` public handler applies `is_published: true` and `sort_order` filtering/sorting in JavaScript (array filter + sort) after loading the singleton, keeping the model simple and the filter logic in one place.

5. **TypeScript-first service layer.** All new API calls are added as typed functions in `websiteService.ts` (public reads) and `webCmsService.ts` (admin writes), matching the existing `req<T>()` helper pattern.

6. **Animation constants are not re-implemented.** The `EASE` cubic-bezier `[0.16, 1, 0.3, 1]` and `viewport={{ once: true, margin: "-10% 0px" }}` are already defined in `FadeIn`, `SplitText`, and `RevealImage`. New components reuse those existing components rather than declaring local variants.

---

## Components and Interfaces

### Backend Routes (additions to `web_cms_urls.js`)

```
// Singleton sections (who_we_are / mission / vision via existing PUT /about)
// No new route needed — handled by extending update_about handler

// Values sub-resource
POST   /api/v1/web-cms/about/values                 → add_value
PATCH  /api/v1/web-cms/about/values/:valueId        → update_value
DELETE /api/v1/web-cms/about/values/:valueId        → delete_value

// Industries sub-resource
POST   /api/v1/web-cms/about/industries             → add_industry
PATCH  /api/v1/web-cms/about/industries/:industryId → update_industry
DELETE /api/v1/web-cms/about/industries/:industryId → delete_industry

// Team sub-resource (extended fields added to existing handlers)
POST   /api/v1/web-cms/about/team                   → add_team_member (extended)
PATCH  /api/v1/web-cms/about/team/:memberId         → update_team_member (extended)
DELETE /api/v1/web-cms/about/team/:memberId         → delete_team_member (unchanged)
```

All routes inherit the `router.use(is_authenticated, is_manager_or_above)` guard already applied to the entire `web_cms_urls.js` router. No additional per-route middleware is needed.

### Backend Controller Methods (additions to `web_cms_controller.js`)

| Method | Route | Description |
|---|---|---|
| `update_about` (extended) | `PUT /about` | Merges `who_we_are`, `mission`, `vision` in addition to existing fields |
| `add_value` | `POST /about/values` | Appends UUID-keyed `Value_Item` to `doc.values` |
| `update_value` | `PATCH /about/values/:valueId` | Partial-updates a `Value_Item` by `_id` |
| `delete_value` | `DELETE /about/values/:valueId` | Removes `Value_Item`, returns 204 |
| `add_industry` | `POST /about/industries` | Appends UUID-keyed `Industry_Item` to `doc.industries` |
| `update_industry` | `PATCH /about/industries/:industryId` | Partial-updates an `Industry_Item` |
| `delete_industry` | `DELETE /about/industries/:industryId` | Removes `Industry_Item`, returns 204 |
| `add_team_member` (extended) | `POST /about/team` | Accepts `is_founder`, `bio`, `social_instagram`, `social_linkedin` |
| `update_team_member` (extended) | `PATCH /about/team/:memberId` | Updates extended fields when present |

### Public Endpoint Response Shape (`GET /api/v1/public/about`)

The existing `get_about` handler is extended to filter and sort before returning:

```json
{
  "id": "web_about_singleton",
  "narrative": { "philosophy_title": "...", "story_para_one": "...", "story_para_two": "...", "hero_image": "..." },
  "about_slides": [...],
  "studio_gallery": [...],
  "studio_video_url": "...",
  "who_we_are": { "title": "...", "body": "...", "background_image": "" },
  "mission": { "title": "...", "body": "..." },
  "vision": { "title": "...", "body": "..." },
  "values": [
    { "id": "uuid", "icon": "✦", "title": "...", "description": "...", "sort_order": 0 }
  ],
  "industries": [
    { "id": "uuid", "name": "...", "icon_url": "...", "description": "...", "sort_order": 0, "is_published": true }
  ],
  "team_members": [
    {
      "id": "uuid", "name": "...", "designation": "...", "avatar_url": "...", "sort_order": 0,
      "is_founder": false, "bio": "", "social_instagram": "", "social_linkedin": ""
    }
  ]
}
```

`industries` contains **only `is_published: true` entries**, sorted by `sort_order` ascending. `values` is sorted by `sort_order` ascending. Both filters/sorts are applied in the controller before returning the JSON response.

### Frontend Service Layer

**`frontend/services/websiteService.ts` — new type exports and extended types:**

```typescript
// New types
export type ValueItem = {
  id: string;
  icon: string;
  title: string;
  description: string;
  sort_order: number;
};

export type IndustryItem = {
  id: string;
  name: string;
  icon_url: string;
  description: string;
  sort_order: number;
  is_published: boolean;
};

// Extended TeamMember
export type TeamMember = {
  id: string;
  name: string;
  designation: string;
  avatar_url: string;
  sort_order: number;
  is_founder: boolean;   // new
  bio: string;           // new
  social_instagram: string; // new
  social_linkedin: string;  // new
};

// Extended WebAbout
export type WebAbout = {
  id: string;
  narrative: { philosophy_title: string; story_para_one: string; story_para_two: string; hero_image: string };
  about_slides: HeroSlide[];
  studio_gallery: { id: string; file_url: string; caption: string; sort_order: number }[];
  studio_video_url: string;
  who_we_are: { title: string; body: string; background_image: string }; // new
  mission: { title: string; body: string };                               // new
  vision: { title: string; body: string };                                // new
  values: ValueItem[];                                                     // new
  industries: IndustryItem[];                                              // new
  team_members: TeamMember[];
};
```

**`frontend/services/webCmsService.ts` — new API helpers:**

```typescript
// Values
export const addValue = (data: Partial<ValueItem>) =>
  req<WebAbout>(`${CMS_URL}/about/values`, { method: 'POST', body: JSON.stringify(data) });
export const updateValue = (id: string, data: Partial<ValueItem>) =>
  req<WebAbout>(`${CMS_URL}/about/values/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteValue = (id: string) =>
  req<void>(`${CMS_URL}/about/values/${id}`, { method: 'DELETE' });

// Industries
export const addIndustry = (data: Partial<IndustryItem>) =>
  req<WebAbout>(`${CMS_URL}/about/industries`, { method: 'POST', body: JSON.stringify(data) });
export const updateIndustry = (id: string, data: Partial<IndustryItem>) =>
  req<WebAbout>(`${CMS_URL}/about/industries/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteIndustry = (id: string) =>
  req<void>(`${CMS_URL}/about/industries/${id}`, { method: 'DELETE' });
```

The `ValueItem` and `IndustryItem` imports in `webCmsService.ts` come from `websiteService.ts`, keeping types co-located with the public API shape.

### Frontend Component Tree

New components under `frontend/components/website/about/`:

```
frontend/components/website/about/
├── ServicesMarquee.tsx          (existing — unchanged)
├── WhoWeAreSection.tsx          (new)
├── MissionVisionSection.tsx     (new — renders both Mission and Vision)
├── ValuesSection.tsx            (new)
├── IndustriesSection.tsx        (new)
└── FounderCard.tsx              (new)
```

**Component responsibilities:**

| Component | Props | Key behavior |
|---|---|---|
| `WhoWeAreSection` | `data: WebAbout['who_we_are']` | Renders `SplitText` heading, `FadeIn` body, optional parallax background via `useScroll`/`useTransform` |
| `MissionVisionSection` | `mission: WebAbout['mission']`, `vision: WebAbout['vision']`, `variant: 'mission' \| 'vision'` | Reusable section for both Mission and Vision; same layout, `SplitText` + `FadeIn`; rendered twice from the page |
| `ValuesSection` | `values: ValueItem[]` | Staggered grid of value cards with `MagneticButton`-style hover; `FadeIn` with incremental delays |
| `IndustriesSection` | `industries: IndustryItem[]` | Staggered tile grid; empty-state when array is empty |
| `FounderCard` | `founder: TeamMember` | Full-width asymmetric layout; `RevealImage` for avatar; `SplitText` for name; social link icons |

All five components are Client Components (`"use client"`) because they use Framer Motion hooks (`useScroll`, `useTransform`, `useRef`). The parent `AboutPage` is a Server Component that fetches data once and passes it down as props.

**Page-level composition in `frontend/app/(website)/about/page.tsx`:**

```tsx
// After existing sections (hero, narrative, gallery, team)
{whoWeAre.title && whoWeAre.body && <WhoWeAreSection data={whoWeAre} />}
{mission.title && mission.body && <MissionVisionSection mission={mission} variant="mission" />}
{vision.title && vision.body && <MissionVisionSection vision={vision} variant="vision" />}
{values.length > 0 && <ValuesSection values={values} />}
<IndustriesSection industries={industries} />
{/* Team section: split founder from grid */}
{founder && <FounderCard founder={founder} />}
{nonFounderTeam.length > 0 && <TeamGrid members={nonFounderTeam} />}
```

The team render logic in the page:
```typescript
const founder = team.find(m => m.is_founder) ?? null;
const nonFounderTeam = team.filter(m => !m.is_founder);
// Fallback: if no founder, render all in grid (existing behavior)
```

---

## Data Models

### `web_about.js` — Schema additions

```javascript
// ── Who We Are sub-document (new)
const whoWeAreSchema = new mongoose.Schema(
  {
    title:            { type: String, default: '', maxLength: 200 },
    body:             { type: String, default: '' },
    background_image: { type: String, default: '' },
  },
  { _id: false }
);

// ── Mission sub-document (new)
const missionSchema = new mongoose.Schema(
  {
    title: { type: String, default: '', maxLength: 200 },
    body:  { type: String, default: '' },
  },
  { _id: false }
);

// ── Vision sub-document (new) — identical shape to mission
const visionSchema = new mongoose.Schema(
  {
    title: { type: String, default: '', maxLength: 200 },
    body:  { type: String, default: '' },
  },
  { _id: false }
);

// ── Value item sub-document (new)
const valueItemSchema = new mongoose.Schema(
  {
    _id:         { type: String, default: uuidv4 },
    icon:        { type: String, default: '' },
    title:       { type: String, default: '', maxLength: 200 },
    description: { type: String, default: '' },
    sort_order:  { type: Number, default: 0 },
  },
  {
    _id: true,
    toJSON: {
      transform: (doc, ret) => { ret.id = ret._id; delete ret._id; },
    },
  }
);

// ── Industry item sub-document (new)
const industryItemSchema = new mongoose.Schema(
  {
    _id:         { type: String, default: uuidv4 },
    name:        { type: String, required: true, maxLength: 200 },
    icon_url:    { type: String, default: '' },
    description: { type: String, default: '' },
    sort_order:  { type: Number, default: 0 },
    is_published:{ type: Boolean, default: false },
  },
  {
    _id: true,
    toJSON: {
      transform: (doc, ret) => { ret.id = ret._id; delete ret._id; },
    },
  }
);

// ── teamMemberSchema — extended with new fields
const teamMemberSchema = new mongoose.Schema(
  {
    _id:              { type: String, default: uuidv4 },
    name:             { type: String, required: true, maxLength: 200 },
    designation:      { type: String, default: '', maxLength: 200 },
    avatar_url:       { type: String, default: '' },
    sort_order:       { type: Number, default: 0 },
    is_founder:       { type: Boolean, default: false },  // new
    bio:              { type: String, default: '' },       // new
    social_instagram: { type: String, default: '' },       // new
    social_linkedin:  { type: String, default: '' },       // new
  },
  {
    _id: true,
    toJSON: {
      transform: (doc, ret) => { ret.id = ret._id; delete ret._id; },
    },
  }
);

// ── webAboutSchema — new top-level fields added
who_we_are: { type: whoWeAreSchema, default: () => ({}) },
mission:    { type: missionSchema,  default: () => ({}) },
vision:     { type: visionSchema,   default: () => ({}) },
values:     [valueItemSchema],
industries: [industryItemSchema],
```

The `{ _id: false }` option on singleton sub-documents (`who_we_are`, `mission`, `vision`) prevents Mongoose from adding unnecessary `_id` fields to those embedded objects. Array sub-documents (`values`, `industries`) keep `_id: true` with the UUID default and the `id`/`_id` transform, consistent with `studio_gallery` and `team_members`.

### Admin CMS Page Structure

The CMS page at `/dashboard/web-cms/about` gains six new collapsible `<section>` cards below the existing ones. Each card follows the existing `bg-white border border-[#EDE8DF] rounded-2xl p-5 mb-6` pattern and uses the shared `inputClass`/`labelClass` constants.

**Card layout order (after existing cards):**
1. **Who We Are** — `title` input, `body` textarea, `MediaUploadField` for `background_image`; Save button calls `PUT /about` with `{ who_we_are: {...} }` only.
2. **Our Mission** — `title` input, `body` textarea; Save button calls `PUT /about` with `{ mission: {...} }` only.
3. **Our Vision** — `title` input, `body` textarea; Save button calls `PUT /about` with `{ vision: {...} }` only.
4. **What We Stand For** — sortable list of `Value_Item` entries; "Add Value" button; each item has icon/title/description inputs with `onBlur` auto-save via `PATCH /about/values/:valueId`; delete button.
5. **Industries** — list of all `Industry_Item` entries (published + unpublished); "Add Industry" button; each item has name/icon_url/description inputs with `onBlur` auto-save; `is_published` toggle switch; `MediaUploadField` for `icon_url`; delete button.
6. **Team** (existing card extended) — each member card gains: `is_founder` checkbox (gold-badged when true), `bio` textarea, `social_instagram` input, `social_linkedin` input — all `onBlur` auto-saving via `PATCH /about/team/:memberId`.

**State management in the CMS page:**
- Singleton section cards (Who We Are, Mission, Vision) hold local draft state per card; each has an independent Save button to avoid cross-section data loss.
- CRUD list sections (Values, Industries) use `data.values` / `data.industries` from the top-level `data` state and update it optimistically on API success.
- The top-level `handleSave` button retains its existing behavior (saves `narrative`, `about_slides`, `studio_gallery`, `studio_video_url`) and does not affect the new singleton sections.

### RBAC Enforcement

All write operations on new routes are automatically protected by the `router.use(is_authenticated, is_manager_or_above)` middleware applied at the top of `web_cms_urls.js`. This enforces:

- **`is_authenticated`**: Valid JWT Bearer token required; 401 returned otherwise.
- **`is_manager_or_above`**: `req.user.is_manager_or_above` must be truthy; 403 returned otherwise.

The public `GET /api/v1/public/about` endpoint is on `public_urls.js` which has no auth middleware — no change needed.

No per-route role customisation is required because the existing pattern covers the only two roles that should access the CMS (Manager and Owner/Admin).

### Framer Motion Animation System

All new sections reuse existing animation components. No new animation primitives are introduced.

**Who We Are parallax background:**

```tsx
"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function WhoWeAreSection({ data }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  // Background moves at 40% of scroll speed — slower than the page content
  const y = useTransform(scrollYProgress, [0, 1], ["-15%", "15%"]);

  return (
    <section ref={ref} className="relative overflow-hidden py-24 md:py-36">
      {data.background_image && (
        <motion.div style={{ y }} className="absolute inset-0 -z-10 scale-110">
          <img src={resolveMediaUrl(data.background_image)} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[var(--ds-bg)]/80" /> {/* overlay */}
        </motion.div>
      )}
      <div className="max-w-[1600px] mx-auto px-6 md:px-10">
        <SplitText text={data.title} as="h2" className="text-4xl md:text-6xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }} />
        <FadeIn delay={0.3} className="mt-8 max-w-2xl text-lg leading-relaxed text-[var(--ds-ink-soft)]">
          <p>{data.body}</p>
        </FadeIn>
      </div>
    </section>
  );
}
```

**Values grid stagger pattern:**

```tsx
{values.map((item, i) => (
  <FadeIn key={item.id} delay={i * 0.07}>
    <MagneticButton as="button" strength={0.2} className="text-left w-full p-6 rounded-2xl border border-[#EDE8DF] hover:border-[var(--ds-gold)] transition-colors">
      <span className="text-3xl mb-4 block">{item.icon}</span>
      <h3 className="text-lg font-medium mb-2" style={{ fontFamily: "var(--font-display)" }}>{item.title}</h3>
      <p className="text-sm text-[var(--ds-ink-soft)] leading-relaxed">{item.description}</p>
    </MagneticButton>
  </FadeIn>
))}
```

The `strength={0.2}` (vs `0.35` default) gives a subtler magnetic effect appropriate for content cards rather than navigation buttons.

**Easing constants match existing components:**
- All new `motion.*` transitions use `ease: [0.16, 1, 0.3, 1]` (same as `FadeIn`, `SplitText`, `RevealImage`)
- All `whileInView` uses `viewport={{ once: true, margin: "-10% 0px" }}`
- No new easing constants are defined

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The following properties are derived from the prework analysis. Properties about Framer Motion animation configuration, CSS visual aesthetics, and TypeScript compilation are excluded (not behaviorally testable as properties). Infrastructure-level checks (endpoint existence, schema presence) are covered by integration and smoke tests.

**Property reflection:** After reviewing all candidate properties, the following consolidations apply:
- Requirements 3.5 and 17.2 both test `values` sort order → consolidated into Property 5.
- Requirements 4.5 and 17.3 both test `industries` filter + sort → consolidated into Property 6.
- Requirements 2.1–2.3 all test the same selective-merge behavior with different keys → consolidated into Property 2.
- Requirements 10.1, 11.1, and 12.1 all test the same "non-empty data → render section" conditional → consolidated into Property 9.

---

### Property 1: Data round-trip for singleton sections

*For any* `who_we_are`, `mission`, or `vision` object with a `title` of at most 200 characters and a `body` of any length, persisting those values to the `WebAbout` singleton and then retrieving the document should return the exact same field values.

**Validates: Requirements 1.1, 1.2, 1.3**

---

### Property 2: Selective merge leaves untouched sections unchanged

*For any* pre-existing `WebAbout` document state and any `PUT /about` request body that includes only a subset of `{ who_we_are, mission, vision }`, the sections whose keys are absent from the request body SHALL retain their previous values unchanged after the save.

**Validates: Requirements 2.1, 2.2, 2.3, 2.5**

---

### Property 3: Value item array round-trip

*For any* array of `Value_Item` objects with valid `icon`, `title`, `description`, and `sort_order` fields, adding each item via `POST /about/values` and then retrieving the document should result in the `values` array containing all the added items with their field values preserved.

**Validates: Requirements 1.4, 3.1**

---

### Property 4: Partial update of Value_Item only changes specified fields

*For any* existing `Value_Item` and any subset of its updatable fields (`icon`, `title`, `description`, `sort_order`), sending `PATCH /about/values/:id` with only that subset should update exactly those fields and leave all other fields of that item unchanged.

**Validates: Requirements 3.2**

---

### Property 5: Values array in public response is sorted by sort_order ascending

*For any* `values` array containing items with arbitrary `sort_order` values, the `GET /api/v1/public/about` response should return those items in strictly non-decreasing `sort_order` order.

**Validates: Requirements 3.5, 17.2**

---

### Property 6: Public industries response contains only published items, sorted ascending

*For any* `industries` array containing a mix of `is_published: true` and `is_published: false` items with arbitrary `sort_order` values, the `GET /api/v1/public/about` response should return an `industries` array that (a) contains only items where `is_published` was `true`, and (b) is ordered by `sort_order` ascending.

**Validates: Requirements 4.5, 17.3**

---

### Property 7: Deleted item no longer appears in array

*For any* existing `Value_Item` or `Industry_Item` identified by a valid `id`, after sending the corresponding `DELETE` request, the item with that `id` should not appear in any subsequent retrieval of the `WebAbout` document.

**Validates: Requirements 3.3, 4.3**

---

### Property 8: Extended team member fields round-trip

*For any* team member with `is_founder` (boolean), `bio` (any string), `social_instagram` (any string), and `social_linkedin` (any string), persisting those values via `POST /about/team` or `PATCH /about/team/:id` and then retrieving the document should return the same values for all four extended fields.

**Validates: Requirements 1.6, 5.1, 5.2**

---

### Property 9: Sections only render when their data is non-empty

*For any* `WebAbout` response where a singleton section (`who_we_are`, `mission`, or `vision`) has both `title` and `body` as non-empty strings, the About page SHALL render the corresponding section. *For any* response where either `title` or `body` is empty or absent, the About page SHALL not render the section (no partial content).

**Validates: Requirements 10.1, 11.1, 12.1**

---

### Property 10: Values grid renders exactly as many cards as there are value items

*For any* `values` array of length N ≥ 1, the rendered "What We Stand For" section should contain exactly N value cards, each displaying the `icon`, `title`, and `description` of its corresponding item.

**Validates: Requirements 13.1**

---

### Property 11: Industries grid renders only published entries

*For any* `industries` array of length N ≥ 1 returned by the public endpoint (which already contains only published items), the rendered Industries section should contain exactly N tiles. When N = 0, the section renders an empty-state message instead of tiles.

**Validates: Requirements 14.1, 14.2**

---

### Property 12: Founder card renders above team grid when a founder exists

*For any* team array where exactly one member has `is_founder: true`, the About page should render that member's card as the `FounderCard` component above the grid of non-founder members. When no member has `is_founder: true`, all members should appear in the grid (no `FounderCard` rendered).

**Validates: Requirements 15.1, 15.3**

---

### Property 13: Social links on founder card are conditional

*For any* founder team member, if `social_instagram` is a non-empty string, the rendered `FounderCard` should include an Instagram link element. If `social_linkedin` is a non-empty string, it should include a LinkedIn link element. If either is empty, the corresponding link should not be rendered.

**Validates: Requirements 15.2**

---

## Error Handling

### Backend

| Scenario | HTTP Status | Response Body |
|---|---|---|
| `PATCH /values/:id` with non-existent `valueId` | 404 | `{ "error": "Value item not found." }` |
| `DELETE /values/:id` with non-existent `valueId` | 404 | `{ "error": "Value item not found." }` |
| `PATCH /industries/:id` with non-existent `industryId` | 404 | `{ "error": "Industry not found." }` |
| `DELETE /industries/:id` with non-existent `industryId` | 404 | `{ "error": "Industry not found." }` |
| `POST /industries` without required `name` field | 400 | Mongoose validation error message |
| `title` field exceeds 200 chars on any sub-document | 400 | Mongoose validation error message |
| Unauthenticated request to any `/web-cms/*` route | 401 | `{ "detail": "Not authorized." }` |
| Authenticated non-manager request to any `/web-cms/*` route | 403 | `{ "detail": "You do not have permission." }` |
| Mongoose save failure (network/DB error) | 500 | `{ "error": error.message }` |

All error scenarios follow the existing pattern: `res.status(N).json({ error: '...' })`. The 404 pattern mirrors `delete_team_member` and `update_team_member`.

### Frontend CMS

- Each save/add/patch/delete call is wrapped in `try/catch`.
- On success: `setToast({ message: '...', type: 'success' })`.
- On failure: `setToast({ message: getErrorMessage(e, 'Operation failed'), type: 'error' })`.
- The `Toast` component (already in `components/webcms/Toast.tsx`) is used for all feedback.
- Optimistic UI updates (removing deleted items from state) are only applied after a successful API response — no rollback needed since we wait for confirmation.

### Frontend Public Website

- The `AboutPage` server component fetches with `.catch(() => null)`.
- Each new section is guarded: `{about?.who_we_are?.title && about?.who_we_are?.body && <WhoWeAreSection ... />}`.
- If the entire `about` fetch fails, all new sections are silently omitted (the page falls back gracefully).
- Type-safe optional chaining (`?.`) prevents runtime errors from missing fields on cached/legacy document shapes.

---

## Testing Strategy

### Unit Tests

Unit tests cover specific examples, edge cases, and controller logic:

- **Backend controller** (Jest + Supertest or `mockgoose`):
  - `update_about` correctly merges `who_we_are` without touching `mission`
  - `update_about` correctly merges `mission` without touching `who_we_are`
  - `add_value` appends with UUID `_id` and returns updated document
  - `delete_value` returns 404 for unknown `valueId`
  - `get_about` (public handler) returns only `is_published: true` industries
  - `get_about` returns `values` and `industries` sorted by `sort_order`

- **Frontend components** (Vitest + React Testing Library):
  - `WhoWeAreSection` does not render when `title` or `body` is empty
  - `ValuesSection` renders N cards for an N-item array
  - `IndustriesSection` renders empty-state when `industries` is empty
  - `FounderCard` renders Instagram link when `social_instagram` is set; omits it when empty
  - About page splits team into founder + non-founders correctly

### Property-Based Tests

Property-based tests use **fast-check** (the standard PBT library for TypeScript/JavaScript). Each test runs a minimum of **100 iterations**.

Each test is tagged with a comment referencing its design property:
```
// Feature: about-page-enhancement, Property N: <property text>
```

**Properties to implement:**

| Property | Test target | fast-check arbitraries |
|---|---|---|
| P1: Data round-trip for singleton sections | Mongoose model | `fc.record({ title: fc.string({ maxLength: 200 }), body: fc.string() })` |
| P2: Selective merge leaves untouched sections unchanged | Controller merge logic (unit) | `fc.record(...)` for arbitrary section data + arbitrary omission of keys |
| P3: Value item array round-trip | Controller `add_value` | `fc.array(fc.record({ icon: fc.string(), title: fc.string({ maxLength: 200 }), ... }))` |
| P4: Partial update only changes specified fields | Controller `update_value` | `fc.record(...)` for item + `fc.subarray(...)` for field subset |
| P5: Values sorted by sort_order | `get_about` public handler filter logic | `fc.array(fc.record({ sort_order: fc.integer() }), { minLength: 1 })` |
| P6: Industries: published-only + sorted | `get_about` public handler filter logic | `fc.array(fc.record({ is_published: fc.boolean(), sort_order: fc.integer() }))` |
| P7: Deleted item not in array | Controller `delete_value` / `delete_industry` | `fc.array(...)` with random deletion target |
| P8: Extended team member fields round-trip | Controller `add_team_member` / `update_team_member` | `fc.record({ is_founder: fc.boolean(), bio: fc.string(), ... })` |
| P9: Sections render only when non-empty | React component render | `fc.record({ title: fc.oneof(fc.string({ minLength: 1 }), fc.constant('')) })` |
| P10: Values grid N cards | `ValuesSection` component | `fc.array(valueItemArb, { minLength: 1 })` |
| P11: Industries grid conditional | `IndustriesSection` component | `fc.array(industryItemArb)` (including empty) |
| P12: Founder card above grid | `AboutPage` team split logic | `fc.array(teamMemberArb)` with 0 or 1 founder |
| P13: Social links conditional | `FounderCard` component | `fc.record({ social_instagram: fc.oneof(fc.string({ minLength: 1 }), fc.constant('')) })` |

**Note on scope:** Properties P1–P8 test pure controller/model logic and are tested with mocked MongoDB (e.g., `mongodb-memory-server`) to keep cost and execution time low. Properties P9–P13 test React component rendering using `@testing-library/react` with `fast-check`. No live HTTP or live database calls in property tests.

### Integration Tests

- Full-stack smoke: `GET /api/v1/public/about` returns 200 with the expected top-level keys.
- Auth guard: `POST /api/v1/web-cms/about/values` without a token returns 401.
- Auth guard: `POST /api/v1/web-cms/about/values` with a non-manager token returns 403.
- End-to-end happy path: POST a value, verify it appears in the public endpoint response.

### TypeScript Compilation (Smoke)

Running `tsc --noEmit` on the frontend confirms that:
- `ValueItem` and `IndustryItem` are exported from `websiteService.ts`
- `WebAbout` includes the new fields
- `TeamMember` includes the extended fields
- All new components and service functions type-check correctly
