import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { NPool, NRelay1, type NostrEvent, type NostrFilter } from '@nostrify/nostrify';
import { nip19 } from 'nostr-tools';
import { z } from 'zod';

import { HTTPError } from './HTTPError.ts';
import { KindGenerator, type KindRange } from './KindGenerator.ts';
import { NIPsClient } from './NIPsClient.ts';
import { NostrbookClient } from './NostrbookClient.ts';

interface NostrMcpServerOpts {
  name: string;
  version: string;
  fetch?: typeof fetch;
  nostrbookBaseUrl?: string;
  nipsUrlTemplate?: string;
}

export class NostrMcpServer extends McpServer {
  private nostrbook: NostrbookClient;
  private nips: NIPsClient;

  constructor(opts: NostrMcpServerOpts) {
    super({
      name: opts.name,
      version: opts.version,
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
      'fetch_event',
      'Fetch a Nostr event using a nip19 identifier',
      {
        identifier: z
          .string()
          .superRefine((val, ctx) => {
            let decoded: nip19.DecodedResult;
            try {
              decoded = nip19.decode(val);
            } catch {
              ctx.addIssue({
                code: 'custom',
                message:
                  `Failed to decode identifier. Invalid NIP-19 identifier: ${val}`,
              });
              return;
            }
            
            // Reject nsec for security reasons
            if (decoded.type === 'nsec') {
              ctx.addIssue({
                code: 'custom',
                message:
                  'nsec identifiers are not supported for security reasons',
              });
              return;
            }
            
            // Accept npub, nprofile, naddr, note, nevent
            if (!['npub', 'nprofile', 'naddr', 'note', 'nevent'].includes(decoded.type)) {
              ctx.addIssue({
                code: 'custom',
                message:
                  `Unsupported identifier type: ${decoded.type}. Supported types: npub, nprofile, naddr, note, nevent`,
              });
              return;
            }
          })
          .describe(
            'NIP-19 identifier (npub, nprofile, naddr, note, or nevent), e.g. npub1... or naddr1...',
          ),
      },
      async ({ identifier }) => {
        const decoded = nip19.decode(identifier);

        const defaultRelays = [
          'wss://relay.ditto.pub',
          'wss://relay.primal.net',
          'wss://relay.damus.io',
          'wss://nos.lol',
        ];

        const pool = new NPool({
          open(url) {
            return new NRelay1(url);
          },
          eventRouter() {
            return [...defaultRelays];
          },
          reqRouter(filters) {
            return new Map(
              [...defaultRelays].map((url) => [url, filters]),
            );
          },
        });

        try {
          let event: NostrEvent | undefined;

          switch (decoded.type) {
            case 'npub': {
              // For npub, fetch the user's kind 0 (profile) event
              [event] = await pool.query(
                [{
                  kinds: [0],
                  authors: [decoded.data],
                  limit: 1,
                }],
                { signal: AbortSignal.timeout(8_000) },
              );
              break;
            }

            case 'nprofile': {
              // For nprofile, fetch the user's kind 0 (profile) event
              let { relays } = decoded.data;

              if (!relays || !relays.length) {
                relays = defaultRelays;
              }

              [event] = await pool.group(relays).query(
                [{
                  kinds: [0],
                  authors: [decoded.data.pubkey],
                  limit: 1,
                }],
                { signal: AbortSignal.timeout(8_000) },
              );
              break;
            }

            case 'note': {
              // For note, fetch the specific event by ID
              [event] = await pool.query(
                [{ ids: [decoded.data] }],
                { signal: AbortSignal.timeout(8_000) },
              );
              break;
            }

            case 'nevent': {
              // For nevent, fetch the specific event by ID
              let { relays } = decoded.data;

              if (!relays || !relays.length) {
                relays = defaultRelays;
              }

              [event] = await pool.group(relays).query(
                [{
                  ids: [decoded.data.id],
                }],
                { signal: AbortSignal.timeout(8_000) },
              );
              break;
            }

            case 'naddr': {
              // For naddr, fetch by kind, pubkey, and d tag
              let { relays } = decoded.data;

              if (!relays || !relays.length) {
                relays = defaultRelays;
              }

              [event] = await pool.group(relays).query(
                [{
                  kinds: [decoded.data.kind],
                  authors: [decoded.data.pubkey],
                  '#d': [decoded.data.identifier],
                }],
                { signal: AbortSignal.timeout(8_000) },
              );
              break;
            }

            default:
              return {
                content: [{
                  type: 'text',
                  text: `Unsupported identifier type: ${decoded.type}`,
                }],
                isError: true,
              };
          }

          if (!event) {
            return {
              content: [{
                type: 'text',
                text: 'No event found for the provided identifier. Make sure it exists and is accessible.',
              }],
              isError: true,
            };
          }

          // Special handling for specific kinds
          if (event.kind === 30817) {
            // Kind 30817 is a NIP document, return just the content
            return { content: [{ type: 'text', text: event.content }] };
          }
          
          // For other kinds, return the full event JSON
          return { 
            content: [{ 
              type: 'text', 
              text: JSON.stringify(event, null, 2) 
            }] 
          };
          
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Error fetching event: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }],
            isError: true,
          };
        } finally {
          await pool.close();
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
