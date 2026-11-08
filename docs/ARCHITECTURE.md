# Architecture notes

```text
React / Vite
   │ HTTP requests with HTTP-only session cookie
   ▼
Express API
   ├── Authentication + role permissions
   ├── Workspace scoping + request validation
   ├── Brand rules and facts ──────────────┐
   ├── Content revisions                  │
   ├── Review workflow                    ▼
   │                                 Hybrid review service
   │                                   ├─ Deterministic checks
   │                                   └─ Optional Gemini pass
   ▼
MongoDB                           Findings + evidence + checks
   │                                      │
   └─ Revisions, review runs, approvals ◄─┘
```

## Important invariants

1. Every content revision is a new record with a SHA-256 hash. A new edit does not mutate the old text.
2. Each review run points to one revision and stores the IDs of the approved rules that were in scope at that time.
3. Each approval points to one revision hash and the source-rule IDs used in the review.
4. A creator cannot approve their own submission.
5. A missing source means the claim is unverified, not proven false.
6. An optional AI outage is visible as an incomplete check while deterministic results remain available.
7. Workspace filtering is applied in API data access. Frontend visibility is not treated as a security boundary.
8. External AI is enabled only when a server key/feature flag and the workspace admin's explicit opt-in are both present.
