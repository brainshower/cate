---
status: resolved
trigger: "Review cross-phase audit issues for REQ-014 and REQ-019. User says REQ-014 was just fixed according to earlier findings, so the remaining REQ-014 issue is surprising."
created: 2026-06-06T14:53:27Z
updated: 2026-06-06T15:56:00Z
---

# Debug Session: REQ-014 / REQ-019 Audit Review

## Symptoms

### Expected behavior

REQ-014 should no longer appear as an unresolved cross-phase issue if the previously requested fix was applied correctly. REQ-019 should be reviewed to determine whether the audit warning is a real requirement gap, a documentation/interpretation issue, or acceptable implementation behavior.

### Actual behavior

The v1.2 milestone audit still reports REQ-014 as unsatisfied because the integration checker found registry eligibility broader than `hostEligible: true` and `status: current`. The audit also reports a REQ-019 integration warning that clipboard/reference flows are wired but not powered by the vault-index cache.

### Error messages

No runtime error. This is an audit/report discrepancy.

### Timeline

The user says REQ-014 had just been worked on and fixed according to earlier findings before this audit review, so the current audit finding may be stale, incorrectly scoped, or based on a different intended semantics.

### Reproduction

Read current `src/agent/extensions/cate-flashquery/registry.ts`, registry tests, phase 17 planning/verification docs, product requirement/test-plan wording if available, and `.planning/v1.2-MILESTONE-AUDIT.md`; compare actual code and tests to the audit claims for REQ-014 and REQ-019.

## Current Focus

- hypothesis: "The audit may be using stale or overly literal REQ-014 criteria, or the code/tests may still intentionally allow final/transitional/unannotated registry records despite the user's expected fix."
- test: "Inspect current registry implementation, tests, and traceability docs for hostEligible/status semantics; inspect REQ-019 wording and implementation dependencies."
- expecting: "Determine whether each cross-phase issue is valid, stale, or misclassified, with file/line evidence."
- next_action: "gather initial evidence"
- reasoning_checkpoint:
- tdd_checkpoint:

## Evidence

- timestamp: 2026-06-06T15:10:00Z
  source: src/agent/extensions/cate-flashquery/registry.ts
  observation: "`CURRENT_STATUSES` contains `final`, `transitional`, and `current`; `isEligible()` accepts plain records with no eligibility metadata and requires positive `hostEligible` plus one of those statuses for enriched records."
  implication: "The audit accurately described current code, but that behavior may be intentional depending on the Phase 17 contract."
- timestamp: 2026-06-06T15:11:00Z
  source: .planning/phases/17-flashquery-pi-extension-bootstrap/17-02-PLAN.md
  observation: "Plan 17.2 explicitly says to treat plain MCP `tools/list` records without eligibility metadata as already host-filtered, and to accept enriched `hostEligible: true` records with `final`, `transitional`, or legacy `current` status."
  implication: "The registry behavior matches the implementation plan and acceptance criteria."
- timestamp: 2026-06-06T15:12:00Z
  source: .planning/phases/17-flashquery-pi-extension-bootstrap/17-VERIFICATION.md
  observation: "Phase 17 verification marks REQ-014 satisfied and repeats the plain-record plus final/transitional/current enriched-status contract."
  implication: "The milestone audit's REQ-014 unsatisfied classification was caused by roadmap shorthand conflicting with the Phase 17 source contract."
- timestamp: 2026-06-06T15:13:00Z
  source: .planning/ROADMAP.md and .planning/REQUIREMENTS.md
  observation: "REQ-019 requires copy path/reference actions from vault tree rows, search document rows, and FlashQuery editor title actions; it does not require those clipboard payloads to be sourced from the vault-index cache."
  implication: "The REQ-019 cache warning is an interpretation issue, not an implementation gap; the real closure gap is the missing Phase 20 VERIFICATION.md artifact."

## Eliminated

## Resolution

- root_cause: REQ-014 was misclassified by the milestone audit because roadmap shorthand said `status: current`, while Phase 17's plan and verification define eligible current tools as plain host-filtered records plus enriched `final`/`transitional`/legacy `current` records with `hostEligible: true`; REQ-019's cache note is an interpretation warning, not a requirement gap.
- fix: Reclassified REQ-014 in the v1.2 milestone audit as satisfied, clarified the Phase 17 roadmap success criterion, and renamed the misleading registry test title; left REQ-019 partial only because Phase 20 still lacks a phase-level verification artifact.
- verification: "`npm test -- src/agent/extensions/cate-flashquery/registry.test.ts` passed with 5 tests; `rg` consistency check found REQ-014 satisfied in the audit and no remaining REQ-014 unsatisfied/mismatch wording."
- files_changed: src/agent/extensions/cate-flashquery/registry.test.ts; .planning/ROADMAP.md; .planning/v1.2-MILESTONE-AUDIT.md; .planning/debug/req-014-req-019-audit-review.md
