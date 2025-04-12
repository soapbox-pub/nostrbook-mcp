import { FastMCP } from '@glama/fastmcp';
import { z } from 'zod';

import { NIPsClient } from './NIPsClient.ts';
import { NostrbookClient } from './NostrbookClient.ts';

const server = new FastMCP({
  name: 'nostr',
  version: '0.1.0',
});

const nostrbook = new NostrbookClient({
  baseUrl: 'https://nostrbook.dev',
});

const nips = new NIPsClient({
  urlTemplate:
    'https://raw.githubusercontent.com/nostr-protocol/nips/refs/heads/master/{nip}.md',
});

server.addTool({
  name: 'read_nip',
  description: 'Read a Nostr NIP document',
  parameters: z
    .string()
    .length(2)
    .regex(
      /^[0-9A-F]{2}$/,
      'NIP must be a 2-digit uppercase hex string, e.g. `01` or `C7`',
    )
    .describe('NIP to retrieve, e.g. `01` or `C7`'),
  execute: (nip) => nips.readNip(nip),
});

server.addTool({
  name: 'read_kind',
  description: 'Read Nostr documentation about a specific event kind',
  parameters: z.number().describe('Kind number to retrieve, e.g. `1` or `42`'),
  execute: (kind) => nostrbook.readKind(kind),
});

server.addTool({
  name: 'read_tag',
  description: 'Read Nostr documentation about a specific tag',
  parameters: z.string().describe('Tag name to retrieve, e.g. `p` or `e`'),
  execute: (tag) => nostrbook.readTag(tag),
});

server.addTool({
  name: 'read_protocol',
  description: 'Read Nostr protocol basics',
  parameters: z.enum(['index', 'event', 'filter', 'client', 'relay']),
  execute: (doc) => nostrbook.readProtocol(doc),
});

server.addTool({
  name: 'read_nips_index',
  description: 'Read the full list of NIPs, kinds, and tags',
  execute: () => nips.readIndex(),
});

server.start({ transportType: 'stdio' });
