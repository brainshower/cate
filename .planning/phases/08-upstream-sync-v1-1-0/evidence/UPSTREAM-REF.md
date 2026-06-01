# Upstream Reference Evidence

timestamp: 2026-06-01T16:31:00Z
current branch before migration branch: main
current branch sha: 84edbef07b3b53c2313a999bb19e7ea6a6a950e3
target tag: v1.1.0
target sha: 5b6549d (5b6549d661a8427c829f60e15c4de9e71d49ac4d)
prior base: 120d58ed (120d58ed0251ce2ea1b0519cfd24474622df1ea0)

verification:
git rev-parse v1.1.0 => 5b6549d661a8427c829f60e15c4de9e71d49ac4d
git merge-base HEAD v1.1.0 => 120d58ed0251ce2ea1b0519cfd24474622df1ea0
git branch --show-current => main
git status --short =>
?? .planning/phases/08-upstream-sync-v1-1-0/evidence/

migration branch: sync/upstream-v1.1.0
migration branch sha: 84edbef07b3b53c2313a999bb19e7ea6a6a950e3
