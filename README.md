# CrossFlow Mobility

CrossFlow Mobility is a Next.js 16 control-room application for traffic, transit, incident intelligence, predictive routing, and city-level operational monitoring.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Supabase
- MapLibre GL
- Zustand

## Project Status

This repository has been hardened for production use with:

- stricter environment handling
- centralized cron authentication
- standalone Next.js output for containers
- CI checks for lint, type safety, build, and smoke tests
- repository-level operational documentation

## Quick Start

1. Install dependencies:

```bash
npm ci
```

2. Create local environment configuration:

```bash
cp .env.example .env.local
```

3. Start the application:

```bash
npm run dev
```

4. Run repository checks:

```bash
npm run check
```

## Available Scripts

- `npm run dev`: start the Next.js dev server
- `npm run build`: production build
- `npm run start`: run the production server
- `npm run lint`: run ESLint
- `npm run typecheck`: run TypeScript checks
- `npm run test`: run smoke tests with Node's test runner
- `npm run check`: run lint, typecheck, and tests

## Environment

Use [.env.example](./.env.example) as the canonical template.

Important variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `OPENROUTER_API_KEY`
- `PREDICTIVE_BACKEND_URL`

## Deployment

### Docker

```bash
docker build -t crossflow-mobility .
docker run --env-file .env.local -p 3000:3000 crossflow-mobility
```

### CI

See [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [API.md](./API.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [CHANGELOG.md](./CHANGELOG.md)

## Testing Strategy

This repository currently includes lightweight smoke tests for repository configuration. Recommended next additions:

- unit tests for environment parsing, traffic aggregation, and incident normalization
- integration tests for `/api/health`, `/api/aggregation/city`, and cron endpoints
- component tests for dashboard and map-side control flows

## Security Notes

- Do not commit `.env.local`
- Keep `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, and `CRON_SECRET` server-side only
- Cron endpoints now reject requests unless a valid `CRON_SECRET` is configured and provided
