# Pre-Merge Workspace Fixture Source

Generated for T-U-008 on 2026-06-01 from the pre-merge fork parent:

- Ref expression: `318214f^1`
- Resolved commit: `84edbef07b3b53c2313a999bb19e7ea6a6a950e3`
- Commit subject: `test(flashquery): mock authenticated probe handshake`

The fixture was generated in a temporary worktree at `/tmp/cate-premerge-gap3`.
The workspace JSON was produced by executing the pre-merge saveSession
`buildWorkspaceFile()` serializer body from `src/renderer/lib/session.ts` lines
114-165 at that ref, with the pre-merge `sanitizeFlashQueryConnection()` and
`toRelativePath()` helpers imported from the same worktree.

Input snapshot details:

- `workspaceId`: `workspace-premerge-generated`
- `workspaceName`: `Generated Pre-Merge FlashQuery Workspace`
- `rootPath`: `/tmp/cate-premerge-workspace`
- FlashQuery connection input included bearer auth token `premerge-secret-token`
- Panels included a `flashqueryVault` node and an editor node at
  `/tmp/cate-premerge-workspace/docs/Generated.md`

Expected serializer behavior:

- `workspace.json` keeps only sanitized FlashQuery metadata (`transport` and
  `url`) and does not persist `auth` or the bearer token.
- Absolute project file paths are written relative to the workspace root.
- The companion `session.json` fixture uses the pre-merge project session file
  shape for the same panel ids so the current load path can exercise
  workspace+session deserialization together.
