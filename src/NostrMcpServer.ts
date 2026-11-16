import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { nip19 } from 'nostr-tools';
import { z } from 'zod';

import { EventClient } from './EventClient.ts';
import { HTTPError } from './HTTPError.ts';
import { KindGenerator } from './KindGenerator.ts';
import { NIPsClient } from './NIPsClient.ts';
import { NostrbookClient } from './NostrbookClient.ts';

interface NostrMcpServerOpts {
  name: string;
  version: string;
  fetch?: typeof fetch;
  nostrbookBaseUrl?: string;
  nipsUrlTemplate?: string;
  events?: Pick<EventClient, 'fetch'>;
  timeoutMs?: number;
}

const textResult = (text: string) => ({ content: [{ type: 'text' as const, text }] });

/** Keep network failures as tool errors, rather than protocol failures. */
async function readText(read: () => Promise<string>, notFound?: string) {
  try {
    return textResult(await read());
  } catch (error) {
    const message = error instanceof HTTPError && error.response.status === 404 && notFound
      ? notFound
      : error instanceof Error ? error.message : 'Unknown error';
    return { ...textResult(message), isError: true };
  }
}

export class NostrMcpServer extends McpServer {
  constructor(opts: NostrMcpServerOpts) {
    super({ name: opts.name, version: opts.version });
    const nips = new NIPsClient({
      fetch: opts.fetch, timeoutMs: opts.timeoutMs,
      urlTemplate: opts.nipsUrlTemplate ?? 'https://raw.githubusercontent.com/nostr-protocol/nips/refs/heads/master/{nip}.md',
    });
    const nostrbook = new NostrbookClient({
      fetch: opts.fetch, timeoutMs: opts.timeoutMs,
      baseUrl: opts.nostrbookBaseUrl ?? 'https://nostrbook.dev',
    });
    const events = opts.events ?? new EventClient();
    const annotations = { readOnlyHint: true, openWorldHint: true };

    this.registerTool('read_nip', {
      description: 'Read a Nostr NIP document', annotations,
      inputSchema: { nip: z.string().regex(/^[0-9A-F]{2}$/, 'Use a two-character uppercase NIP identifier, e.g. 01 or C7') },
    }, ({ nip }) => readText(() => nips.readNip(nip),
      `NIP-${nip} does not exist in the official NIPs repository. Try using the \`read_nips_index\` tool to retrieve the full list of NIPs.`));

    this.registerTool('fetch_event', {
      description: 'Fetch a Nostr event using a nip19 identifier', annotations,
      inputSchema: { identifier: z.string().refine((value) => {
        try { return ['npub', 'nprofile', 'note', 'nevent', 'naddr'].includes(nip19.decode(value).type); }
        catch { return false; }
      }, 'Use a valid npub, nprofile, note, nevent, or naddr identifier; private keys are not supported') },
    }, ({ identifier }, extra) => readText(async () => {
      const event = await events.fetch(identifier, extra.signal);
      if (!event) throw new Error('No event found for the provided identifier. Make sure it exists and is accessible.');
      return event.kind === 30817 ? event.content : JSON.stringify(event, null, 2);
    }));

    this.registerTool('read_kind', {
      description: 'Read Nostr documentation about a specific event kind', annotations,
      inputSchema: { kind: z.number().int().min(0).max(65535).describe('Kind number, e.g. 1 or 42') },
    }, ({ kind }) => readText(() => nostrbook.readKind(kind),
      `No documentation found for kind ${kind}. Try using the \`read_nips_index\` tool to see if it's specified by a NIP.`));

    this.registerTool('read_tag', {
      description: 'Read Nostr documentation about a specific tag', annotations,
      inputSchema: { tag: z.string().min(1).refine((tag) => !['.', '..'].includes(tag), 'Use a tag name').describe('Tag name, e.g. p or e') },
    }, ({ tag }) => readText(() => nostrbook.readTag(tag),
      `No documentation found for the "${tag}" tag. Try using the \`read_nips_index\` tool to see if it's specified by a NIP.`));

    this.registerTool('read_protocol', {
      description: 'Read Nostr protocol basics', annotations,
      inputSchema: { doc: z.enum(['index', 'event', 'filter', 'client', 'relay']) },
    }, ({ doc }) => readText(() => nostrbook.readProtocol(doc)));

    this.registerTool('read_nips_index', {
      description: 'Read the full list of NIPs, kinds, and tags', annotations, inputSchema: {},
    }, () => readText(() => nips.readIndex()));

    this.registerTool('generate_kind', {
      description: 'Suggest a kind number not listed in the official NIPs index; this does not reserve it or guarantee global uniqueness',
      annotations,
      inputSchema: { range: z.enum(['regular', 'replaceable', 'ephemeral', 'addressable']) },
    }, ({ range }) => readText(async () => {
      const usedKinds = KindGenerator.extractUsedKinds(await nips.readIndex());
      if (!usedKinds.size) throw new Error('Could not parse event kinds from the NIPs index');
      const kind = KindGenerator.generateAvailableKind(range, usedKinds);
      const info = KindGenerator.getKindRangeInfo(range);
      return `Generated unused kind: ${kind}\n\nRange: ${info.name} (${info.min}-${info.max})\nDescription: ${info.description}\n\nThis number is not listed in the fetched official NIPs index. It may be used elsewhere and is not reserved.`;
    }));
  }
}
