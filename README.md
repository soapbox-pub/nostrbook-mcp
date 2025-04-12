# Nostr MCP

_Illuminating the decentralized web, one document at a time._ 🌟 🔑 📚 ⚡️

A Model Context Protocol (MCP) implementation that provides AI assistants with access to Nostr protocol documentation.

## Overview

Nostr MCP is an extension for AI assistants that allows them to access up-to-date information about the Nostr protocol, including:

- NIPs (Nostr Implementation Possibilities) directly from the official GitHub repository
- Event kinds documentation from Nostrbook
- Tag documentation from Nostrbook
- General protocol documentation from Nostrbook

This enables AI assistants to provide accurate and current information about Nostr without relying on their training data, which may be outdated.

## Features

- **Read NIPs**: Access any NIP document directly from the official Nostr NIPs repository
- **Read Event Kinds**: Get information about specific Nostr event kinds
- **Read Tags**: Retrieve documentation on Nostr tags like `e`, `p`, etc.
- **Protocol Documentation**: Access general Nostr protocol documentation
- **NIPs Index**: View a complete list of all NIPs

## Usage

### With Goose

If you're using [Goose](https://block.github.io/goose/), you can load this MCP as an extension:

```bash
goose session --with-extension="deno run -A jsr:@nostrbook/mcp"
```

### Available Tools

The MCP provides the following tools to AI assistants:

#### read_nip

Read a specific NIP's documentation:

```typescript
{
  name: "read_nip",
  parameters: {
    nip: "01" // 2-digit hex string NIP identifier
  }
}
```

Example usage in conversation:

```
Tell me about NIP-01
```

#### read_kind

Read documentation about a specific event kind:

```typescript
{
  name: "read_kind",
  parameters: {
    kind: 1 // Kind number
  }
}
```

Example usage in conversation:

```
Explain Nostr event kind 1
```

#### read_tag

Read documentation about a specific Nostr tag:

```typescript
{
  name: "read_tag",
  parameters: {
    tag: "e" // Tag name
  }
}
```

Example usage in conversation:

```
What is the 'e' tag used for in Nostr?
```

#### read_protocol

Read general protocol documentation:

```typescript
{
  name: "read_protocol",
  parameters: {
    doc: "index" // One of: "index", "event", "filter", "client", "relay"
  }
}
```

Example usage in conversation:

```
How does the Nostr protocol work?
```

#### read_nips_index

Read the NIPs index which lists all NIPs:

```typescript
{
  name: 'read_nips_index',
  parameters: {} // No parameters required
}
```

Example usage in conversation:

```
List all NIPs in the Nostr protocol
```

## Development

```bash
# Run the MCP server
deno task start

# Run tests
deno task test

# Type check
deno task check

# Lint code
deno task lint
```

## Architecture

Nostr MCP is built with:

- [Deno](https://deno.land) - The JavaScript/TypeScript runtime
- [FastMCP](https://jsr.io/@glama/fastmcp) - Framework for building MCPs
- [Zod](https://zod.dev) - TypeScript-first schema validation
- HTTP client for fetching documentation from:
  - [Nostr NIPs GitHub repository](https://github.com/nostr-protocol/nips)
  - [Nostrbook](https://nostrbook.dev) documentation service

## Contributing

Contributions are welcome! Here's how you can contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests to ensure everything works (`deno task test`)
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

[GNU General Public License v3.0](./LICENSE)
