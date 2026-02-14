## 1. Product Overview
An AI-assisted medical ophthalmology blog with two reading paths: patients and professionals.
It combines evidence-based content browsing with an editorial workflow (drafting, review, publishing).

## 2. Core Features

### 2.1 User Roles
| Role | Registration Method | Core Permissions |
|------|---------------------|------------------|
| Visitor | No registration | Browse patient/professional articles, open article details |
| Registered User (Professional) | Email/password registration + approval workflow | Access dashboard, generate drafts, manage own articles |
| Admin | Admin-created/assigned | Approve/reject users, manage users/articles, view overview/analytics |

### 2.2 Feature Module
1. **Landing page**: patient/professional CTAs, blog introductions, interactive content explainer sections (no admin/tools promotion).
2. **Patient blog**: patient article listing, filters/search, link to article detail, patient content submission entry.
3. **Professional blog**: professional article listing, filters/search, link to article detail.
4. **Article detail**: full article content, metadata (category/tags), cover image.
5. **Authentication**: login, register, forgot password, pending approval state.
6. **Editorial dashboard**: AI draft generation, article list, article edit/detail, settings.
7. **Admin console**: overview/analytics, user approvals, user management, settings.
8. **Legal & consent**: privacy, terms, cookies; GDPR consent/export/delete actions.

### 2.3 Page Details
| Page Name | Module Name | Feature description |
|-----------|-------------|---------------------|
| Landing page | Hero + CTAs | Present main value proposition; keep existing patient/professional CTA buttons prominently in hero; preserve clean black/white styling with crisp black borders |
| Landing page | Audience Cards | Let you choose “Professional blog” vs “Patient blog” via two cards; link to /professional and /patient; use black-bordered card styling |
| Landing page | Interactive Blog/Content Sections | Explain what you’ll find via interactive UI blocks (e.g., audience toggle, expandable FAQs/accordions, hoverable “content formats” cards) while staying informational and lightweight |
| Landing page | Footer | Show legal links (/privacy, /terms, /cookies) with increased vertical spacing from the last content section and a clear black top border |
| Landing page | Remove Admin/Tools Promotion | Remove the admin/tools card that links to editorial tools from the public landing page |
| Patient blog | Article Discovery | List patient articles; support search/filtering; open article detail |
| Patient blog | Patient Generate/Submit Entry | Provide entry point to patient content generation/submission flow |
| Professional blog | Article Discovery | List professional articles; support search/filtering; open article detail |
| Article detail | Article Reading | Render cover image (if any), title, excerpt, full markdown content; show category/tags |
| Authentication | Account Access | Register, login, reset password; show pending-approval state when needed |
| Editorial dashboard | Draft & Publish Workflow | Generate draft from source (e.g., PDF) and target audience using a clearly placed primary “Generate” button (consistent placement on the create screen); manage article drafts and published articles; show active state in the dashboard sidebar navigation |
| Admin console | Approvals & Management | Approve/reject users; manage users/articles; view overview/analytics |
| Legal & consent | Compliance Pages | Show privacy/terms/cookies; allow GDPR consent tracking and data export/delete requests |

## 3. Core Process
- Visitor flow: You land on the homepage, choose Patient or Professional path, browse articles, and open an article to read.
- Editor flow: You register/login, wait for approval if required, then use the dashboard to generate a draft and manage your articles.
- Admin flow: You log in as admin, review pending users, approve/reject, and monitor overview/analytics.

```mermaid
graph TD
  A["Landing Page"] --> B["Patient Blog"]
  A --> C["Professional Blog"]
  B --> D["Patient Article Detail"]
  C --> E["Professional Article Detail"]
  A --> F["Login"]
  F --> G["Pending Approval"]
  F --> H["Dashboard"]
  H --> I["Dashboard Create / Generate"]
  H --> J["Dashboard Articles"]
  H --> K["Dashboard Settings"]
  H --> L["Admin Console"]
  L --> M["Admin Users"]
  L --> N["Admin Articles"]
  L --> O["Admin Analytics"]
  A --> P["Privacy"]
  A --> Q["Terms"]
  A --> R["Cookies"]