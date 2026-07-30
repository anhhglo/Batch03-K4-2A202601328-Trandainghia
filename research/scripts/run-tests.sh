#!/usr/bin/env bash
# Chạy toàn bộ test của phần Data & Evidence.
#
#   bash research/scripts/run-tests.sh
#
# Gồm ba tầng:
#   1. Python — mining evidence + khoá số liệu trong mining-log.md
#   2. TypeScript — 3 module trong codebase/src, gồm đối chiếu chéo với bản Python
#   3. Typecheck + lint của dự án (chỉ chạy nếu đã có node_modules)
#
# Owner: Phó Hiếu Anh (Data & Evidence).

set -uo pipefail
cd "$(dirname "$0")/../.."

fail=0

echo "── 1/3 · Python: mining evidence ────────────────────────────────"
python3 research/scripts/mine_chatlog.py --samples --quiet >/dev/null || fail=1
python3 research/scripts/test_mine_chatlog.py | tail -3
[ "${PIPESTATUS[0]}" -eq 0 ] || fail=1

echo
echo "── 2/3 · TypeScript: manifest · normalizer · follow-up · fixtures"
for f in research/scripts/ts/*.test.ts; do
  echo "  $(basename "$f")"
  node --experimental-strip-types --test "$f" 2>&1 | grep -E "^# (tests|pass|fail)" | sed 's/^/    /'
  node --experimental-strip-types --test "$f" >/dev/null 2>&1 || fail=1
done

echo
echo "── 3/3 · Typecheck + lint ──────────────────────────────────────"
if [ -d codebase/node_modules ]; then
  (cd codebase && npx tsc --noEmit) && echo "  tsc    OK" || { echo "  tsc    FAIL"; fail=1; }
  (cd codebase && npm run --silent lint) && echo "  eslint OK" || { echo "  eslint FAIL"; fail=1; }
else
  echo "  bỏ qua — chưa chạy 'npm install' trong codebase/"
fi

echo
if [ "$fail" -eq 0 ]; then
  echo "TẤT CẢ ĐỀU QUA"
else
  echo "CÓ TEST HỎNG"
fi
exit "$fail"
