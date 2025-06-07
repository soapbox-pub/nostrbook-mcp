# Nostr MCP

This is an [MCP](https://modelcontextprotocol.io/) implementation that allows AI agents to access Nostr documentation.

## Tools

When enabled, agents will gain access to the following tools.

- **read_nip(nip)**: Fetches and reads a NIP in markdown from the official Nostr NIPs repository
- **read_kind(kind)**: Fetches and reads a kind doc from nostrbook.dev
- **read_tag(tag)**: Fetches and reads a tag doc from nostrbook.dev
- **read_protocol(doc)**: Fetches and reads a a protocol doc ("event", "filter", "client", "relay", etc) from nostrbook.dev
- **read_nips_index()**: Fetches and reads the NIPs README to fill in any missing blanks
- **generate_kind(range)**: Generates an unused Nostr event kind number in the specified range (regular: 1000-9999, replaceable: 10000-19999, ephemeral: 20000-29999, addressable: 30000-39999)

## Installation

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

### Architecture

Nostr MCP is built with:

- Node - The JavaScript/TypeScript runtime
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) - SDK for building MCPs
- [Zod](https://zod.dev) - TypeScript-first schema validation
- HTTP client for fetching documentation from:
  - [Nostr NIPs GitHub repository](https://github.com/nostr-protocol/nips)
  - [Nostrbook](https://nostrbook.dev) documentation service

## License

[AGPL v3.0](./LICENSE)
