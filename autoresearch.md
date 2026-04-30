# Autoresearch: Next.js production build throughput

## Objective
Reduce production build latency for the `dashboard.crossflow-mobility` Next.js app without changing user-visible behavior. The workload is `npm run build`, which exercises Turbopack compilation, TypeScript, and static page generation across a route-heavy dashboard with large client-side map and control-room surfaces.

## Metrics
- **Primary**: `build_wall_seconds` (seconds, lower is better) - total wall-clock time for `npm run build`
- **Secondary**: `next_compile_seconds`, `next_typescript_seconds`, `next_static_seconds`, `build_warning_count`, `build_exit_code`

## How to Run
`./autoresearch.sh` - canonical benchmark contract for autoresearch runners

Windows fallback in this workspace:
`powershell -ExecutionPolicy Bypass -File ./autoresearch.ps1`

## Files in Scope
- `next.config.ts` - build configuration; likely place for workspace-root and bundler tuning
- `package.json` - build command only if necessary to remove avoidable overhead
- `src/app/dashboard/page.tsx` - dashboard entrypoint; already uses dynamic map loading and may benefit from lighter imports
- `src/components/map/CrossFlowMap.tsx` - largest client map surface and likely contributor to bundle/typecheck cost
- `src/components/mobile/dashboard/MobileDashboardView.tsx` - lightweight dashboard surface worth keeping isolated from heavier desktop code
- `src/app/**` - route-level loading boundaries or dynamic import splits if needed for build throughput

## Off Limits
- API semantics and route URLs
- Auth flow, Supabase credentials, and environment handling
- Visual redesign unrelated to build throughput
- Dependency additions unless clearly required and justified
- The legacy `crossflow-mobility-predictive-main` project

## Constraints
- `npm run build` must succeed
- No regressions in dashboard, map, login, or API route behavior
- Prefer deleting or isolating code over adding complexity
- Keep changes local to build throughput, bundle boundaries, or type-checking pressure
- Capture benchmark evidence for every change; do not keep equal-or-worse results

## What's Been Tried
- 2026-04-30 baseline: `npm run build` succeeded. Next reported `Compiled successfully in 31.9s`, `Finished TypeScript in 37.6s`, and `Generating static pages ... in 2.8s`.
- The build emitted two actionable warnings: Next inferred the workspace root from the parent lockfile, and `src/middleware.ts` uses the deprecated `middleware` convention instead of `proxy`.
- `ts_errors.log` is stale. Fresh `npx tsc --noEmit --pretty false` passed in this workspace, so optimization decisions should rely on live measurements, not that log file.
- Environment blocker: `bash` is not available on this Windows machine, so `autoresearch.ps1` is the runnable local harness while `autoresearch.sh` preserves the expected autoresearch contract.
- Kept: pinned `next.config.ts` `turbopack.root` to the repo root. Build wall time improved from `59.280s` to `56.764s`; compile improved from `21.7s` to `20.0s`; TypeScript improved from `30.1s` to `29.7s`. It also removed the parent-lockfile workspace warning.
- Kept: renamed `src/middleware.ts` to `src/proxy.ts` and exported `proxy`. Build wall time improved slightly again from `56.764s` to `56.404s`, while TypeScript improved from `29.7s` to `28.3s`. Compile time regressed slightly from `20.0s` to `21.3s`, so this change is a modest keep rather than a decisive win.
