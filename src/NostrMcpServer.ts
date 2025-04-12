import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { NIPsClient } from './NIPsClient.ts';
import { NostrbookClient } from './NostrbookClient.ts';

interface NostrMcpServerOpts {
  fetch?: typeof fetch;
  nostrbookBaseUrl?: string;
  nipsUrlTemplate?: string;
}

export class NostrMcpServer extends McpServer {
  private nostrbook: NostrbookClient;
  private nips: NIPsClient;

  constructor(opts: NostrMcpServerOpts = {}) {
    const {
      fetch = globalThis.fetch,
      nostrbookBaseUrl = 'https://nostrbook.dev',
      nipsUrlTemplate =
        'https://raw.githubusercontent.com/nostr-protocol/nips/refs/heads/master/{nip}.md',
    } = opts;

    super({
      name: 'nostr',
      version: '0.1.0',
    });

    this.nostrbook = new NostrbookClient({ fetch, baseUrl: nostrbookBaseUrl });
    this.nips = new NIPsClient({ fetch, urlTemplate: nipsUrlTemplate });

    this.tool(
      'read_nip',
      'Read a Nostr NIP document',
      {
        nip: z
          .string()
          .length(2)
          .regex(
            /^[0-9A-F]{2}$/,
            'NIP must be a 2-digit uppercase hex string, e.g. `01` or `C7`',
          )
          .describe('NIP to retrieve, e.g. `01` or `C7`'),
      },
      async ({ nip }) => ({
        content: [{ type: 'text', text: await this.nips.readNip(nip) }],
      }),
    );

    this.tool(
      'read_kind',
      'Read Nostr documentation about a specific event kind',
      {
        kind: z.number().describe('Kind number to retrieve, e.g. `1` or `42`'),
      },
      async ({ kind }) => ({
        content: [{ type: 'text', text: await this.nostrbook.readKind(kind) }],
      }),
    );

    this.tool(
      'read_tag',
      'Read Nostr documentation about a specific tag',
      {
        tag: z.string().describe('Tag name to retrieve, e.g. `p` or `e`'),
      },
      async ({ tag }) => ({
        content: [{ type: 'text', text: await this.nostrbook.readTag(tag) }],
      }),
    );

    this.tool(
      'read_protocol',
      'Read Nostr protocol basics',
      {
        doc: z.enum(['index', 'event', 'filter', 'client', 'relay']),
      },
      async ({ doc }) => ({
        content: [{
          type: 'text',
          text: await this.nostrbook.readProtocol(doc),
        }],
      }),
    );

    this.tool(
      'read_nips_index',
      'Read the full list of NIPs, kinds, and tags',
      {},
      async () => ({
        content: [{ type: 'text', text: await this.nips.readIndex() }],
      }),
    );
  }
}
