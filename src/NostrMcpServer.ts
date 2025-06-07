import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { NRelay1 } from '@nostrify/nostrify';
import { nip19 } from 'nostr-tools';
import { z } from 'zod';

import { HTTPError } from './HTTPError.ts';
import { KindGenerator, type KindRange } from './KindGenerator.ts';
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
      version: '0.3.0',
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
      'read_custom_nip',
      'Read a Nostr community NIP document',
      {
        naddr: z
          .custom<`naddr1${string}`>()
          .superRefine((val, ctx) => {
            let decoded: nip19.DecodedResult;
            try {
              decoded = nip19.decode(val);
            } catch {
              ctx.addIssue({
                code: 'custom',
                message:
                  `Failed to decode Nostr address. Invalid NIP-19 identifier: ${val}`,
              });
              return;
            }
            if (decoded.type !== 'naddr') {
              ctx.addIssue({
                code: 'custom',
                message:
                  'Wrong Nostr identifier type. Nostr address must start with `naddr1`',
              });
              return;
            }
            if (decoded.data.kind !== 30817) {
              ctx.addIssue({
                code: 'custom',
                message:
                  `The provided Nostr address does not represent a NIP document. Expected kind 30817, got ${decoded.data.kind}`,
              });
              return;
            }
          })
          .describe(
            'Nostr address starting with `naddr1`, e.g. `naddr1qvzqqqrcvypzqprpljlvcnpnw3pejvkkhrc3y6wvmd7vjuad0fg2ud3dky66gaxaqqxku6tswvkk7m3ddehhxarjqk4nmy`',
          ),
      },
      async ({ naddr }) => {
        const { data: addr } = nip19.decode(naddr);
        const relay = new NRelay1(addr.relays?.[0] ?? 'wss://ditto.pub/relay');

        const [event] = await relay.query(
          [{
            kinds: [addr.kind],
            authors: [addr.pubkey],
            '#d': [addr.identifier],
          }],
          { signal: AbortSignal.timeout(8_000) },
        );

        if (!event) {
          return {
            content: [{
              type: 'text',
              text:
                'No event found for the provided Nostr address. Make sure it exists and is accessible.',
              isError: true,
            }],
          };
        }

        return { content: [{ type: 'text', text: event.content }] };
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

    this.tool(
      'generate_kind',
      'Generate an unused Nostr event kind number in the specified range',
      {
        range: z.enum(['regular', 'replaceable', 'ephemeral', 'addressable'])
          .describe(
            'Kind range: regular (1000-9999), replaceable (10000-19999), ephemeral (20000-29999), addressable (30000-39999)',
          ) as z.ZodType<KindRange>,
      },
      async ({ range }) => {
        try {
          const nipsIndex = await this.nips.readIndex();
          const usedKinds = KindGenerator.extractUsedKinds(nipsIndex);
          const availableKind = KindGenerator.generateAvailableKind(
            range,
            usedKinds,
          );

          const rangeInfo = KindGenerator.getKindRangeInfo(range);

          return {
            content: [{
              type: 'text',
              text:
                `Generated unused kind: ${availableKind}\n\nRange: ${rangeInfo.name} (${rangeInfo.min}-${rangeInfo.max})\nDescription: ${rangeInfo.description}\n\nThis kind number is currently not used by any official NIP.`,
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Error generating kind: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
            }],
            isError: true,
          };
        }
      },
    );
  }
}
