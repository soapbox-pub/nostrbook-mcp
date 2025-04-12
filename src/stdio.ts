import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { NostrMcpServer } from './NostrMcpServer.ts';

const server = new NostrMcpServer();
const transport = new StdioServerTransport();

await server.connect(transport);
