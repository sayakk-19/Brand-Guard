# BrandGuard product scope

## Product promise

Every flagged issue should have three things: a specific excerpt, an explanation and the approved source behind it. A creator can improve the draft, while a human reviewer owns the final decision.

## Roles

- **Creator:** create content, run checks, apply corrections, comment and submit for review.
- **Manager:** review submissions, request changes and add comments.
- **Reviewer:** approve a revision or request changes.
- **Admin:** manage approved brand knowledge and perform reviewer actions.

The seed script creates separate sample accounts for each role. These are demonstration identities, not an invitation workflow.

## Review states

`draft → in_review → changes_requested → in_review → approved`

Review analysis is tracked separately from workflow state. A failed or incomplete AI check must not be presented as a complete all-clear.

## Source-of-truth behaviour

Approved facts and rules retain a source name, section, version, scope and optional effective/expiry dates. The current text implementation filters to approved rules that apply to the selected channel and are active at review time. Source passages are treated as data, not executable instructions. A larger document-ingestion workflow should propose extracted rules for administrator approval rather than activating extracted content automatically.

## Findings and uncertainty

- **Contradicted:** the draft conflicts with an approved fact or rule.
- **Unverified:** the system did not find sufficient approved evidence for the wording.
- **Interpretive:** tone and messaging require judgement and are best treated as recommendations, not automatic factual verdicts.

Severity and certainty are separate. A high-impact issue can have low certainty and still need human review.

## Current build versus extension points

Current build: text submission, deterministic terminology/fact/claim/messaging checks, optional Gemini tone review, source-backed findings, suggested text corrections, revisions, comments, role-aware decisions, activity and basic insights.

Planned extensions: approved document import and extraction, PDF and DOCX support, private file storage, OCR for scans, image understanding against approved assets, measurable visual/accessibility checks, MongoDB Atlas Vector Search, richer rule version impact analysis and integrations with publishing systems.
