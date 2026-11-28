#!/usr/bin/env bash
# Vercel's Ignored Build Step (vercel.json ignoreCommand): exit 0 skips the
# build, exit 1 builds it. Every build and every kept deploy costs (builds were
# most of the bill), so only a commit whose message says [deploy] builds:
#   - on main, it ships to production;
#   - on any other branch, it builds a preview. Without [deploy], nothing builds.
msg="${VERCEL_GIT_COMMIT_MESSAGE:-}"
if printf '%s' "$msg" | grep -qi '\[deploy\]'; then
  echo "[deploy] in the commit message: building."
  exit 1
fi
echo "No [deploy] in the commit message: skipping (${VERCEL_GIT_COMMIT_REF:-unknown branch})."
exit 0
