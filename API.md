# API

## Overview

The application exposes internal API routes through Next.js App Router under `src/app/api/**`.

These routes fall into five groups:

- health and monitoring
- traffic and incidents
- social intelligence
- predictive simulation
- scheduled maintenance / cron jobs

## Authentication Model

### Public or semi-public read routes

Examples:

- `GET /api/health`
- `GET /api/traffic/city`
- `GET /api/tomtom/flow`

These endpoints are intended for application consumption and generally do not require direct user auth.

### Authenticated routes

Examples:

- `GET /api/snapshots`
- auth callback and user-related flows

These routes rely on Supabase session context.

### Cron routes

Examples:

- `GET /api/cron/traffic`
- `GET /api/cron/cleanup`
- `GET /api/cron/refresh-snapshots`
- `POST /api/cron/sytadin-refresh`

These routes require `CRON_SECRET`.

Accepted headers:

- `Authorization: Bearer <CRON_SECRET>`
- `X-Cron-Secret: <CRON_SECRET>` for `/api/cron/sytadin-refresh`

## Core Endpoints

### Health

- `GET /api/health`
  - checks major dependencies and backend availability
- `GET /api/predictive/health`
  - checks the Python predictive service

### Aggregation and snapshots

- `GET /api/aggregation/city?city_id=<id>&bbox=<bbox>`
- `GET /api/aggregation/stats`
- `GET /api/snapshots?cityId=<id>&minutes=<n>`
- `POST /api/snapshots`

### Traffic providers

- `GET /api/tomtom/flow`
- `GET /api/tomtom/incidents`
- `GET /api/here/flow`
- `GET /api/here/incidents`
- `GET /api/ratp-traffic`
- `GET /api/ratp-schedules`

### Incidents and intelligence

- `GET /api/incidents/intelligence`
- `GET /api/incidents/sytadin`
- `GET /api/incidents/sytadin/geojson`
- `GET /api/social/intelligence`
- `GET /api/social/timeline`
- `GET /api/social/x-pulse`
- `POST /api/social/collect`
- `POST /api/social/analyze`

### Simulation and predictive

- `ALL /api/predictive/[...path]`
- `POST /api/simulation/mirofish`
- `POST /api/ai/consultant`
- `POST /api/ai`

## Operational Guidance

- Keep provider keys server-side whenever possible.
- Prefer route-level caching only when provider freshness allows it.
- Use dedicated service modules for new integrations instead of embedding fetch logic directly into route handlers.
- Treat cron routes as production-only operational interfaces.
