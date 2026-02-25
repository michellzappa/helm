#!/usr/bin/env bash
# Install git hooks for this repo.
# Run once after cloning: bash scripts/install-hooks.sh

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOK="$REPO_ROOT/.git/hooks/pre-commit"

cat > "$HOOK" << 'EOF'
#!/usr/bin/env bash
# Auto-screenshot when dashboard-relevant files are staged.

DASHBOARD_RE="pages/index\.tsx|components/ActivityCharts|pages/sessions|pages/scheduled|styles/globals|lib/theme"
STAGED="$(git diff --cached --name-only)"

if echo "$STAGED" | grep -qE "$DASHBOARD_RE"; then
  echo "📸  Dashboard changed — updating screenshot…"

  # Require the app to be running
  if ! curl -sf http://localhost:1111 > /dev/null 2>&1; then
    echo "⚠   Helm isn't running at http://localhost:1111 — skipping screenshot."
    exit 0
  fi

  cd "$(git rev-parse --show-toplevel)"
  node scripts/screenshot.mjs

  if [ $? -eq 0 ]; then
    git add public/screenshot.png
    echo "✓   Screenshot staged alongside your changes."
  else
    echo "⚠   Screenshot failed — commit continuing without updated screenshot."
  fi
fi
EOF

chmod +x "$HOOK"
echo "✓ Pre-commit hook installed at $HOOK"
