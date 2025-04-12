# Nostr MCP

_Illuminating the decentralized web, one document at a time._ 🌟 🔑 📚 ⚡️

A Model Context Protocol (MCP) implementation that provides access to Nostr protocol documentation using nostrbook's tooling.

## Overview

This MCP provides tools to read and search through Nostr Implementation Possibilities (NIPs), tags, kinds, and protocol documentation by integrating with [nostrbook](https://gitlab.com/soapbox-pub/nostrbook).

## Installation

```bash
# Clone the repository with submodules
git clone --recursive git@gitlab.com:soapbox-pub/nostr-mcp.git

# Or if already cloned
git submodule update --init
```

## Usage

Use with Goose:

```bash
goose session --with-extension="deno task mcp"
```

The MCP provides the following tools:

### read_nip

Read a specific NIP's documentation.

```json
{
  "name": "read_nip",
  "parameters": {
    "number": 1 // NIP number to retrieve
  }
}
```

Example:

```bash
# Get information about NIP-01
tell me about nip-01
```

### read_tag

Read documentation about a specific Nostr tag.

```json
{
  "name": "read_tag",
  "parameters": {
    "name": "e" // Tag name to retrieve
  }
}
```

Example:

```bash
# Get information about the 'e' tag
what is the e tag used for?
```

### read_kind

Read documentation about a specific event kind.

```json
{
  "name": "read_kind",
  "parameters": {
    "number": 1 // Kind number to retrieve
  }
}
```

Example:

```bash
# Get information about kind 1 events
tell me about kind 1 events
```

### read_protocol

Read general protocol documentation.

```json
{
  "name": "read_protocol",
  "parameters": {}
}
```

Example:

```bash
# Get general protocol information
how does the nostr protocol work?
```

### read_nips_index

Read the NIPs index which lists all NIPs.

```json
{
  "name": "read_nips_index",
  "parameters": {}
}
```

Example:

```bash
# Get a list of all NIPs
list all nips
```

## Development

```bash
# Run the MCP
deno task mcp

# Run tests
deno task test

# Check types
deno task check

# Run linter
deno task lint
```

## Dependencies

- [@glama/fastmcp](https://jsr.io/@glama/fastmcp) - MCP implementation
- [zod](https://www.npmjs.com/package/zod) - Runtime type checking
- [nostrbook](https://gitlab.com/soapbox-pub/nostrbook) - Source of Nostr documentation

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[GNU General Public License v3.0](./LICENSE.md)
