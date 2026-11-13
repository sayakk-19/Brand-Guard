# BrandGuard

**A brand-governance workspace for reviewing content before publication.**

BrandGuard helps a team compare draft content with approved brand rules, product facts and claim policies. Findings explain what was flagged, point to the approved source used, and offer a correction. Creators can revise the draft and reviewers can approve the exact revision they inspected.

This repository contains a working MERN foundation with seeded demo data. It is designed to be understandable and extendable rather than hiding the workflow behind a large AI prompt.

## What is implemented

- React workspace with dashboard, content queue, Review Studio, Brand Brain, insights and a review detail workspace.
- Express API with cookie-based JWT sessions, role checks, request validation and workspace-scoped database access.
- MongoDB models for workspace members, brand rules, content, immutable revisions, review runs, findings, comments, approval decisions and activity.
- Deterministic checks for approved terminology, known outdated offer wording, strong promotional claims and required messages.
- Findings that retain the source name, section, rule ID and version used during the review.
- Suggested corrections that create a new immutable content revision and trigger a fresh analysis.
- Reviewer actions tied to a content hash and the approved-source version set used in that review.
- Optional Gemini review for tone and messaging. It is disabled by default; the rule-based review works without an AI key.
- Seven unit tests plus an isolated database-backed workflow test suite.
- Registration with admin approval for joining existing workspaces, dashboard team controls, and personal theme/list/channel preferences.

## What is not implemented yet

The current release focuses on a useful end-to-end **text review workflow**. Image uploads, PDF extraction, OCR, image-reference comparison, visual contrast measurements, DOCX processing, file storage, semantic/vector retrieval, connected publishing and enterprise SSO are future extensions. The product screens and data model leave room for these without pretending they already work.

## Technology

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React 18 + Vite | Workspace and review experience |
| Styling | Custom responsive CSS | Design system and responsive layouts |
| UI icons | Lucide React | Consistent interface iconography |
| Backend | Node.js + Express | API, authentication and workflow rules |
| Database | MongoDB + Mongoose | Brand knowledge, revisions and approvals |
| Validation | Zod | Validate request bodies and optional AI output |
| Authentication | JWT in an HTTP-only cookie + bcryptjs | Authenticated role-aware sessions |
| AI (optional) | Gemini API | Tone and messaging interpretation |

The review engine is hybrid by design: explicit rules and facts use ordinary code; language interpretation may use a pretrained model when enabled. BrandGuard does not train a machine-learning model in this release.

## Requirements

- Node.js 20 or later
- npm 10 or later
- MongoDB 6 or later, either local or MongoDB Atlas

## Run locally

### 1. Install dependencies

Clone the repository and enter its root:

```bash
git clone https://github.com/sayakk-19/Brand-Guard.git
cd Brand-Guard
```

From the project root:

```bash
npm install
```

### 2. Configure the server

Copy `server/.env.example` to `server/.env` and set the values:

```env
NODE_ENV=development
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/brandguard
JWT_SECRET=use-a-random-secret-at-least-32-characters-long
COOKIE_NAME=bg_session
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
ENABLE_AI_REVIEW=false
```

You can use a local MongoDB service or a MongoDB Atlas connection string. Never commit `.env` or expose the Gemini key in frontend code.

**Windows PowerShell:**

```powershell
Copy-Item server/.env.example server/.env
```

Edit `server/.env` before continuing. For a local MongoDB instance, ensure the MongoDB service is running. Alternatively, set `MONGODB_URI` to your Atlas connection string and allow your development IP in Atlas Network Access.

### 3. Create the demo workspace

```bash
npm run seed
```

To reset the BrandGuard demo workspace to a clean sample dataset:

```bash
npm run seed --workspace server -- --reset
```

### 4. Start frontend and backend

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:5000/api
- Health check: http://localhost:5000/api/health

To run either process separately:

```bash
npm run dev:server
npm run dev:client
```

### 5. Sign in

All seeded demo accounts use the password `BrandGuard@123`.

| Role | Email |
|---|---|
| Workspace admin | `admin@brandguard.demo` |
| Creator | `creator@brandguard.demo` |
| Manager | `manager@brandguard.demo` |
| Reviewer | `reviewer@brandguard.demo` |

The login screen has one-click role selection for these accounts. The roles are separate demo identities to let you walk through the human review process.

## Optional Gemini review

The core rule checks do not need Gemini. To enable the optional tone and messaging pass:

1. Add your Gemini API key to `server/.env` as `GEMINI_API_KEY`.
2. Set `ENABLE_AI_REVIEW=true`.
3. Restart the server.
4. Sign in as the workspace admin and enable **Optional AI review** on the Brand Brain page.

Both the server-level configuration and the workspace-level setting must be enabled. The workspace admin can turn it off again without removing the server key. The server sends the draft and the applicable approved guidance to Gemini. The browser never receives the API key. If the provider fails or times out, BrandGuard keeps the deterministic findings and marks the AI check as **incomplete**. It does not present a partial review as a complete review.

Only use synthetic or otherwise authorised content while testing. Before processing confidential organisation material, review the terms and data handling conditions that apply to your AI account and workspace.

## Main workflow

1. Sign in with a seeded role.
2. Open **Brand Brain** and inspect the approved rules and facts.
3. As a creator, create a content review and run the checks.
4. Inspect each finding, its explanation and the approved source it cites.
5. Apply a suggestion or edit the text. Each change creates a new revision and a new analysis run.
6. Submit the current revision for review.
7. Sign in as a manager or reviewer and approve it, or request changes.
8. Inspect the revision history and approval record. An approval is tied to the exact content hash and source versions used at approval time.

## Project structure

```text
BrandGuard/
├── client/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── api/                 # Axios API client
│       ├── components/          # Application shell and navigation
│       ├── context/             # Authentication state
│       ├── pages/               # Dashboard, reviews, Brand Brain, insights
│       ├── App.jsx
│       ├── main.jsx
│       ├── styles.css
│       └── utils.js
├── server/
│   ├── src/
│   │   ├── config/              # MongoDB connection
│   │   ├── middleware/          # Authentication and error handling
│   │   ├── models/              # Mongoose schemas
│   │   ├── routes/              # REST API routes
│   │   ├── services/            # Review engine, Gemini adapter, activity log
│   │   ├── utils/
│   │   ├── seed.js
│   │   └── server.js
│   └── tests/
├── docs/
└── package.json
```

## API outline

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Clear session cookie |
| GET | `/api/auth/me` | Current user |
| GET / POST | `/api/brand/rules` | List or add brand rules |
| PATCH | `/api/brand/rules/:id/status` | Approve or retire a rule (admin) |
| GET / POST | `/api/reviews` | List or create content review |
| GET | `/api/reviews/:id` | Review detail, revisions, runs, comments and decisions |
| POST | `/api/reviews/:id/revisions` | Create and review a new revision |
| POST | `/api/reviews/:id/apply-suggestion` | Apply a finding as a new revision |
| POST | `/api/reviews/:id/recheck` | Run checks again on the current revision |
| POST | `/api/reviews/:id/submit` | Submit for human review |
| POST | `/api/reviews/:id/comments` | Add a review comment |
| PATCH | `/api/reviews/:id/findings/:findingId` | Update finding disposition |
| POST | `/api/reviews/:id/decision` | Approve or request changes |
| GET | `/api/dashboard/summary` | Workspace dashboard data |
| GET | `/api/dashboard/insights` | Aggregated governance insights |
| GET / PATCH | `/api/workspace/settings` | Read or update workspace-level external AI permission (admin can update) |

## Tests

Run the server test suite:

```bash
npm test
```

The deterministic core can also be tested directly without a running MongoDB instance:

```bash
node --test server/tests/reviewEngine.test.js
```

## Security and implementation notes

- API credentials and the JWT signing secret remain server-side.
- Authentication uses an HTTP-only cookie; passwords are hashed with bcrypt.
- API routes scope content and brand-rule access to the signed-in user's workspace.
- Role permissions are enforced on the backend, not only hidden in the interface.
- Input is validated with Zod; JSON request size is limited; login attempts are rate-limited.
- Approval records retain a content hash and source-rule IDs. Content revisions are immutable records.
- This is a hackathon-ready development foundation, not a security-certified enterprise deployment. Add CSRF defence, production secret management, audit retention policy, backups, monitoring, file scanning and deployment hardening before handling real confidential content.

## Development status

The text-governance core and its connected user workflow are implemented in this codebase. Run the setup steps above to initialise your database and launch it. Image/PDF review and richer semantic retrieval are intentionally not represented as completed features.


## Workspace onboarding and team access

- **Create:** Register with a new workspace name as Admin. Your workspace opens immediately.
- **Join:** Enter an existing workspace name (case-insensitive) and request Creator, Manager or Reviewer. No session is issued until an admin approves you.
- **Approve:** The workspace admin opens Overview > Team members, clicks Refresh members, then Approve or Decline. Approved users sign in normally; there is no email notification yet.
- **Manage:** Admins change approved members' roles from the same panel. Self-role changes and demo-admin management are blocked.
- **Demo:** The four seeded accounts need no approval. Everyone using them shares the same data. Do not use private content. Registration into the demo workspace and deletion of seeded demo identities are blocked.
- Existing accounts retain access when upgrading. Only new join requests require approval.
- Settings persist theme, compact lists and preferred publishing channel in this browser. A deleted account is deactivated; its review history remains.

## Deployment

Deploy the Express server separately from the static frontend, with a persistent MongoDB database. The Netlify client build alone does not deploy the API.

Frontend settings used by this repository:

- Repository root as base directory.
- Build: `npm --workspace @brandguard/client run build`
- Publish: `client/dist`
- Build environment: `VITE_API_URL=https://YOUR-API-HOST/api` (replace with your actual API URL).
- `client/public/_redirects` provides SPA refresh routing and is copied into `dist`.

Backend: install from the repository root, then run `npm run start --workspace server`. Configure `NODE_ENV=production`, `MONGODB_URI`, a strong `JWT_SECRET`, and `CLIENT_ORIGIN=https://brandguard21.netlify.app`. Set optional Gemini values only on the backend. Preserve proxy trust and Secure/HttpOnly/SameSite=None cookies. Browsers that block third-party cookies may require a same-site API domain or proxy. Never use a localhost API URL in the deployed client.

Deploy both changed components. Do not reset the live database to install these changes. Seed only an intended demo dataset. After deployment test registration, pending login, approval in a second browser session, role change, review submission, and direct `/profile` and `/settings` refreshes.

## Full workflow verification

```bash
npm test
npm run build
node server/tests/workflow.integration.js
```

The last command launches a temporary local MongoDB on port 27028 and never reads `server/.env`. Set `MONGOD_BINARY` to your `mongod` executable if it is not at the Windows default in that script. Keep port 27028 free. Temporary test files are left in the OS temporary directory for inspection. Tests must not be pointed at production.

See [Round 3 submission](docs/ROUND3_SUBMISSION.md) for feature inventory, architecture, evidence, known limitations and the release checklist.
