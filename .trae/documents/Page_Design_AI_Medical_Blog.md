# Page Design Specification (Desktop-first)

## Global Styles (applies to all pages)
- Theme: clean black/white, high contrast, minimal decoration.
- Colors (tokens):
  - Background: #FFFFFF
  - Foreground/text: #000000
  - Muted text: rgba(0,0,0,0.6–0.75)
  - Borders: #000000 (use solid black borders for key UI surfaces)
  - Border width: 2px for cards/sidebars/dividers; 1px only for subtle separators if needed
  - Accent: #000000 (buttons, pills)
- Typography:
  - H1: 36–44px, semibold, tight tracking
  - H2: 20–28px, semibold
  - Body: 14–16px
  - Small/caps: 12px, uppercase, wide tracking
- Buttons:
  - Primary: black background, white text, rounded-full
  - Secondary/Outline: white background, 2px black border, rounded-full
  - Hover: slightly reduce opacity or add subtle shadow
- Layout:
  - Desktop-first max width container (e.g., 800–1100px depending on page)
  - Spacing scale: 12/16/24/32/48px
- Responsive:
  - Desktop: multi-column grids
  - Mobile: single column; preserve CTA prominence

---

## 1) Landing Page (/)
### Meta Information
- Title: “Ophthalmology articles for patients and professionals”
- Description: “Evidence-based ophthalmology content: patient-friendly explainers and professional clinical summaries.”
- Open Graph: title/description; og:image optional (site default)

### Page Structure
- Single-column content stack inside centered container
- Sections separated by consistent vertical rhythm (24–48px)

### Sections & Components
1. **Brand Kicker**
   - Small uppercase label at top (e.g., specialty name)

2. **Hero**
   - H1 headline + short supporting paragraph
   - **Keep the existing CTAs** as two buttons directly under the hero copy:
     - Primary CTA → /professional
     - Outline CTA → /patient
   - Interaction: strong hover states; keyboard focus visible

3. **Audience Cards (Professional vs Patient)**
   - Two cards in a grid (2 columns desktop, 1 column mobile)
   - Each card includes: icon, title, short description, 2–3 bullet points
   - Each card has one button (existing destinations)

4. **Interactive “What you’ll get” Section (NEW)**
   - Goal: describe the blog and content more deeply without adding new routes
   - Component: **Audience Toggle** (segmented control)
     - Tabs: “For Patients” / “For Professionals”
     - Switching updates:
       - a) short paragraph (“how to use this content”)
       - b) a small grid of “topic chips” (non-navigational or optionally deep-link to existing list pages)
       - c) “Typical article structure” mini-list

5. **Interactive “Content Formats” Section (NEW)**
   - Component: 3–4 hoverable cards (or expandable accordions on mobile):
     - “Explainers”
     - “Clinical summaries”
     - “Research highlights”
     - “Checklists / practical steps”
   - Interaction:
     - Desktop hover lifts card slightly
     - Click expands for 2–3 extra lines (accordion behavior)

6. **Trust & Quality (Interactive FAQ) (NEW)**
   - Component: Accordion with 4–6 items (e.g., “Evidence-based”, “Who writes”, “How updates work”, “Limitations/disclaimer”)
   - Keep copy concise; avoid adding new functional flows

7. **Footer (lightweight)**
   - Links: /privacy, /terms, /cookies
   - Spacing: add clear separation from the last section (e.g., 48–64px top padding) and comfortable footer padding (e.g., 24–32px bottom)
   - Styling: small text with a crisp black border-top (2px); keep layout minimal

### Explicit Change Requirement
- **Remove** the “Admin/Tools” promotional card from the landing page.

---

## 2) Patient Blog Index (/patient)
### Meta Information
- Title: “Patient articles”
- Description: “Patient-friendly ophthalmology articles and practical guidance.”

### Layout & Structure
- Top: page heading + short intro
- Controls row: search + filters (desktop in one row; stacked on mobile)
- Content: article card list/grid

### Sections & Components
- Search input (query updates results)
- Filter chips/dropdowns (category/tags)
- Article cards: title, excerpt, category, date, reading time if available
- Pagination or “load more” (whichever is implemented)

---

## 3) Professional Blog Index (/professional)
Same structure as Patient Blog Index, but professional tone and categories.

---

## 4) Article Detail (/patient/[slug], /professional/[slug])
### Meta Information
- Title: article title
- Description: SEO meta description from article
- Open Graph: title/description + cover image if present

### Layout & Structure
- Header block: title, excerpt, category/tags, publish date
- Cover image (optional)
- Body: markdown-rendered content with readable line length
- Footer: related tags/categories (non-essential if not available)

---

## 5) Auth Pages (/login, /register, /forgot-password, /pending-approval)
### Layout
- Centered narrow panel (max 420–480px)
- Clear headings and inline validation

### Components
- Forms with strong focus states
- Error and success banners
- Pending approval: status card + next steps text

---

## 6) Editorial Dashboard (/dashboard/*)
### Layout
- App shell with top bar + **left sidebar navigation** on desktop (collapsible on smaller screens if needed)
- Sidebar styling: solid black borders; active item clearly indicated (e.g., black background + white text, or left 4px indicator + bold label)
- Content area uses cards/tables with black 2px borders for primary surfaces

### Key Screens
- /dashboard/create: upload/dropzone + generation controls (provider, audience, image toggle) + generated draft preview
  - **Primary “Generate” button placement:** anchor as the final action in the controls area (right-aligned) and keep it consistently visible (e.g., sticky within the controls panel)
- /dashboard/articles: table/list with status badges and quick actions
- /dashboard/articles/[id]: editor view (title, excerpt, cover image, content, SEO fields)
- /dashboard/settings: account + preferences

---

## 7) Admin Console (/admin/*)
### Layout
- Similar to dashboard shell, but admin navigation

### Key Screens
- Users: pending approvals queue + approve/reject actions
- Articles: moderation/management list
- Analytics/Overview: summary cards + charts/tables
- Settings: configuration panel

---

## 8) Legal & Consent Pages (/privacy, /terms, /cookies)
- Simple long-form layout
- Clear headings, section anchors, readable typography
- Minimal interactive elements (only if consent UI is present elsewhere