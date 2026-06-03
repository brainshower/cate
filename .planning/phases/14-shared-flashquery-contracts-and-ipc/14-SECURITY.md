---
phase: 14
slug: shared-flashquery-contracts-and-ipc
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-03
updated: 2026-06-03T18:48:50Z
---

# Phase 14 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Renderer to preload/main IPC | Renderer-controlled FlashQuery document/search/write arguments cross into privileged main-process FlashQuery operations. | Workspace IDs, vault paths, include options, write payloads, search params |
| Main process to FlashQuery MCP | Main process maps validated Cate contracts into FlashQuery MCP tool requests. | Document identifiers, body/frontmatter data, search params, vault-index requests |
| Stored workspace/session metadata | FlashQuery connection metadata is persisted without bearer tokens and normalized before reuse. | FlashQuery base URL only |

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-14-01 | Tampering | Renderer/main contract surface | mitigate | Shared types, preload signatures, Electron API declarations, and IPC handler tests assert the widened contract and exact channel registration. | closed |
| T-14-02 | Tampering | FlashQuery URI parsing | mitigate | URI parser splits query from path before decoding, accepts only `body` and `frontmatter`, and tests encoded literal question marks. | closed |
| T-14-03 | Information Disclosure | FlashQuery connection/error handling | mitigate | Manager errors redact bearer tokens; vault-index failures now mark connection disconnected with redacted status; shared connection sanitization rejects credentials/query/fragment and strips `/mcp`. | closed |
| T-14-04 | Elevation of Privilege | Main IPC write/search dispatch | mitigate | Main-process validators reject malformed include options, write payloads, search modes/entity types/limits, and empty semantic search before manager dispatch. | closed |
| T-14-05 | Denial of Service / Integrity | Malformed FlashQuery MCP payloads | mitigate | Manager normalizes response payloads defensively and returns safe empty shapes for disconnected/search/index failures. | closed |

## Accepted Risks Log

No accepted risks.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-03 | 5 | 5 | 0 | Codex + gsd-code-reviewer |

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-03
