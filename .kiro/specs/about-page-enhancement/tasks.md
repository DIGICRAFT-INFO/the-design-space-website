# Implementation Plan: About Page Enhancement

## Overview

Extend the existing About page with seven new content sections (Who We Are, Our Mission, Our Vision, What We Stand For, Industries, Team Founder Card, extended Team Members). The work layers in strict dependency order: data model first, then backend controller and routes, then frontend types and service helpers, then public website components, then the Admin CMS UI.

---

## Tasks

- [ ] 1. Extend the `WebAbout` Mongoose model with new sub-document schemas
  - [ ] 1.1 Add singleton sub-document schemas (`whoWeAreSchema`, `missionSchema`, `visionSchema`) to `backend/models/web_about.js`
    - Define `whoWeAreSchema` with `{ _id: false }`, fields: `title` (String, maxLength 200, default `''`), `body` (String, default `''`), `background_image` (String, default `''`)
    - Define `missionSchema` with `{ _id: false }`, fields: `title` (String, maxLength 200, default `''`), `body` (String, default `''`)
    - Define `visionSchema` identical shape to `missionSchema`, also with `{ _id: false }`
    - Add `who_we_are`, `mission`, and `vision` fields to `webAboutSchema` using `{ type: <schema>, default: () => ({}) }` pattern already used for `narrative`
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 1.2 Add `valueItemSchema` and `industryItemSchema` array sub-documents to `backend/models/web_about.js`
    - Define `valueItemSchema`: `_id` (String, default `uuidv4`), `icon` (String, default `''`), `title` (String, maxLength 200, default `''`), `description` (String, default `''`), `sort_order` (Number, default 0); `toJSON` transform to expose `id`/delete `_id` (same pattern as `galleryImageSchema`)
    - Define `industryItemSchema`: `_id` (String, default `uuidv4`), `name` (String, required, maxLength 200), `icon_url` (String, default `''`), `description` (String, default `''`), `sort_order` (Number, default 0), `is_published` (Boolean, default false); same `toJSON` transform
    - Add `values: [valueItemSchema]` and `industries: [industryItemSchema]` to `webAboutSchema`
    - _Requirements: 1.4, 1.5_

  - [ ] 1.3 Extend `teamMemberSchema` in `backend/models/web_about.js` with new fields
    - Add `is_founder` (Boolean, default false), `bio` (String, default `''`), `social_instagram` (String, default `''`), `social_linkedin` (String, default `''`) to the existing `teamMemberSchema` definition
    - Confirm the existing `toJSON` transform (id/\_id swap) still covers the new fields — no additional transform needed
    - _Requirements: 1.6, 1.7_

- [ ] 2. Extend the backend controller with new About handlers
  - [ ] 2.1 Extend `update_about` in `backend/controllers/web_cms_controller.js` to handle singleton sections
    - Destructure `who_we_are`, `mission`, `vision` from `req.body` alongside the existing `narrative`, `about_slides`, `studio_gallery`, `studio_video_url`
    - Apply selective merge for each: `if (who_we_are) doc.who_we_are = { ...doc.who_we_are.toObject(), ...who_we_are }` — same pattern used for `narrative`
    - Repeat for `mission` and `vision`
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [ ] 2.2 Extend `get_about` (public handler) in `web_cms_controller.js` to filter and sort before returning
    - After loading the singleton with `getOrCreateAbout()`, build a filtered/sorted plain object before `res.json()`
    - Filter `industries` to `is_published: true` and sort by `sort_order` ascending
    - Sort `values` by `sort_order` ascending
    - Return the rest of the document fields unchanged
    - Note: the CMS `get_about` (admin) should still return the full unsorted list so the admin sees all entries
    - _Requirements: 3.5, 4.5, 17.1, 17.2, 17.3_

  - [ ] 2.3 Add `add_value`, `update_value`, and `delete_value` controller methods to `web_cms_controller.js`
    - `add_value`: push new `Value_Item` to `doc.values` (uses `uuidv4` default from schema), return 201 with updated doc
    - `update_value`: find item via `doc.values.id(req.params.valueId)`; 404 + `{ error: 'Value item not found.' }` if missing; update only provided fields from `['icon', 'title', 'description', 'sort_order']`; save and return doc
    - `delete_value`: find item, 404 if missing, `doc.values.pull({ _id: req.params.valueId })`, save, return 204
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 2.4 Add `add_industry`, `update_industry`, and `delete_industry` controller methods to `web_cms_controller.js`
    - `add_industry`: require `name` field (400 if missing); push to `doc.industries`; return 201 with updated doc
    - `update_industry`: find via `doc.industries.id(req.params.industryId)`; 404 + `{ error: 'Industry not found.' }` if missing; update only provided fields from `['name', 'icon_url', 'description', 'sort_order', 'is_published']`; save and return doc
    - `delete_industry`: find item, 404 if missing, pull, save, return 204
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 2.5 Extend `add_team_member` and `update_team_member` in `web_cms_controller.js` with new fields
    - In `add_team_member`: destructure and persist `is_founder`, `bio`, `social_instagram`, `social_linkedin` alongside existing fields (all optional, use schema defaults when absent)
    - In `update_team_member`: add `'is_founder', 'bio', 'social_instagram', 'social_linkedin'` to the `forEach` field list that checks `req.body[f] !== undefined`
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 3. Register new sub-resource routes in `backend/routes/web_cms_urls.js`
  - [ ] 3.1 Add values and industries sub-resource routes below the existing team routes
    - `router.post('/about/values', controller.add_value);`
    - `router.route('/about/values/:valueId').patch(controller.update_value).delete(controller.delete_value);`
    - `router.post('/about/industries', controller.add_industry);`
    - `router.route('/about/industries/:industryId').patch(controller.update_industry).delete(controller.delete_industry);`
    - No new middleware needed — all inherit the existing `router.use(is_authenticated, is_manager_or_above)` guard
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3_

- [ ] 4. Update frontend TypeScript type definitions
  - [ ] 4.1 Add `ValueItem` and `IndustryItem` types to `frontend/services/websiteService.ts`
    - Export `ValueItem` type: `{ id: string; icon: string; title: string; description: string; sort_order: number }`
    - Export `IndustryItem` type: `{ id: string; name: string; icon_url: string; description: string; sort_order: number; is_published: boolean }`
    - _Requirements: 18.1, 18.2_

  - [ ] 4.2 Extend `TeamMember` and `WebAbout` types in `frontend/services/websiteService.ts`
    - Add `is_founder: boolean`, `bio: string`, `social_instagram: string`, `social_linkedin: string` fields to `TeamMember`
    - Add `who_we_are: { title: string; body: string; background_image: string }`, `mission: { title: string; body: string }`, `vision: { title: string; body: string }`, `values: ValueItem[]`, `industries: IndustryItem[]` fields to `WebAbout`
    - _Requirements: 18.3, 18.4_

- [ ] 5. Add CMS API helper functions to `frontend/services/webCmsService.ts`
  - [ ] 5.1 Add typed helper functions for Values CRUD in `webCmsService.ts`
    - Import `ValueItem` and `IndustryItem` from `websiteService`
    - `addValue(data: Partial<ValueItem>)` → `req<WebAbout>(..., POST)`
    - `updateValue(id: string, data: Partial<ValueItem>)` → `req<WebAbout>(..., PATCH)`
    - `deleteValue(id: string)` → `req<void>(..., DELETE)`
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 5.2 Add typed helper functions for Industries CRUD in `webCmsService.ts`
    - `addIndustry(data: Partial<IndustryItem>)` → `req<WebAbout>(..., POST)`
    - `updateIndustry(id: string, data: Partial<IndustryItem>)` → `req<WebAbout>(..., PATCH)`
    - `deleteIndustry(id: string)` → `req<void>(..., DELETE)`
    - _Requirements: 4.1, 4.2, 4.3_

- [ ] 6. Checkpoint — Backend and type layer complete
  - Ensure all new routes return expected shapes; verify `GET /api/v1/public/about` includes `who_we_are`, `mission`, `vision`, `values` (sorted), `industries` (published + sorted), and extended `team_members` fields.
  - Ask the user if questions arise before proceeding to frontend components.

- [ ] 7. Build new public website section components
  - [ ] 7.1 Create `frontend/components/website/about/WhoWeAreSection.tsx`
    - `"use client"` — uses `useRef`, `useScroll`, `useTransform` from Framer Motion
    - Props: `data: WebAbout['who_we_are']`
    - Render a `<section>` with `relative overflow-hidden` and `ref`; if `data.background_image` is set, render a `motion.div` with `style={{ y }}` (parallax via `useScroll` / `useTransform([0,1], ["-15%","15%"])`) as absolute inset background with a `bg-[var(--ds-bg)]/80` overlay
    - Heading via `<SplitText text={data.title} as="h2" className="text-4xl md:text-6xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }} />`
    - Body via `<FadeIn delay={0.3}>` wrapping `<p>{data.body}</p>`
    - Use `resolveMediaUrl` from `@/lib/media` for the background image `src`
    - _Requirements: 10.1, 10.2, 10.3, 16.1, 16.2, 16.4, 16.5_

  - [ ] 7.2 Create `frontend/components/website/about/MissionVisionSection.tsx`
    - `"use client"` — uses Framer Motion `whileInView`
    - Props: `data: { title: string; body: string }`, `variant: 'mission' | 'vision'`
    - Render section heading using `<SplitText>` and body using `<FadeIn delay={0.3}>`
    - Apply same layout, font scale, and spacing as `WhoWeAreSection` but without background image parallax
    - _Requirements: 11.1, 11.2, 12.1, 12.2, 16.1, 16.4, 16.5_

  - [ ] 7.3 Create `frontend/components/website/about/ValuesSection.tsx`
    - `"use client"` — uses Framer Motion via `FadeIn` and `MagneticButton`
    - Props: `values: ValueItem[]`
    - Render section heading (eyebrow text + `SplitText` title "What We Stand For")
    - Map `values` to a responsive grid; wrap each card in `<FadeIn delay={i * 0.07}>` and `<MagneticButton strength={0.2} className="text-left w-full p-6 rounded-2xl border border-[#EDE8DF] hover:border-[var(--ds-gold)] transition-colors">`
    - Inside each card: `icon` as `<span className="text-3xl mb-4 block">`, `title` as `<h3>` with display font, `description` as `<p className="text-sm text-[var(--ds-ink-soft)]">`
    - _Requirements: 13.1, 13.2, 13.3, 16.1, 16.3, 16.4, 16.5_

  - [ ] 7.4 Create `frontend/components/website/about/IndustriesSection.tsx`
    - `"use client"` — uses Framer Motion via `FadeIn`
    - Props: `industries: IndustryItem[]`
    - When `industries.length === 0`: render empty-state message "Industry information coming soon."
    - When `industries.length > 0`: render responsive tile grid; wrap each tile in `<FadeIn delay={i * 0.07}>` showing `icon_url` image (via `resolveMediaUrl`), `name`, and `description`
    - _Requirements: 14.1, 14.2, 14.3, 16.1, 16.5_

  - [ ] 7.5 Create `frontend/components/website/about/FounderCard.tsx`
    - `"use client"` — uses Framer Motion via `RevealImage` and `SplitText`
    - Props: `founder: TeamMember`
    - Render a full-width asymmetric hero layout: `<RevealImage>` for `avatar_url` on one side, text column on the other
    - Text column: eyebrow label, `<SplitText>` for `founder.name`, `<FadeIn>` for `founder.designation` and `founder.bio`
    - Conditionally render Instagram icon-link if `founder.social_instagram` is non-empty; LinkedIn icon-link if `founder.social_linkedin` is non-empty
    - Use `<MagneticButton as="a">` for each social link with appropriate `href`
    - _Requirements: 15.1, 15.2, 15.5, 16.1, 16.4, 16.5_

- [ ] 8. Integrate new sections into the public About page
  - [ ] 8.1 Update `frontend/app/(website)/about/page.tsx` to import and compose new sections
    - Add imports for `WhoWeAreSection`, `MissionVisionSection`, `ValuesSection`, `IndustriesSection`, `FounderCard`
    - Destructure new fields from the `about` fetch result: `who_we_are`, `mission`, `vision`, `values`, `industries`
    - Split team into `founder` (`.find(m => m.is_founder) ?? null`) and `nonFounderTeam` (`.filter(m => !m.is_founder)`)
    - Below the existing Studio Gallery section, add guarded renders:
      - `{about?.who_we_are?.title && about?.who_we_are?.body && <WhoWeAreSection data={about.who_we_are} />}`
      - `{about?.mission?.title && about?.mission?.body && <MissionVisionSection data={about.mission} variant="mission" />}`
      - `{about?.vision?.title && about?.vision?.body && <MissionVisionSection data={about.vision} variant="vision" />}`
      - `{(about?.values?.length ?? 0) > 0 && <ValuesSection values={about!.values} />}`
      - `<IndustriesSection industries={about?.industries ?? []} />`
    - Replace the existing Team section: if `founder` exists render `<FounderCard founder={founder} />` first, then render non-founder members in the existing `FadeIn`-staggered grid; if no founder, render all members in the existing grid (unchanged fallback)
    - _Requirements: 10.1, 11.1, 12.1, 13.1, 14.1, 15.1, 15.3, 15.4_

- [ ] 9. Add CMS UI — Who We Are, Mission, and Vision cards
  - [ ] 9.1 Add `WhoWeAreCard` section to `frontend/app/(admin)/dashboard/web-cms/about/page.tsx`
    - Add local draft state: `const [whoWeAre, setWhoWeAre] = useState({ title: '', body: '', background_image: '' })` — initialized from `data.who_we_are` inside a `useEffect` that watches `data`
    - Add `saving` state scoped to this card (e.g. `savingWhoWeAre`)
    - Render a collapsible `<section>` card (same `bg-white border border-[#EDE8DF] rounded-2xl p-5 mb-6` pattern) containing:
      - `title` input, `body` textarea, `<MediaUploadField>` for `background_image`; all use `inputClass`/`labelClass` constants
      - Save button that calls `updateAboutAdmin({ who_we_are: whoWeAre })`, updates top-level `data` state on success, shows success/error toast
    - _Requirements: 6.1, 6.4, 6.5, 6.6_

  - [ ] 9.2 Add `MissionCard` and `VisionCard` sections to the CMS About page
    - Follow the exact same card pattern as 9.1 — separate draft state, separate saving flag, separate Save button
    - `MissionCard`: `title` input + `body` textarea; saves `{ mission: draft }` via `updateAboutAdmin`
    - `VisionCard`: `title` input + `body` textarea; saves `{ vision: draft }` via `updateAboutAdmin`
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 10. Add CMS UI — What We Stand For (Values) card
  - [ ] 10.1 Add Values CRUD section to the CMS About page
    - Import `addValue`, `updateValue`, `deleteValue` from `webCmsService`
    - Add a `"What We Stand For"` card with "Add Value" button that calls `addValue({ icon: '✦', title: 'New Value', description: '' })` and updates `data.values` from the returned doc
    - Render each `Value_Item` in the list with `icon` text input, `title` input, `description` textarea — each field uses `onBlur` to call `updateValue(item.id, { [field]: value })`; on success, update `data.values` from the returned doc
    - Delete button per item calls `deleteValue(item.id)` and removes item from `data.values` on 204 success
    - Render empty-state message when `data.values.length === 0`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 11. Add CMS UI — Industries card
  - [ ] 11.1 Add Industries CRUD section to the CMS About page
    - Import `addIndustry`, `updateIndustry`, `deleteIndustry` from `webCmsService`
    - Add an "Industries" card with "Add Industry" button that calls `addIndustry({ name: 'New Industry' })` and updates `data.industries` from the returned doc
    - Render each `Industry_Item` with `name` input, `description` textarea, `<MediaUploadField>` for `icon_url`, and an `is_published` toggle switch
    - `name`, `description`, `icon_url` fields use `onBlur` to call `updateIndustry(item.id, { [field]: value })`
    - `is_published` toggle fires `updateIndustry(item.id, { is_published: newValue })` immediately on change
    - Delete button calls `deleteIndustry(item.id)` and removes item on success
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 12. Extend CMS UI — Team section with new fields
  - [ ] 12.1 Add new fields to each team member card in the CMS About page
    - In the existing team member card JSX, add below the `designation` input:
      - `is_founder` checkbox with a gold badge label "Founder" when checked
      - `bio` textarea
      - `social_instagram` text input
      - `social_linkedin` text input
    - Wire each new field to `handleMemberField(member.id, { [field]: value })` for `onChange` (optimistic local state)
    - Extend `handleMemberBlur` to also persist `is_founder`, `bio`, `social_instagram`, `social_linkedin` alongside existing fields in the `updateTeamMember` call
    - Visually distinguish members with `is_founder: true` with a gold badge (e.g. `bg-[#C8922A] text-white text-[10px] px-2 py-0.5 rounded-full`)
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 13. Final checkpoint — Ensure all tests pass
  - Verify all new sections render correctly when data is populated; verify empty/missing-data guards hide sections gracefully; verify CRUD operations on values, industries, and team members work end-to-end.
  - Ensure all TypeScript types resolve without errors (`tsc --noEmit` in the frontend).
  - Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Dependencies flow strictly: model (1) → controller (2) → routes (3) → TS types (4) → service helpers (5) → website components (7) → page integration (8) → CMS UI (9–12)
- Tasks 4 and 5 can be worked in parallel with tasks 2–3 since they only depend on the design spec, not a running backend
- All new `motion.*` transitions must use `ease: [0.16, 1, 0.3, 1]` and `viewport={{ once: true, margin: "-10% 0px" }}` — do not introduce new easing constants
- The top-level `handleSave` button in the CMS page must remain unchanged — it saves only `narrative`, `about_slides`, `studio_gallery`, `studio_video_url`
- `get_about` (admin, `GET /web-cms/about`) returns all industries unfiltered; only the public handler (`GET /public/about`) applies the `is_published` filter

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5", "4.1", "4.2"] },
    { "id": 2, "tasks": ["3.1", "5.1", "5.2"] },
    { "id": 3, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5"] },
    { "id": 4, "tasks": ["8.1", "9.1", "9.2", "10.1", "11.1", "12.1"] }
  ]
}
```
