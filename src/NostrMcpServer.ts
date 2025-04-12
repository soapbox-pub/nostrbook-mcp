import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { HTTPError } from './HTTPError.ts';
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
    super({
      name: 'nostr',
      version: '0.2.0',
    });

    const {
      fetch = globalThis.fetch,
      nostrbookBaseUrl = 'https://nostrbook.dev',
      nipsUrlTemplate =
        'https://raw.githubusercontent.com/nostr-protocol/nips/refs/heads/master/{nip}.md',
    } = opts;

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
      async ({ nip }) => {
        try {
          const text = await this.nips.readNip(nip);
          return { content: [{ type: 'text', text }] };
        } catch (error) {
          if (error instanceof HTTPError && error.response.status === 404) {
            return {
              content: [{
                type: 'text',
                text:
                  `NIP-${nip} does not exist in the official NIPs repository. Try using the \`read_nips_index\` tool to retrieve the full list of NIPs.`,
              }],
              isError: true,
            };
          }
          throw error;
        }
      },
    );

    this.tool(
      'read_kind',
      'Read Nostr documentation about a specific event kind',
      {
        kind: z.number().describe('Kind number to retrieve, e.g. `1` or `42`'),
      },
      async ({ kind }) => {
        try {
          const text = await this.nostrbook.readKind(kind);
          return { content: [{ type: 'text', text }] };
        } catch (error) {
          if (error instanceof HTTPError && error.response.status === 404) {
            return {
              content: [{
                type: 'text',
                text:
                  `No documentation found for kind ${kind}. Try using the \`read_nips_index\` tool to see if it's specified by a NIP.`,
              }],
              isError: true,
            };
          }
          throw error;
        }
      },
    );

    this.tool(
      'read_tag',
      'Read Nostr documentation about a specific tag',
      {
        tag: z.string().describe('Tag name to retrieve, e.g. `p` or `e`'),
      },
      async ({ tag }) => {
        try {
          const text = await this.nostrbook.readTag(tag);
          return { content: [{ type: 'text', text }] };
        } catch (error) {
          if (error instanceof HTTPError && error.response.status === 404) {
            return {
              content: [{
                type: 'text',
                text:
                  `No documentation found for the "${tag}" tag. Try using the \`read_nips_index\` tool to see if it's specified by a NIP.`,
              }],
              isError: true,
            };
          }
          throw error;
        }
      },
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
