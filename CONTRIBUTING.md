# Contributing

## Development Workflow

1. Create a feature branch from `main`.
2. Copy `.env.example` to `.env.local`.
3. Run:

```bash
npm ci
npm run dev
```

4. Before opening a PR, run:

```bash
npm run check
npm run build
```

## Coding Rules

- Use TypeScript for all new source files.
- Keep UI concerns in `src/components/**`.
- Keep provider integrations and domain logic in `src/lib/**`.
- Do not hardcode secrets or fallback production credentials.
- Prefer explicit types over `any`.
- Add small, focused modules rather than growing already large route files.

## Pull Request Checklist

- Code builds locally
- Lint passes
- Typecheck passes
- New env variables are documented in `.env.example`
- New endpoints are documented in `API.md`
- Significant structural changes are reflected in `ARCHITECTURE.md`

## Testing Expectations

For non-trivial changes:

- add or update smoke tests
- add unit coverage for pure helpers
- add integration coverage for route handlers when behavior changes
