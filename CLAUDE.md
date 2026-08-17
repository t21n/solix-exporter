# solix-exporter

Prometheus-style metrics exporter for Anker Solix solar/battery systems. Polls the Anker Solix cloud API and exposes power data via HTTP for scraping.

## Architecture

```
app.ts          Entry point: starts the poll loop and HTTP server
fetch.ts        Core logic: login, site/device data fetching, returns device map
config.ts       Reads all configuration from environment variables
persistence.ts  Persists auth token to disk to avoid re-login on every poll
logger.ts       Logger type + consoleLogger factory (verbose-gated)
utils.ts        sleep() helper
```

The poll loop in `app.ts` calls `fetchDeviceStats()` (-> `fetchAndPublish()` in `fetch.ts`) on every interval, storing results in a `Map<deviceSn, stats>`. The HTTP handler in `restService()` reads from that map and renders Prometheus gauge lines.

## API dependency

Solix API calls are provided by the npm package **`@t21n/solix-api`** (pinned to `0.2.6`). The local sibling repo `../solix-api` contains the source (currently at a newer version).

Because the published 0.2.6 package does not ship `.d.ts` declaration files, `tsconfig.json` uses a `paths` alias to resolve types from the local source:

```json
"paths": {
  "@t21n/solix-api": ["../solix-api/src/index"]
}
```

Runtime uses the installed npm package; TypeScript type-checking uses the local source. Both have the same public API shape.

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANKER_USERNAME` | yes | — | Anker account email |
| `ANKER_PASSWORD` | yes | — | Anker account password |
| `ANKER_COUNTRY` | yes | — | Two-letter country code (e.g. `DE`) |
| `DEVICE_SN` | yes | — | Serial number of the target device |
| `HTTP_PORT` | no | `3000` | Port for the Prometheus HTTP endpoint |
| `S2M_LOGIN_STORE` | no | `auth.data` | Path to the auth token cache file |
| `S2M_POLL_INTERVAL` | no | `120` | Poll interval in seconds |
| `LOG_VERBOSE` | no | `false` | Enable verbose logging |

Create a `.env` file in the project root for local development.

## Commands

```bash
npm run dev        # run with ts-node (no build needed)
npm run build      # compile TypeScript to bin/
npm start          # run compiled output (requires build)
npm run lint       # type-check + eslint
npm run lint:fix   # auto-fix lint issues
npm run e2e        # run e2e tests (requires real credentials in env)
```

## E2E tests

Tests in `test/` hit the real Anker API. Set `ANKER_USERNAME`, `ANKER_PASSWORD`, and `ANKER_COUNTRY` before running:

```bash
export $(cat .env | xargs)
npm run e2e
```

**Do not run e2e tests in parallel.** The Anker API rate-limits concurrent logins from the same account — a second simultaneous login returns `{ data: null }` (HTTP 200, no error thrown). CI e2e runs on a single Node version (24) for this reason. If the account gets rate-limited, wait ~15–60 min before retrying.

## Auth

The login payload uses ECDH key exchange + AES-256-CBC encryption (same mechanism as the Eufy app). The auth token is persisted to `auth.data` (configurable via `S2M_LOGIN_STORE`) and reused until expiry to avoid repeated logins.

**One active login at a time.** Logging in from another device or app session invalidates all previously issued tokens. For production, use a shared/read-only Anker account rather than the primary account.

## Docker

```bash
docker run -d \
  -e ANKER_USERNAME=*** \
  -e ANKER_PASSWORD=*** \
  -e ANKER_COUNTRY=DE \
  -e DEVICE_SN=A****** \
  -p 3000:3000 \
  tools4homeautomation/solix-exporter:latest
```

The image is built and pushed to Docker Hub via CI: `:latest` on tag push, `:next` and `:<version>_rc` on merge to `develop`.

## Known bug: energyAnalysis date formatting

`energyAnalysis()` in `src/api.ts` uses `getUTCMonth()` which is 0-indexed. January produces `"2024-00-15"` instead of `"2024-01-15"`. This bug is present in both this repo and the `solix-api` package.

## Prometheus metrics

Endpoint: `GET /` (default port 3000)

| Metric | Type | Description |
|---|---|---|
| `solar_api_status` | gauge | `0` = data available, `-1` = no data |
| `solar_now_p` | gauge | Current solar input (W) |
| `solar_now_bat` | gauge | Battery state of charge (%) |
| `solar_now_bat_charge_p` | gauge | Battery charge power (W) |
| `solar_now_bat_discharge_p` | gauge | Battery discharge power (W) |
| `solar_now_grid` | gauge | Power to home/grid (W) |
