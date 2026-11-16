# Changelog

## 0.6.0 - 2026-11-16

### Changed

- Require Node.js 24 or newer; verify compatibility with Node 24 and 26 in CI.
- Update the MCP SDK, Nostrify, nostr-tools, Zod, TypeScript, esbuild, and the dependency lockfile.
- Migrate to the current MCP tool registration API with read-only annotations.
- Keep runtime dependencies external to the built executable and verify the installed npm package.
- Clarify that generated kinds are absent from the fetched NIPs index, not globally unused or reserved.

### Fixed

- Bound documentation requests with timeouts and return consistent MCP tool errors.
- Fall back to default relays when event relay hints fail or return no results.
- Handle event lookup cancellation, select the newest returned event deterministically, and close relay pools.
- Validate kind ranges and tag inputs, and encode tag names in documentation URLs.
- Parse abbreviated and spaced kind ranges, restrict parsing to the event-kinds section, and reject exhausted candidate ranges.

### Added

- Regression tests for all seven tools, validation failures, upstream errors, relay fallback, and cleanup.
- Integration tests for signed events over a local WebSocket relay, relay timeouts, and packed-package stdio startup, calls, and shutdown.
- Live documentation smoke checks and an optional public-event lookup check.
- Documentation source environment overrides and refreshed setup and troubleshooting instructions.
