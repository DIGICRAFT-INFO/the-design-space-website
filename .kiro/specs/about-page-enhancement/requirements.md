# Requirements Document

## Introduction

The About Page Enhancement adds seven new content sections below the existing content on The Design Space website's About page (`/about`). Each section is fully managed from the Admin CMS with full CRUD operations, RBAC enforcement (Manager and Admin roles only), and rich visual controls. On the public website every section is rendered with world-class Framer Motion animations — scroll-triggered reveals, staggered children, parallax effects, and split-text typography — matching the existing luxury interior-design aesthetic (cream/gold/dark palette, display typeface).

The enhancement extends the existing `WebAbout` Mongoose model with new sub-documents (`who_we_are`, `mission`, `vision`, `values`, `industries`) and extends the existing `team_members` sub-document schema with `is_founder`, `bio`, and social-link fields. All new data is returned by the existing public `/api/v1/public/about` endpoint and managed through the existing CMS endpoint family at `/api/v1/web-cms/about`.

## Glossary

- **WebAbout**: The singleton Mongoose document (`_id: 'web_about_singleton'`) that stores all About-page content.
- **Who_We_Are_Section**: The "Who We Are" sub-document inside `WebAbout`, containing `title`, `body`, and optional `background_image`.
- **Mission_Section**: The "Our Mission" sub-document inside `WebAbout`, containing `title` and `body`.
- **Vision_Section**: The "Our Vision" sub-document inside `WebAbout`, containing `title` and `body`.
- **Value_Item**: A single values/pillar entry inside `WebAbout.values`, containing `id`, `icon`, `title`, `description`, and `sort_order`.
- **Industry_Item**: A single industry entry inside `WebAbout.industries`, containing `id`, `name`, `icon_url`, `description`, `sort_order`, and `is_published`.
- **Team_Member**: The existing sub-document inside `WebAbout.team_members`, extended with `is_founder` (Boolean), `bio` (String), `social_instagram` (String), and `social_linkedin` (String).
- **Founder_Card**: The large hero-style profile display rendered on the website for the Team_Member with `is_founder: true`.
- **CMS**: The Admin dashboard CMS, accessible at `/dashboard/web-cms/about`.
- **Public_About_Endpoint**: `GET /api/v1/public/about` — unauthenticated, returns full `WebAbout` document.
- **RBAC**: Role-based access control; `is_manager_or_above` middleware already applied to all `/api/v1/web-cms/*` routes.
- **FadeIn**: Existing Framer Motion wrapper component that fades and slides content up on scroll.
- **SplitText**: Existing Framer Motion component that reveals heading text word-by-word.
- **RevealImage**: Existing Framer Motion component that unveils images with a curtain effect.
- **MagneticButton**: Existing Framer Motion component that applies magnetic hover interaction.

---

## Requirements

### Requirement 1: Data Model Extension

**User Story:** As a developer, I want the `WebAbout` Mongoose model to store all new About-page content, so that a single document drives both the CMS and the public website.

#### Acceptance Criteria

1. THE `WebAbout` model SHALL include a `who_we_are` sub-document with fields `title` (String, max 200), `body` (String), and `background_image` (String, default `''`).
2. THE `WebAbout` model SHALL include a `mission` sub-document with fields `title` (String, max 200) and `body` (String).
3. THE `WebAbout` model SHALL include a `vision` sub-document with fields `title` (String, max 200) and `body` (String).
4. THE `WebAbout` model SHALL include a `values` array of sub-documents, each with `_id` (UUID string), `icon` (String), `title` (String, max 200), `description` (String), and `sort_order` (Number, default 0).
5. THE `WebAbout` model SHALL include an `industries` array of sub-documents, each with `_id` (UUID string), `name` (String, required, max 200), `icon_url` (String), `description` (String), `sort_order` (Number, default 0), and `is_published` (Boolean, default false).
6. THE `WebAbout` model SHALL extend each `team_members` entry with `is_founder` (Boolean, default false), `bio` (String, default `''`), `social_instagram` (String, default `''`), and `social_linkedin` (String, default `''`).
7. WHEN the `WebAbout` singleton document is retrieved, THE `WebAbout` model SHALL expose all new fields in the JSON response using the same `id`/`_id` transform already applied to existing sub-documents.

---

### Requirement 2: Backend API — Singleton Sections (Who We Are, Mission, Vision)

**User Story:** As a CMS admin, I want to save and retrieve the "Who We Are", "Our Mission", and "Our Vision" sections, so that I can control the brand statement content on the About page.

#### Acceptance Criteria

1. WHEN a `PUT /api/v1/web-cms/about` request is received with a `who_we_are` object, THE `web_cms_controller` SHALL merge the provided fields into `doc.who_we_are` and persist the document.
2. WHEN a `PUT /api/v1/web-cms/about` request is received with a `mission` object, THE `web_cms_controller` SHALL merge the provided fields into `doc.mission` and persist the document.
3. WHEN a `PUT /api/v1/web-cms/about` request is received with a `vision` object, THE `web_cms_controller` SHALL merge the provided fields into `doc.vision` and persist the document.
4. WHEN `GET /api/v1/public/about` is called, THE `web_cms_controller` SHALL include `who_we_are`, `mission`, and `vision` fields in the response.
5. IF a `PUT /api/v1/web-cms/about` request is received without the `who_we_are`, `mission`, or `vision` keys, THEN THE `web_cms_controller` SHALL leave the corresponding existing sub-documents unchanged.

---

### Requirement 3: Backend API — Values CRUD

**User Story:** As a CMS admin, I want to add, edit, reorder, and delete individual value/pillar items, so that the "What We Stand For" section stays current.

#### Acceptance Criteria

1. WHEN a `POST /api/v1/web-cms/about/values` request is received with `icon`, `title`, and `description`, THE `web_cms_controller` SHALL append a new `Value_Item` to `doc.values` and return the updated `WebAbout` document.
2. WHEN a `PATCH /api/v1/web-cms/about/values/:valueId` request is received, THE `web_cms_controller` SHALL update only the provided fields (`icon`, `title`, `description`, `sort_order`) of the matching `Value_Item`.
3. WHEN a `DELETE /api/v1/web-cms/about/values/:valueId` request is received, THE `web_cms_controller` SHALL remove the matching `Value_Item` from `doc.values` and return HTTP 204.
4. IF a `PATCH` or `DELETE` request targets a `valueId` that does not exist in `doc.values`, THEN THE `web_cms_controller` SHALL return HTTP 404 with `{ error: 'Value item not found.' }`.
5. WHEN `GET /api/v1/public/about` is called, THE `web_cms_controller` SHALL include the full `values` array sorted by `sort_order` ascending in the response.

---

### Requirement 4: Backend API — Industries CRUD

**User Story:** As a CMS admin, I want to add, edit, publish/unpublish, reorder, and delete industry entries, so that the "Industries" section shows only relevant, approved industries.

#### Acceptance Criteria

1. WHEN a `POST /api/v1/web-cms/about/industries` request is received with a `name` field, THE `web_cms_controller` SHALL create a new `Industry_Item` and return the updated `WebAbout` document.
2. WHEN a `PATCH /api/v1/web-cms/about/industries/:industryId` request is received, THE `web_cms_controller` SHALL update only the provided fields (`name`, `icon_url`, `description`, `sort_order`, `is_published`) of the matching `Industry_Item`.
3. WHEN a `DELETE /api/v1/web-cms/about/industries/:industryId` request is received, THE `web_cms_controller` SHALL remove the matching `Industry_Item` and return HTTP 204.
4. IF a `PATCH` or `DELETE` request targets an `industryId` that does not exist, THEN THE `web_cms_controller` SHALL return HTTP 404 with `{ error: 'Industry not found.' }`.
5. WHEN `GET /api/v1/public/about` is called, THE `web_cms_controller` SHALL include an `industries` array containing only `Industry_Item` entries where `is_published: true` sorted by `sort_order` ascending; IF no published entries exist, THEN THE `web_cms_controller` SHALL return an empty array for `industries`.

---

### Requirement 5: Backend API — Extended Team Member CRUD

**User Story:** As a CMS admin, I want to designate one team member as the Founder and add a bio and social links to any member, so that the Team section can display a distinguished founder card.

#### Acceptance Criteria

1. WHEN a `POST /api/v1/web-cms/about/team` request is received, THE `web_cms_controller` SHALL accept and persist `is_founder` (Boolean), `bio` (String), `social_instagram` (String), and `social_linkedin` (String) alongside the existing `name`, `designation`, and `avatar_url` fields.
2. WHEN a `PATCH /api/v1/web-cms/about/team/:memberId` request is received, THE `web_cms_controller` SHALL update `is_founder`, `bio`, `social_instagram`, and `social_linkedin` when those fields are present in the request body; IF none of those fields are present, THEN THE `web_cms_controller` SHALL treat the request as a no-op and return the current document unchanged.
3. WHEN `GET /api/v1/public/about` is called, THE `web_cms_controller` SHALL include `is_founder`, `bio`, `social_instagram`, and `social_linkedin` for every team member in the response.

---

### Requirement 6: CMS UI — Who We Are, Mission, and Vision Sections

**User Story:** As a CMS admin, I want dedicated collapsible card sections for "Who We Are", "Our Mission", and "Our Vision" on the CMS About page, so that I can edit and save each section independently.

#### Acceptance Criteria

1. THE CMS About page SHALL display a collapsible card for "Who We Are" containing inputs for `title`, `body` (textarea), and an optional background image upload field.
2. THE CMS About page SHALL display a collapsible card for "Our Mission" containing inputs for `title` and `body` (textarea).
3. THE CMS About page SHALL display a collapsible card for "Our Vision" containing inputs for `title` and `body` (textarea).
4. WHEN the admin clicks the Save button within a section card, THE CMS About page SHALL call `PUT /api/v1/web-cms/about` with only that section's data and display a success toast on completion.
5. IF the save request fails, THEN THE CMS About page SHALL display an error toast with the server's error message.
6. THE CMS About page SHALL use the existing `inputClass` and `labelClass` CSS constants already defined in the CMS About page for all form fields in the new sections.

---

### Requirement 7: CMS UI — What We Stand For (Values)

**User Story:** As a CMS admin, I want a CRUD list interface for the values/pillars, so that I can add, edit, reorder, and remove value items without a page reload.

#### Acceptance Criteria

1. THE CMS About page SHALL display a "What We Stand For" card containing the full ordered list of `Value_Item` entries and an "Add Value" button.
2. WHEN the admin clicks "Add Value", THE CMS About page SHALL call `POST /api/v1/web-cms/about/values` with default placeholder content and append the returned item to the displayed list.
3. WHEN the admin edits the `icon`, `title`, or `description` of a `Value_Item` and moves focus away, THE CMS About page SHALL call `PATCH /api/v1/web-cms/about/values/:valueId` to persist the change.
4. WHEN the admin clicks the delete button on a `Value_Item`, THE CMS About page SHALL call `DELETE /api/v1/web-cms/about/values/:valueId` and remove the item from the displayed list.
5. THE CMS About page SHALL display an empty-state message when no `Value_Item` entries exist.

---

### Requirement 8: CMS UI — Industries

**User Story:** As a CMS admin, I want a CRUD list interface for industries with a per-item publish toggle, so that I can control which industries are visible on the public website.

#### Acceptance Criteria

1. THE CMS About page SHALL display an "Industries" card containing the list of all `Industry_Item` entries (published and unpublished) and an "Add Industry" button.
2. WHEN the admin clicks "Add Industry", THE CMS About page SHALL call `POST /api/v1/web-cms/about/industries` with a default name and append the new item to the list.
3. WHEN the admin toggles the `is_published` switch on an `Industry_Item`, THE CMS About page SHALL immediately call `PATCH /api/v1/web-cms/about/industries/:industryId` with the new value.
4. WHEN the admin edits `name`, `icon_url`, or `description` of an `Industry_Item` and moves focus away, THE CMS About page SHALL call `PATCH /api/v1/web-cms/about/industries/:industryId` to persist the change.
5. WHEN the admin clicks the delete button on an `Industry_Item`, THE CMS About page SHALL call `DELETE /api/v1/web-cms/about/industries/:industryId` and remove the item from the list.
6. THE CMS About page SHALL support uploading an icon image for each `Industry_Item` using the existing `MediaUploadField` component.

---

### Requirement 9: CMS UI — Team (Founder + Members)

**User Story:** As a CMS admin, I want to designate a founder with extended profile fields and manage the rest of the team list, so that the Team section displays a distinguished founder card above the team grid.

#### Acceptance Criteria

1. THE CMS About page Team section SHALL display each team member's existing fields plus new `is_founder` checkbox, `bio` textarea, `social_instagram` input, and `social_linkedin` input.
2. WHEN the admin checks the `is_founder` checkbox on a team member and that change is saved, THE `web_cms_controller` SHALL persist `is_founder: true` on that member.
3. WHEN the admin fills in `bio`, `social_instagram`, or `social_linkedin` for a team member and moves focus away, THE CMS About page SHALL auto-save those fields via `PATCH /api/v1/web-cms/about/team/:memberId`.
4. THE CMS About page SHALL visually distinguish team members with `is_founder: true` using a gold badge label.

---

### Requirement 10: Website — Who We Are Section

**User Story:** As a website visitor, I want to read the brand identity statement in a visually impactful "Who We Are" section, so that I understand the studio's ethos.

#### Acceptance Criteria

1. WHEN the `who_we_are.title` and `who_we_are.body` fields are non-empty, THE About page SHALL render a "Who We Are" section below the existing content using `SplitText` for the heading and `FadeIn` for the body; IF technical rendering issues prevent the section from displaying, THEN THE About page SHALL hide the section entirely rather than show partial content.
2. WHEN `who_we_are.background_image` is set, THE About page SHALL render the image as a full-bleed parallax background behind the section using Framer Motion's `useScroll` / `useTransform`.
3. WHEN the "Who We Are" section scrolls into the visible viewport, THE About page SHALL animate the section heading with `SplitText` (word-by-word reveal) and the body text with `FadeIn`; animations SHALL NOT activate before the section is visible to the user.

---

### Requirement 11: Website — Our Mission Section

**User Story:** As a website visitor, I want to see the studio's mission statement with strong typographic treatment, so that the brand purpose is immediately clear.

#### Acceptance Criteria

1. WHEN `mission.title` and `mission.body` are non-empty, THE About page SHALL render an "Our Mission" section with the title displayed in the display font at large scale; IF either element fails to render, THEN THE About page SHALL hide the entire section rather than show partial content.
2. WHEN the section scrolls into the visible viewport, THE About page SHALL animate the title using `SplitText` and the body using `FadeIn`; title and body animations MAY animate independently at different times.

---

### Requirement 12: Website — Our Vision Section

**User Story:** As a website visitor, I want to see the studio's vision statement, so that I understand the long-term direction of the brand.

#### Acceptance Criteria

1. WHEN `vision.title` and `vision.body` are non-empty, THE About page SHALL render an "Our Vision" section with equivalent visual weight and animation treatment to the Mission section.
2. WHEN the section scrolls into view, THE About page SHALL animate the title using `SplitText` and the body using `FadeIn`.

---

### Requirement 13: Website — What We Stand For Section

**User Story:** As a website visitor, I want to see the studio's core values as a grid of visually engaging cards, so that I understand what drives the team's work.

#### Acceptance Criteria

1. WHEN `values` contains at least one entry, THE About page SHALL render a "What We Stand For" section with one card per `Value_Item` showing `icon`, `title`, and `description`.
2. WHEN the values grid scrolls into view, THE About page SHALL stagger-animate each card's entrance using `FadeIn` with incremental delays.
3. WHEN a visitor hovers over a value card, THE About page SHALL apply a `MagneticButton`-style interactive motion to the card.

---

### Requirement 14: Website — Industries Section

**User Story:** As a website visitor, I want to see the industries the studio serves, so that I can quickly determine if my project type is within their expertise.

#### Acceptance Criteria

1. WHEN the public `about` response contains zero `Industry_Item` entries with `is_published: true`, THE About page SHALL render the Industries section with an empty-state message indicating that industry information is coming soon.
2. WHEN at least one published `Industry_Item` exists, THE About page SHALL render an "Industries" section with a card or tile per entry showing `name`, `icon_url` (image), and `description`.
3. WHEN the Industries section scrolls into view, THE About page SHALL stagger-animate each industry tile's entrance using `FadeIn`.

---

### Requirement 15: Website — Team Section (Founder + Grid)

**User Story:** As a website visitor, I want to see a distinguished hero-style Founder card followed by the rest of the team in a grid, so that the studio's leadership is immediately prominent.

#### Acceptance Criteria

1. WHEN a team member with `is_founder: true` exists, THE About page SHALL render that member's card as a large, full-width or asymmetric hero layout above the team grid, showing `name`, `designation`, `bio`, and `avatar_url` using `RevealImage`.
2. WHEN `social_instagram` or `social_linkedin` is set on the founder, THE About page SHALL render the corresponding social link icon-buttons on the Founder_Card; IF the Founder_Card fails to render, THEN THE About page SHALL not attempt to render social icons elsewhere.
3. WHEN no team member has `is_founder: true`, OR WHEN the Founder_Card fails to render due to missing data or errors, THE About page SHALL render all team members in the existing responsive grid layout as a fallback.
4. THE About page SHALL render the remaining (non-founder) team members in a responsive grid below the Founder_Card using `FadeIn` with staggered delays.
5. WHEN the Founder_Card scrolls into view, THE About page SHALL animate the image with `RevealImage` and the text with `SplitText`.

---

### Requirement 16: Animation Standards

**User Story:** As a product owner, I want every new section to meet the existing site's motion quality standard, so that the About page feels cohesive and world-class.

#### Acceptance Criteria

1. THE About page SHALL use `FadeIn`, `SplitText`, and `RevealImage` components for all new sections consistent with existing section animation patterns.
2. WHEN a section containing a background image is rendered, THE About page SHALL apply a Framer Motion parallax effect using `useScroll` and `useTransform` so the background moves at a slower rate than the scroll.
3. WHEN any value card is hovered, THE About page SHALL apply a magnetic motion effect using Framer Motion spring physics (consistent with `MagneticButton`).
4. ALL new animation variants SHALL use the `[0.16, 1, 0.3, 1]` cubic-bezier easing already in use across `FadeIn`, `SplitText`, and `RevealImage`.
5. ALL new `whileInView` animations SHALL use `viewport={{ once: true, margin: "-10% 0px" }}` to match the existing scroll-trigger behaviour.

---

### Requirement 17: Public API Data Shape

**User Story:** As a frontend developer, I want the public `GET /api/v1/public/about` endpoint to return all new fields, so that the website page component can consume the complete data in a single fetch.

#### Acceptance Criteria

1. WHEN `GET /api/v1/public/about` is called, THE Public_About_Endpoint SHALL return a JSON object containing `who_we_are`, `mission`, `vision`, `values`, `industries` (published only), and the extended `team_members` array in addition to all existing fields.
2. THE Public_About_Endpoint SHALL return `values` sorted by `sort_order` ascending.
3. THE Public_About_Endpoint SHALL return `industries` filtered to `is_published: true` and sorted by `sort_order` ascending.
4. THE Public_About_Endpoint SHALL return `team_members` including `is_founder`, `bio`, `social_instagram`, and `social_linkedin` for each entry.

---

### Requirement 18: Frontend Type Definitions

**User Story:** As a TypeScript developer, I want all new data structures to have corresponding TypeScript types in `websiteService.ts`, so that the website page component and admin CMS have full type safety.

#### Acceptance Criteria

1. THE `websiteService.ts` file SHALL export a `ValueItem` type with fields `id`, `icon`, `title`, `description`, and `sort_order`.
2. THE `websiteService.ts` file SHALL export an `IndustryItem` type with fields `id`, `name`, `icon_url`, `description`, `sort_order`, and `is_published`.
3. THE `WebAbout` type in `websiteService.ts` SHALL be extended to include `who_we_are`, `mission`, `vision`, `values`, and `industries` fields.
4. THE `TeamMember` type in `websiteService.ts` SHALL be extended to include `is_founder`, `bio`, `social_instagram`, and `social_linkedin` fields.
