# Changelog

## Unreleased

### Added

- production-oriented repository documentation
- `.env.example`
- Docker packaging files
- GitHub Actions CI pipeline
- Prettier configuration
- smoke tests for repository configuration
- centralized cron authentication helper

### Changed

- hardened environment handling with Zod-backed parsing helpers
- removed insecure cron secret fallbacks
- enabled Next.js standalone output for production containers
- added `typecheck`, `test`, and `check` npm scripts
- cleaned `.gitignore` so repository scripts are no longer implicitly ignored
