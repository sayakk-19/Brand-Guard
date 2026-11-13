# BrandGuard - Round 3 product submission

Prepared 13 November 2026. Scope: text-based brand governance for small teams.

## Project and release status

- Product: https://brandguard21.netlify.app/
- Source: https://github.com/sayakk-19/Brand-Guard
- Local implementation and automated checks are complete for the changes described below. These changes still require a source push and deployment of both frontend and backend. This document does not certify that the public URL contains this revision.
- Preserve actual commit/deployment history as event-window evidence. Event eligibility and the submission deadline must be checked against the organiser's announcement.

## Product and main journey

BrandGuard compares draft copy with approved terminology, facts and claim policies. Findings show the supporting rule and a suggested correction. A creator revises and submits the content; a different authorised member approves the exact revision or requests changes.

For a quick demonstration, select a demo role and sign in with the displayed credentials. Create a review as Creator, inspect findings, revise and submit, then sign in as Reviewer to decide. Demo activity is shared with all visitors. For private workspace testing, register a new workspace as Admin and approve a second member before collaborating.

## The three Round 2 improvements

1. **Shared workspace onboarding:** registration creates a named workspace or requests membership in an existing one. The name appears throughout the workspace. New owners start as Admin. New joiners cannot sign in until an administrator approves them. Registration explains the choices and shared demo visibility. Existing accounts retain access.
2. **Role-based team management:** administrators see members and pending requests on Overview, approve or decline requests, and change approved members' roles. Server checks prevent self-role changes and cross-workspace changes. Demo-admin management is disabled. This completes governed collaboration rather than unrestricted self-promotion.
3. **Personal appearance settings:** light/dark theme, compact lists and a preferred publishing channel persist in browser storage. Invalid stored values fall back to defaults. The channel preference is used for new reviews.

These are the three commitments carried forward in the available project context. Approval completes onboarding; it is not a replacement commitment. No new product direction is proposed.

## Complete implemented feature inventory

- Email/password sign-in, logout and cookie-based sessions.
- Four seeded demo identities: Admin, Creator, Manager and Reviewer.
- New workspace registration and case-insensitive existing-workspace lookup.
- Pending membership, administrator approval/decline and backend access enforcement.
- Workspace-specific name, content, rules, activity and members.
- Administrator-managed member roles with protected demo administration.
- Dashboard totals, recent content, activity and governance insights.
- Brand Brain rules with approval/retirement and optional external-AI permission.
- Text review creation with channel, audience and objective.
- Deterministic terminology, known-fact, claim and required-message checks.
- Findings with explanation, source attribution and suggested correction.
- Manual revisions and suggestions saved as new immutable revisions.
- Review rechecks, finding dispositions and comments.
- Submit, approve, request changes and exception decisions; no self-approval.
- Approval tied to revision/content hash; edits clear the current approval.
- Profile, workspace breadcrumbs, sign-out and account deactivation.
- Theme, compact-list and default-channel preferences.
- Responsive layout, sample copy, empty states and API error messages.
- Optional Gemini tone/messaging adapter; provider failure is reported as incomplete.

## Technical architecture and implementation

React 18 and Vite serve the client, with React Router, Axios, Lucide and custom CSS. The browser calls an Express REST API. Zod validates inputs; bcrypt hashes passwords; JWT sessions use HTTP-only cookies. Mongoose stores users, workspaces, brand rules, content items, immutable revisions, review runs, comments, approvals and activity in MongoDB.

The API loads the current user and membership status on protected requests, then applies role and workspace boundaries. Joining creates a pending record without a session. Approval/decline uses a conditional database update so a repeated decision cannot overwrite an already handled request. Legacy accounts default to approved for deployment compatibility.

The deterministic review engine compares text with approved rules. Optional Gemini REST calls use gemini-2.5-flash by default; no model is trained. Keys remain on the server. Both server configuration and workspace permission must enable external AI. The browser receives review results, not provider credentials.

Netlify hosts the static client; Express and MongoDB require their own runtime/storage. VITE_API_URL connects the frontend to the API, while CLIENT_ORIGIN configures credentialed CORS. SPA redirects support deep-link refresh. Production proxy/cookie settings were preserved.

The technically difficult parts are maintaining workspace isolation, keeping approvals tied to the reviewed revision, handling partial AI results honestly, and adding approval without locking out existing users or demo identities.

## Testing evidence

Executed locally on 13 November 2026:

- npm test: 7 passing unit tests covering rule findings and preference persistence/fallback.
- npm run build: successful production Vite build.
- node server/tests/workflow.integration.js: 35 passing checks through real HTTP routes and an isolated temporary MongoDB instance. The suite does not load production environment configuration.
- Covered: new owner registration, case-insensitive workspace matching, pending login denial, admin approval, repeated approval, declined login, cross-workspace approval denial, role permissions, duplicate email, shared review access, tenant isolation, rule findings, submission/approval/revision lifecycle, invalid drafts, malformed IDs, demo protections and production cookie attributes.

The API workflow is tested end to end; this is not a claim of complete browser automation. Optional live Gemini calls, load/concurrency, all mobile/browser combinations and the newly deployed revision remain unverified.

## Known limits and unfinished work

- Deploy this revision and run the browser release checklist before submitting the public link.
- No email verification, password reset, approval notification or automatic reapplication after a declined request.
- One workspace membership per account; no multi-workspace switcher. The misleading dropdown arrow has been removed.
- Account deletion deactivates sign-in and retains review history; it is not permanent data erasure.
- Preferences are per browser, not synced across devices.
- No image/PDF/DOCX review, OCR, file upload, vector retrieval, connected publishing or SSO.
- Demo changes are global. Public demo identities must not hold confidential data.
- Lists are capped at 100 reviews; production-scale pagination and performance testing remain future work.
- Simultaneous mutations and registration races are not fully hardened with transactions/idempotency. Sequential membership decisions are guarded; this is not a blanket concurrency guarantee.
- Cross-site cookie blocking can affect separately hosted API sessions. Production CSRF hardening, monitoring, backups and retention policies need further work before confidential deployment.

## Round 3 audit and release checklist

- Completeness (25): core text workflow and requested membership flow implemented; limitations explicitly listed.
- Three improvements (20): each mapped above; local checks pass. Verify against the actual Round 2 form before submission.
- Reliability (20): unit/build/database-backed checks pass. Browser and production checks below still required.
- Usability (20): structured onboarding, shared-demo notice, clear pending result, approval actions and member refresh added. Fresh-person usability testing remains recommended.
- Documentation/roadmap (15): README setup/deployment instructions, this feature/architecture/testing record and product PDF supplied. No score is guaranteed.

Before submission: deploy both components; register a new Admin; request membership from another session; confirm pending login is denied; approve and sign in; create/revise/submit a review; decide from another account; refresh Profile and Settings; check an empty new workspace and a narrow mobile viewport; verify all four demo logins; inspect browser/API logs. Confirm public repository access and include the final working link, repository, product PDF, feature list, architecture, improvement list, test evidence and roadmap in the team leader's single submission.

## Roadmap

Next release: email verification/reset and approval notifications; invitation links; declined-request recovery; browser regression tests; consistent loading/retry states.

Production hardening: database uniqueness/migrations, transactional workflow updates, idempotency keys, CSRF protection, same-site API deployment, backups/monitoring, pagination and load tests.

Later product extensions: multiple workspace memberships, server-synced preferences, PDF/DOCX extraction and image checks, stronger retrieval, integrations and enterprise identity. These are planned, not delivered.
