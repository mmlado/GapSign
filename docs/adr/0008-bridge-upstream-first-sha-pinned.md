# 0008. Bridge changes go upstream first; the dependency is SHA-pinned

Date: 2026-08-12
Status: accepted

## Context

The tag-loss fix requires native changes in `react-native-keycard`
(choppu/react-native-keycard). Options: a permanent private fork, patch-package
against the installed tree, or upstream PRs staged on the existing fork
(mmlado/react-native-keycard). History shows upstream merges warranted changes
(PR #3, merged 2026-06-15) and expects cross-platform symmetry and reproducible
evidence over defensive hardening.

Two delivery hazards are documented from direct experience in this repo:

- **npm is not a channel.** The published `react-native-keycard@1.0.4`
  predates already-merged work; releases lag main indefinitely.
- **`node_modules` is not a source of truth.** `lib/` is gitignored and built
  by `prepare: bob build` at install time; the installed tree was observed
  stale relative to the lock-pinned commit. Design work against
  `node_modules` produced an invalidated plan section.

## Decision

- Bridge changes are developed on a fork branch cut from upstream `main`,
  submitted as upstream PRs (Android + iOS together, matching the
  maintainer's one recurring review ask), and consumed by Pal via a
  **commit-SHA git dependency** in `package.json`: fork SHA while the PR is
  open, repointed to the upstream SHA after merge (tree-identical, so the
  repoint is verifiable by an empty diff).
- Never pin a branch name (`npm ci` and `npm install` can resolve it
  differently), never patch-package, never trust `node_modules` contents:
  before any native-adjacent work, `rm -rf node_modules && npm ci`.

## Consequences

- Pal can ship against the fork SHA without waiting for upstream, and the
  eventual repoint is a one-line change with no code delta.
- A CI contract test (lands with the bridge PR) asserts the installed native
  sources carry the tag-loss contract, so silent drift becomes a red build.
- Upstream review turnaround (about a month on PR #3) is on the critical path
  only for deleting the fork pin, not for shipping Pal.

## Revisit

If upstream starts cutting timely npm releases with the required changes,
switch the dependency to a version range.
