---
phase: 06
slug: editor-uri-awareness-vault-badge
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-29
updated: 2026-05-29
---

# Phase 06 — Validation Strategy

> Nyquist validation coverage for editor URI-awareness, vault save routing, diff guardrails, and vault badge chrome.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx -p node@22 npm test -- src/renderer/panels/EditorPanel.test.tsx src/renderer/components/Chip.test.tsx src/renderer/components/VaultBadge.test.tsx src/renderer/docking/DockTabBar.test.tsx src/renderer/shells/PanelWindowShell.test.tsx src/main/flashquery/clientManager.test.ts` |
| **Full suite command** | `npx -p node@22 npm test` |
| **Estimated runtime** | ~18 seconds |

---

## Sampling Rate

- **After every task commit:** Run focused Phase 6 command.
- **After every plan wave:** Run focused Phase 6 command plus `npx -p node@22 npm run typecheck`.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** ~18 seconds for full suite.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | REQ-027 | T-06-01-01 | Vault URI parsing stays renderer-safe and model identity uses full URI. | renderer | `npx -p node@22 npm test -- src/renderer/panels/EditorPanel.test.tsx` | ✅ | ✅ green |
| 06-01-02 | 01 | 1 | REQ-028, REQ-041 | T-06-01-02, T-06-01-03 | Vault reads use FlashQuery IPC body only; local reads stay filesystem-only. | renderer | `npx -p node@22 npm test -- src/renderer/panels/EditorPanel.test.tsx` | ✅ | ✅ green |
| 06-02-01 | 02 | 2 | REQ-029, REQ-041, REQ-042 | T-06-02-01, T-06-02-04 | Vault writes send content only and never send frontmatter/version/conflict metadata. | renderer + main | `npx -p node@22 npm test -- src/renderer/panels/EditorPanel.test.tsx src/main/flashquery/clientManager.test.ts` | ✅ | ✅ green |
| 06-02-02 | 02 | 2 | REQ-031 | T-06-02-02, T-06-02-03 | Dirty state, save failure, and close-confirm behavior preserve user data without session-persisting vault body. | renderer | `npx -p node@22 npm test -- src/renderer/panels/EditorPanel.test.tsx` | ✅ | ✅ green |
| 06-03-01 | 03 | 3 | REQ-030 | T-06-03-01 | Vault diff requests do not enter local filesystem or Git diff IPC paths. | renderer | `npx -p node@22 npm test -- src/renderer/panels/EditorPanel.test.tsx` | ✅ | ✅ green |
| 06-03-02 | 03 | 3 | REQ-041, REQ-042 | T-06-03-02 | Diff guardrails add no frontmatter/version/conflict UI. | source grep | `grep -R "rev 42\\|version_token\\|expected_version\\|if_match\\|conflict\\|stale" src/renderer/components/VaultBadge.tsx src/renderer/docking/DockTabBar.tsx src/renderer/shells/PanelWindowShell.tsx` | ✅ | ✅ green |
| 06-04-01 | 04 | 4 | REQ-032 | T-06-04-02, T-06-04-03 | Badge reuses shared chip surface and remains inert. | renderer/source | `npx -p node@22 npm test -- src/renderer/components/Chip.test.tsx src/renderer/components/VaultBadge.test.tsx src/renderer/docking/DockTabBar.test.tsx src/renderer/shells/PanelWindowShell.test.tsx` | ✅ | ✅ green |
| 06-04-02 | 04 | 4 | REQ-033 | T-06-04-01 | Badge tooltip displays decoded vault-relative path only. | renderer | `npx -p node@22 npm test -- src/renderer/components/VaultBadge.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all Phase 6 requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Audit 2026-05-29

| Metric | Count |
|--------|-------|
| Requirements audited | 9 |
| Covered | 9 |
| Partial | 0 |
| Missing | 0 |
| Manual-only | 0 |

---

## Validation Sign-Off

- [x] All tasks have automated verification.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all MISSING references.
- [x] No watch-mode flags.
- [x] Feedback latency < 20s.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-05-29
