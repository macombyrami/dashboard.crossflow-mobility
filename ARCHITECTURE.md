# Architecture

## Overview

CrossFlow Mobility is organized as a Next.js monolith with clear runtime boundaries:

- `src/app`: routes, pages, layouts, API endpoints
- `src/components`: presentation and feature UI
- `src/lib`: domain logic, external integrations, shared infrastructure
- `src/store`: client-side state containers
- `supabase/migrations`: schema evolution

The application acts as a control-room frontend plus a backend-for-frontend layer for traffic, incidents, social intelligence, and predictive services.

## High-Level Structure

```text
dashboard.crossflow-mobility/
├── public/
├── src/
│   ├── app/
│   │   ├── api/
│   │   ├── dashboard/
│   │   ├── map/
│   │   ├── simulation/
│   │   ├── social/
│   │   └── transport/
│   ├── components/
│   │   ├── ai/
│   │   ├── dashboard/
│   │   ├── layout/
│   │   ├── map/
│   │   ├── simulation/
│   │   ├── social/
│   │   └── ui/
│   ├── config/
│   ├── lib/
│   │   ├── aggregation/
│   │   ├── api/
│   │   ├── cache/
│   │   ├── config/
│   │   ├── engine/
│   │   ├── geocoding/
│   │   ├── incidents/
│   │   ├── monitoring/
│   │   ├── road-matching/
│   │   ├── scrapers/
│   │   ├── security/
│   │   ├── services/
│   │   ├── supabase/
│   │   └── utils/
│   ├── store/
│   └── types/
├── supabase/
├── tests/
└── .github/workflows/
```

## Runtime Boundaries

### UI Layer

- Pages in `src/app/**`
- Reusable UI in `src/components/**`
- Zustand stores in `src/store/**`

Responsibilities:

- rendering
- user interaction
- view state
- map and dashboard composition

### BFF / API Layer

Routes in `src/app/api/**` normalize external providers and hide secrets from the browser.

Responsibilities:

- API orchestration
- auth and cron guards
- response shaping
- server-side provider access

### Domain / Service Layer

Code in `src/lib/**` contains business behavior.

Responsibilities:

- traffic aggregation
- predictive routing integration
- social intelligence normalization
- caching
- environment/config validation

## Design Choices

### Why keep a monolith

- shared domain context across map, dashboard, simulation, and APIs
- simpler deployment path for a single product team
- fewer cross-service auth and observability concerns

### Why centralize cron auth

Cron routes previously used inconsistent fallback secrets. They now use a shared validator in `src/lib/security/cron.ts` and fail closed when `CRON_SECRET` is missing.

### Why standalone output

`next.config.ts` now uses `output: 'standalone'`, which simplifies Docker packaging and reduces production image complexity.

## Recommended Next Refactors

1. Move route-specific data mapping from `src/app/api/**` into dedicated service modules under `src/lib/api/**`.
2. Split high-complexity files like `CrossFlowMap.tsx` into source/layer/controller submodules.
3. Introduce schema-based request validation for write endpoints using Zod.
4. Add dedicated server-only modules for provider credentials and external client factories.
