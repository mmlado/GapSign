#!/usr/bin/env bash
# Installs the local git hooks. Run once per clone:
#   ./scripts/install-hooks.sh
#
# Hooks live in .git/hooks, which git does not version, so this script is the
# versioned source of truth for them.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOK="$ROOT/.git/hooks/pre-push"

cat > "$HOOK" <<'HOOK_EOF'
#!/usr/bin/env bash
# Gate release tags on a real minified build launching on a real phone.
#
# The release workflow triggers on v* tags, so failing here means no tag, no
# artifacts. This exists because 1.9.0 and 1.9.1 shipped an online build that
# crashed on launch from every install source while the whole test suite was
# green: everything else runs against unminified JS, so R8 damage is invisible
# to it.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

while read -r _local_ref _local_sha remote_ref _remote_sha; do
  case "$remote_ref" in
    refs/tags/v[0-9]*.[0-9]*.[0-9]*)
      echo "==> Release tag ${remote_ref#refs/tags/} — running release smoke test"
      echo "    (attach a phone with USB debugging; there is no skip)"
      node "$ROOT/scripts/smoke-release.js" full || {
        echo ""
        echo "Refusing to push the release tag: the minified build did not launch."
        exit 1
      }
      ;;
  esac
done

exit 0
HOOK_EOF

chmod +x "$HOOK"
echo "Installed $HOOK"
