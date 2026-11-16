# Nostr MCP

This is an [MCP](https://modelcontextprotocol.io/) implementation that allows AI agents to access Nostr documentation.

## Tools

When enabled, agents will gain access to the following tools.

- **read_nip(nip)**: Fetches and reads a NIP in markdown from the official Nostr NIPs repository
- **fetch_event(identifier)**: Fetches a Nostr event using a nip19 identifier (npub, nprofile, naddr, note, nevent). For npub/nprofile, returns the user's profile (kind 0). For naddr, returns the addressable event. Special handling for kind 30817 (NIP documents) returns just the content, while other kinds return the full event JSON.
- **search_community_nips(query?, limit?, kind?, author?)**: Discovers NostrHub community NIPs (kind 30817) on Ditto and Dreamith. Omit `query` to browse recent documents, or supply keywords for NIP-50 search. Optionally filter by documented event `kind` or author hex public key. Returns up to 100 results (default 20) with titles, author, documented kinds, previews, NostrHub links, and relay-hinted `naddr` identifiers for `fetch_event`. Results are deduplicated by author and identifier; coverage depends on the relays, and community documents are not official NIPs.
- **read_kind(kind)**: Fetches and reads a kind doc from nostrbook.dev
- **read_tag(tag)**: Fetches and reads a tag doc from nostrbook.dev
- **read_protocol(doc)**: Fetches and reads a a protocol doc ("event", "filter", "client", "relay", etc) from nostrbook.dev
- **read_nips_index()**: Fetches and reads the NIPs README to fill in any missing blanks
- **generate_kind(range)**: Suggests a kind number absent from the fetched official NIPs index (regular: 1000-9999, replaceable: 10000-19999, ephemeral: 20000-29999, addressable: 30000-39999). This is not a reservation or a guarantee of global uniqueness; the index is not exhaustive.

## Installation

Requires **Node.js 24 or newer**. The server uses stdio; stdout is reserved for MCP messages.

### VSCode

In your project, create `.vscode/mcp.json`:

```json
{
  "servers": {
    "nostr": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@nostrbook/mcp@latest"]
    }
  }
}
```

Now the MCP will be available to Copilot. For more information, see [_Use MCP servers in VS Code_](https://code.visualstudio.com/docs/copilot/chat/mcp-servers).

### Goose

To install as a [Goose](https://block.github.io/goose/) extension:

1. Run `goose configure`
2. Choose "Add Extension"
3. Choose "Command-line Extension"
4. Enter "nostr" as the name
5. Enter `npx -y @nostrbook/mcp@latest` as the command

## Development

```sh
npm ci
npm run verify
```

`verify` runs type checking, unit/tool tests, a build, local WebSocket relay tests,
and a production-install test of the packed npm artifact. The package test uses a
temporary directory and may contact npm to install dependencies. Tool requests use
local fixtures, so public documentation and relays are not required for these tests.
CI runs this suite on Node 24 and 26.

```sh
npm run dev               # run the source server over stdio
npm run build             # produce dist/mcp
npm run test:live         # check public documentation endpoints
NOSTR_SMOKE_IDENTIFIER=npub1... npm run test:live  # also check a known public event/profile
```

For a local MCP client, use `node /absolute/path/to/nostrbook-mcp/dist/mcp`
after installing dependencies and building. Restart the client after rebuilding.

### Configuration and troubleshooting

- `NOSTRBOOK_BASE_URL`: alternate documentation service (default `https://nostrbook.dev`).
- `NIPS_URL_TEMPLATE`: alternate NIP source containing `{nip}` (defaults to the official GitHub raw URL).
- HTTP documentation requests time out after 10 seconds.
- Event lookups try valid relay hints first, then the default relay set if hints fail
  or return nothing. Each attempt is bounded to 8 seconds (up to 16 seconds with fallback).
- Profile/addressable lookups choose the newest returned event; ties use the lowest event ID.
- Relay cleanup waits at most 500 ms so a missing WebSocket close event cannot block a tool result. Community discovery has an 8-second query timeout and may return partial results.
- Missing documents, network failures, and missing events return MCP tool errors.
  Check the client logs, run `npm run test:live`, and verify Node with `node --version`.
- `nsec` inputs are rejected. Event fetching only reads public events.

## Architecture

Nostr MCP is built with:

- Node - The JavaScript/TypeScript runtime
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) - SDK for building MCPs
- [Zod](https://zod.dev) - TypeScript-first schema validation
- [Nostrify](https://nostrify.dev) and nostr-tools - relay queries and NIP-19 identifiers
- HTTP client for fetching documentation from:
  - [Nostr NIPs GitHub repository](https://github.com/nostr-protocol/nips)
  - [Nostrbook](https://nostrbook.dev) documentation service

## License

[AGPL v3.0](./LICENSE)
