# Nostr MCP Project

This Node.js 24+ TypeScript stdio server exposes eight tools for reading Nostr
documentation, fetching public events, and suggesting event kinds.

## Components

- `src/NostrMcpServer.ts`: MCP tool registration, schemas, and tool error responses.
- `src/EventClient.ts`: NIP-19 decoding, relay hint fallback, bounded queries, newest-event selection, and pool cleanup.
- `src/NIPsClient.ts`: official NIP Markdown and index fetching, with HTTP timeouts.
- `src/NostrbookClient.ts`: kind, tag, and protocol Markdown fetching, with HTTP timeouts.
- `src/KindGenerator.ts`: index table parsing and collision-avoiding kind suggestions.
- `src/stdio.ts`: stdio entry point and documentation source environment overrides.
- `scripts/build.ts`: bundles project code into `dist/mcp`; npm runtime dependencies remain external.

## Commands

- `npm ci`: install the lockfile.
- `npm run check`: type check.
- `npm test`: unit and in-memory MCP tool tests.
- `npm run test:integration`: build, packed production install/stdio test, local WebSocket relay tests.
- `npm run verify`: all of the above checks and tests.
- `npm run test:live`: public documentation smoke tests; set `NOSTR_SMOKE_IDENTIFIER` to also test a public relay lookup.
- `npm run dev`: run the source stdio server.

Tests use Node's built-in test runner. Keep public network smoke tests separate
from deterministic tool/relay tests. The packed-install test may access npm.
CI uses Node 24 and 26. There is no lint script.

## Compatibility

Keep the public tool names stable: `read_nip`, `fetch_event`, `read_kind`,
`read_tag`, `read_protocol`, `read_nips_index`, `generate_kind`, `search_community_nips`.
Kind 30817 returns content only; other fetched events return JSON text.
Kind suggestions are checked against the fetched NIPs index, not a global registry.
Never log diagnostics to stdout: it carries the MCP protocol.

See README.md for client configuration and environment variables.
