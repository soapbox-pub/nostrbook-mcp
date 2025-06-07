import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { NostrMcpServer } from './NostrMcpServer.ts';
import packageJson from '../package.json' with { type: 'json' };

const server = new NostrMcpServer({
  name: packageJson.name,
  version: packageJson.version,
});

const transport = new StdioServerTransport();

await server.connect(transport);
