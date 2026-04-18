# scripts — Utility scripts

Helper scripts for build, database, or deployment.

## Suggested scripts

- **`db-types.sh`** or **`db-types.js`** — Generate Supabase TypeScript types into `src/types/`.
- **`seed.sh`** — Run Supabase seed (e.g. `psql` or Supabase CLI).
- **`check-env.js`** — Validate required env vars before build or deploy.

Run from project root, e.g. `./scripts/db-types.sh` or `node scripts/check-env.js`. Document in main README if they are part of the standard workflow.
