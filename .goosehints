# Nostr MCP Project

## Project Overview
Nostr MCP (Model Context Protocol) is an extension for AI assistants that provides up-to-date information about the Nostr protocol. It acts as a bridge between AI assistants and the Nostr protocol documentation, allowing them to access current information even if their training data is outdated.

## Key Components
- **NostrMcpServer**: Main server class that implements the MCP protocol and defines the available tools
- **NIPsClient**: Client for fetching NIPs (Nostr Implementation Possibilities) from the official GitHub repository
- **NostrbookClient**: Client for fetching documentation from Nostrbook.dev
- **stdio.ts**: Entry point for the MCP server that handles stdio communication

## Available Tools
The MCP exposes the following tools to AI assistants:

1. **read_nip**: Reads a specific NIP document
   - Parameter: `nip` (2-digit hex string)

2. **read_kind**: Reads documentation about a specific event kind
   - Parameter: `kind` (number)

3. **read_tag**: Reads documentation about a specific Nostr tag
   - Parameter: `tag` (string)

4. **read_protocol**: Reads general protocol documentation
   - Parameter: `doc` (enum: "index", "event", "filter", "client", "relay")

5. **read_nips_index**: Reads the NIPs index which lists all NIPs
   - No parameters required

## Development Workflow
- **Run tests**: `deno task test`
- **Type checking**: `deno task check`
- **Lint code**: `deno task lint`

## Dependencies
- **Deno**: The JavaScript/TypeScript runtime
- **@modelcontextprotocol/sdk**: SDK for building MCPs
- **Zod**: TypeScript-first schema validation

## External Services
- **Nostr NIPs GitHub repository**: https://github.com/nostr-protocol/nips
- **Nostrbook**: https://nostrbook.dev

## File Structure
- **src/NostrMcpServer.ts**: Main implementation of the MCP server
- **src/NIPsClient.ts**: Client for fetching NIPs documentation
- **src/NostrbookClient.ts**: Client for fetching Nostrbook documentation
- **src/HTTPError.ts**: Error handling for HTTP requests
- **src/llmstxt.ts**: Utilities for handling AI-readable text formats
- **src/stdio.ts**: Entry point for the MCP server
