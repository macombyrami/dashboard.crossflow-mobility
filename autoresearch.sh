#!/usr/bin/env bash
set -euo pipefail

tmp_log="$(mktemp)"
cleanup() {
  rm -f "$tmp_log"
}
trap cleanup EXIT

if ! command -v node >/dev/null 2>&1; then
  echo "node is required" >&2
  exit 1
fi

if ! command -v python >/dev/null 2>&1; then
  echo "python is required" >&2
  exit 1
fi

test -f package.json
test -f next.config.ts

start_ts="$(python - <<'PY'
import time
print(time.perf_counter())
PY
)"

set +e
NODE_OPTIONS=--max-old-space-size=4096 node ./node_modules/next/dist/bin/next build 2>&1 | tee "$tmp_log"
build_status="${PIPESTATUS[0]}"
set -e

end_ts="$(python - <<'PY'
import time
print(time.perf_counter())
PY
)"

python - "$tmp_log" "$start_ts" "$end_ts" "$build_status" <<'PY'
import re
import sys

log_path, start_s, end_s, status_s = sys.argv[1:]
text = open(log_path, encoding="utf-8", errors="replace").read()

def extract(pattern: str):
    match = re.search(pattern, text)
    return float(match.group(1)) if match else -1.0

def extract_duration(pattern: str):
    match = re.search(pattern, text)
    if not match:
        return -1.0
    value = float(match.group(1))
    unit = match.group(2)
    return value / 1000.0 if unit == "ms" else value

wall = float(end_s) - float(start_s)
compile_s = extract(r"Compiled successfully in ([0-9.]+)s")
typescript_s = extract(r"Finished TypeScript in ([0-9.]+)s")
static_s = extract_duration(r"Generating static pages .* in ([0-9.]+)(ms|s)")
warning_count = len(re.findall(r'(?m)^\s*(?:\u26A0\s*)?(?:Warning:|The ")', text))
status = int(status_s)

print(f"METRIC build_wall_seconds={wall:.3f}")
print(f"METRIC next_compile_seconds={compile_s:.3f}")
print(f"METRIC next_typescript_seconds={typescript_s:.3f}")
print(f"METRIC next_static_seconds={static_s:.3f}")
print(f"METRIC build_warning_count={warning_count}")
print(f"METRIC build_exit_code={status}")
PY

exit "$build_status"
